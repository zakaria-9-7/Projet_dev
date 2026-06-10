"""
ZT-01 — Module journalisation
Fichier : app/services/logger.py

Fournit log_action() — à appeler après chaque opération sensible :
connexion, upload, download, suppression, partage, tentative refusée, etc.

Signature :
    log_action(user_id, action, resource_id=None, statut='succes', details=None)

Adaptée au modèle Log :
    action      — type de l'action (str)
    statut      — 'succes' | 'echec'
    resource_id — ID du fichier / dossier concerné (optionnel)
    details     — texte libre complémentaire (optionnel)
    user_id     — ID de l'utilisateur qui agit
"""

from app.extensions import db
from app.models.log import Log
from datetime import datetime


def log_action(
    user_id: int,
    action: str,
    resource_id: int = None,
    statut: str = "succes",
    details: str = None,
    user_email: str = None
) -> None:
    """
    Crée une entrée dans la table `logs`.
    """
    try:
        if not user_email and user_id:
            from app.models.user import User
            u = User.query.get(user_id)
            if u:
                user_email = u.email

        entry = Log(
            user_id=user_id,
            user_email=user_email,
            action=action,
            statut=statut,
            resource_id=resource_id,
            details=details,
            date=datetime.utcnow()
        )
        db.session.add(entry)
        db.session.commit()
    except Exception:
        db.session.rollback()
