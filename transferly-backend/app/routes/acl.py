"""
IE-02 — Endpoints CRUD pour la gestion des règles ACL
Fichier : app/routes/acl.py

Adapté au middleware de Salma :
  - g.user = {'id': ..., 'role': ..., 'email': ...}
  - ACL.fichier_id
  - Espace.admin_id
"""

from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.acl import ACL
from app.models.user import User
from app.models.fichier import Fichier
from app.models.espace import Espace
from app.models.log import Log
from datetime import datetime
from functools import wraps

# Re-export du moteur ACL central (IE-01) — permet à tous les autres
# modules de faire : from app.routes.acl import require_permission
from app.acl_engine import require_permission, check_permission, grant_owner_permissions  # noqa: F401

acl_bp = Blueprint("acl", __name__, url_prefix="/acl")


def _get_user():
    """Récupère l'utilisateur depuis g.user (middleware Salma)."""
    if not hasattr(g, 'user') or g.user is None:
        return None
    return User.query.get(g.user['id'])


def _admin_requis(f):
    """Refuse si l'utilisateur n'est pas AdminEspace ou AdminGlobal."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = _get_user()
        if user is None:
            return jsonify({"error": "Non authentifié"}), 401
        if user.role not in ("AdminEspace", "AdminGlobal"):
            return jsonify({
                "error": "Réservé aux administrateurs d'espace",
                "code": "FORBIDDEN"
            }), 403
        return f(*args, **kwargs)
    return decorated


def _gere_ce_fichier(user, fichier_id: int) -> bool:
    """Vérifie qu'un AdminEspace gère le fichier donné."""
    if user.role == "AdminGlobal":
        return True

    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return False

    # Si le fichier appartient directement à cet admin
    if fichier.user_id == user.id:
        return True

    # Si le fichier est dans un espace géré par cet admin
    if fichier.espace_id is not None:
        espace = Espace.query.filter_by(
            id=fichier.espace_id,
            admin_id=user.id
        ).first()
        return espace is not None

    return False


# ─────────────────────────────────────────────
# GET /acl/fichier/<fichier_id>
# ─────────────────────────────────────────────

@acl_bp.route("/fichier/<int:fichier_id>", methods=["GET"])
@_admin_requis
def list_acl_fichier(fichier_id):
    user = _get_user()
    if not _gere_ce_fichier(user, fichier_id):
        return jsonify({"error": "Vous ne gérez pas ce fichier"}), 403

    rules = ACL.query.filter_by(fichier_id=fichier_id).all()
    return jsonify([_acl_to_dict(r) for r in rules]), 200


# ─────────────────────────────────────────────
# GET /acl/
# ─────────────────────────────────────────────

@acl_bp.route("/", methods=["GET"])
@_admin_requis
def list_acl():
    user = _get_user()

    if user.role == "AdminGlobal":
        rules = ACL.query.all()
        return jsonify([_acl_to_dict(r) for r in rules]), 200

    espaces = Espace.query.filter_by(admin_id=user.id).all()
    espace_ids = [e.id for e in espaces]
    fichiers = Fichier.query.filter(Fichier.espace_id.in_(espace_ids)).all()
    fichier_ids = [f.id for f in fichiers]
    rules = ACL.query.filter(ACL.fichier_id.in_(fichier_ids)).all()
    return jsonify([_acl_to_dict(r) for r in rules]), 200


# ─────────────────────────────────────────────
# POST /acl/
# ─────────────────────────────────────────────

