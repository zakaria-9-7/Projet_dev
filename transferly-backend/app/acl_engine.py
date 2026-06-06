"""
IE-01 — Moteur ACL central
Fichier : app/acl_engine.py

Adapté au middleware de Salma :
  - g.user = {'id': ..., 'role': ..., 'email': ...}
  - ACL.fichier_id (pas resource_id)
  - Log sans resource_id
"""

from functools import wraps
from flask import jsonify, g
from app.extensions import db
from app.models.acl import ACL
from app.models.log import Log
from datetime import datetime

VALID_ACTIONS = {"lecture", "ecriture", "upload", "download", "suppression", "partage"}


def _get_user():
    """
    Récupère l'utilisateur depuis g.user (middleware Salma).
    Retourne un objet User SQLAlchemy ou None.
    """
    if not hasattr(g, 'user') or g.user is None:
        return None
    from app.models.user import User
    return User.query.get(g.user['id'])


def require_permission(action: str):
    """
    Décorateur Flask vérifiant la permission `action` sur le fichier
    identifié par <fichier_id> dans l'URL.

    Usage :
        @files_bp.route("/files/<int:fichier_id>/download")
        @require_permission("download")
        def download_file(fichier_id):
            ...
    """
    if action not in VALID_ACTIONS:
        raise ValueError(f"Action inconnue : '{action}'.")

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Récupérer l'utilisateur depuis g.user
            user = _get_user()
            if user is None:
                return jsonify({"error": "Non authentifié", "code": "UNAUTHORIZED"}), 401

            # AdminGlobal passe toujours
            if user.role == "AdminGlobal":
                return f(*args, **kwargs)

            # Récupérer fichier_id depuis les paramètres de route
            fichier_id = kwargs.get("fichier_id") or kwargs.get("id")
            if fichier_id is None:
                return jsonify({"error": "Identifiant de fichier manquant"}), 400

            from app.models.fichier import Fichier
            fichier = Fichier.query.get(fichier_id)
            if fichier is None:
                return jsonify({"error": "Fichier introuvable"}), 404

            # Propriétaire a toujours tous les droits
            if fichier.user_id == user.id:
                return f(*args, **kwargs)

            # L'admin de l'espace a toujours tous les droits
            if fichier.espace_id:
                from app.models.espace import Espace
                espace = Espace.query.get(fichier.espace_id)
                if espace and espace.admin_id == user.id:
                    return f(*args, **kwargs)

            # Chercher la règle ACL
            acl_entry = ACL.query.filter_by(
                user_id=user.id,
                fichier_id=fichier_id
            ).first()

            if acl_entry is None:
                _log_refused(user.id, action, fichier_id)
                return jsonify({
                    "error": "Accès refusé",
                    "code": "FORBIDDEN",
                    "detail": f"Aucune règle ACL pour le fichier {fichier_id}"
                }), 403

            if not getattr(acl_entry, action, False):
                _log_refused(user.id, action, fichier_id)
                return jsonify({
                    "error": "Accès refusé",
                    "code": "FORBIDDEN",
                    "detail": f"Permission '{action}' non accordée"
                }), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def check_permission(user_id: int, fichier_id: int, action: str) -> bool:
    """Version programmatique sans décorateur."""
    from app.models.user import User
    from app.models.fichier import Fichier
    user = User.query.get(user_id)
    if user is None:
        return False
    if user.role == "AdminGlobal":
        return True

    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return False

    # Propriétaire
    if fichier.user_id == user_id:
        return True

    # Admin Espace
    if fichier.espace_id:
        from app.models.espace import Espace
        espace = Espace.query.get(fichier.espace_id)
        if espace and espace.admin_id == user_id:
            return True

    acl = ACL.query.filter_by(user_id=user_id, fichier_id=fichier_id).first()
    if acl is None:
        return False
    return bool(getattr(acl, action, False))


def grant_owner_permissions(user_id: int, fichier_id: int):
    """
    Accorde toutes les permissions au propriétaire d'un fichier
    nouvellement uploadé.
    """
    existing = ACL.query.filter_by(
        user_id=user_id, fichier_id=fichier_id
    ).first()

    if existing:
        for act in VALID_ACTIONS:
            setattr(existing, act, True)
    else:
        new_acl = ACL(
            user_id=user_id,
            fichier_id=fichier_id,
            lecture=True,
            ecriture=True,
            upload=True,
            download=True,
            suppression=True,
            partage=True
        )
        db.session.add(new_acl)

    db.session.commit()


def _log_refused(user_id: int, action: str, fichier_id: int):
    """Enregistre silencieusement un accès refusé."""
    try:
        log = Log(
            user_id=user_id,
            action=f"ACCES_REFUSE:{action}:fichier_{fichier_id}",
            statut="echec",
            date=datetime.utcnow()
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        pass