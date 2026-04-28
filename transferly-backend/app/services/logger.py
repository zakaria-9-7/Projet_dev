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
    details: str = None
) -> None:
    """
    Crée une entrée dans la table `logs`.

    Paramètres
    ----------
    user_id     : ID de l'utilisateur responsable de l'action
    action      : chaîne décrivant l'action (ex: 'upload', 'download',
                  'connexion', 'suppression_fichier', 'acl_refuse', ...)
    resource_id : ID du fichier / dossier / objet concerné (None si N/A)
    statut      : 'succes' (défaut) ou 'echec'
    details     : texte libre pour stocker un message d'erreur ou des
                  informations complémentaires

    Note : les erreurs sont absorbées silencieusement pour qu'un problème
    de journalisation ne bloque jamais une opération applicative.
    """
    try:
        entry = Log(
            user_id=user_id,
            action=action,
            statut=statut,
            resource_id=resource_id,
            details=details,
            date=datetime.utcnow()
        )
        db.session.add(entry)
        db.session.commit()
    except Exception:
        # On ne propage jamais une erreur de log vers l'appelant
        db.session.rollback()
