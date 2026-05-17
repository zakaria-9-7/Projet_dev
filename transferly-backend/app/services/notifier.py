from app.extensions import db
from app.models.notification import Notification

def creer_notification(user_id, type_notif, message, lien=None):
    """Crée une notification pour un utilisateur. Ne lève jamais d'exception."""
    try:
        notif = Notification(
            user_id=user_id,
            type=type_notif,
            message=message,
            lien=lien
        )
        db.session.add(notif)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f'[NOTIF] Erreur creation notification: {e}')

def notifier_plusieurs(user_ids, type_notif, message, lien=None):
    """Crée la même notification pour plusieurs utilisateurs."""
    for uid in user_ids:
        creer_notification(uid, type_notif, message, lien)