@acl_bp.route("/", methods=["POST"])
@_admin_requis
def create_acl():
    user = _get_user()
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Corps JSON manquant"}), 400

    if "user_id" not in data or "fichier_id" not in data:
        return jsonify({"error": "Champs 'user_id' et 'fichier_id' obligatoires"}), 422

    fichier_id     = data["fichier_id"]
    target_user_id = data["user_id"]

    if not _gere_ce_fichier(user, fichier_id):
        return jsonify({"error": "Vous ne gérez pas ce fichier", "code": "FORBIDDEN"}), 403

    target = User.query.get(target_user_id)
    if target is None:
        return jsonify({"error": "Utilisateur cible introuvable"}), 404

    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({"error": "Fichier introuvable"}), 404

    existing = ACL.query.filter_by(
        user_id=target_user_id, fichier_id=fichier_id
    ).first()
    if existing:
        return jsonify({
            "error": "Règle ACL déjà existante. Utilisez PUT pour modifier.",
            "acl_id": existing.id
        }), 409

    new_acl = ACL(
        user_id=target_user_id,
        fichier_id=fichier_id,
        lecture=bool(data.get("lecture", False)),
        ecriture=bool(data.get("ecriture", False)),
        upload=bool(data.get("upload", False)),
        download=bool(data.get("download", False)),
        suppression=bool(data.get("suppression", False)),
        partage=bool(data.get("partage", False))
    )
    db.session.add(new_acl)
    db.session.commit()

    _write_log(user.id, f"CREATE_ACL:fichier_{fichier_id}:user_{target_user_id}", "succes")
    return jsonify(_acl_to_dict(new_acl)), 201


# ─────────────────────────────────────────────
# PUT /acl/<acl_id>
# ─────────────────────────────────────────────

@acl_bp.route("/<int:acl_id>", methods=["PUT"])
@_admin_requis
def update_acl(acl_id):
    user = _get_user()
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Corps JSON manquant"}), 400

    acl_entry = ACL.query.get(acl_id)
    if acl_entry is None:
        return jsonify({"error": "Règle ACL introuvable"}), 404

    if not _gere_ce_fichier(user, acl_entry.fichier_id):
        return jsonify({"error": "Accès refusé", "code": "FORBIDDEN"}), 403

    permission_fields = ["lecture", "ecriture", "upload", "download", "suppression", "partage"]
    updated = []
    for field in permission_fields:
        if field in data:
            setattr(acl_entry, field, bool(data[field]))
            updated.append(field)

    if not updated:
        return jsonify({"error": "Aucun champ de permission reconnu"}), 422

    db.session.commit()
    _write_log(user.id, f"UPDATE_ACL:{acl_id}", "succes")
    return jsonify(_acl_to_dict(acl_entry)), 200


# ─────────────────────────────────────────────
# DELETE /acl/<acl_id>
# ─────────────────────────────────────────────

@acl_bp.route("/<int:acl_id>", methods=["DELETE"])
@_admin_requis
def delete_acl(acl_id):
    user = _get_user()

    acl_entry = ACL.query.get(acl_id)
    if acl_entry is None:
        return jsonify({"error": "Règle ACL introuvable"}), 404

    if not _gere_ce_fichier(user, acl_entry.fichier_id):
        return jsonify({"error": "Accès refusé", "code": "FORBIDDEN"}), 403

    fichier_id     = acl_entry.fichier_id
    target_user_id = acl_entry.user_id

    db.session.delete(acl_entry)
    db.session.commit()

    _write_log(user.id, f"DELETE_ACL:fichier_{fichier_id}:user_{target_user_id}", "succes")
    return jsonify({"message": "Accès révoqué avec succès"}), 200


# ── Helpers ───────────────────────────────────────────────────────

def _acl_to_dict(acl: ACL) -> dict:
    user    = User.query.get(acl.user_id)
    fichier = Fichier.query.get(acl.fichier_id)
    return {
        "id":           acl.id,
        "user_id":      acl.user_id,
        "user_nom":     user.nom    if user    else None,
        "user_email":   user.email  if user    else None,
        "fichier_id":   acl.fichier_id,
        "fichier_nom":  fichier.nom if fichier else None,
        "permissions": {
            "lecture":     acl.lecture,
            "ecriture":    acl.ecriture,
            "upload":      acl.upload,
            "download":    acl.download,
            "suppression": acl.suppression,
            "partage":     acl.partage,
        }
    }


def _write_log(user_id: int, action: str, statut: str):
    try:
        log = Log(
            user_id=user_id,
            action=action,
            statut=statut,
            date=datetime.utcnow()
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        pass