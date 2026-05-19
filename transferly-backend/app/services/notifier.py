from app.extensions import db
from app.models.notification import Notification
from app.services.sse_manager import push_notification

def creer_notification(user_id, type_notif, message, lien=None):
    """Crée une notification pour un utilisateur. Ne lève jamais d'exception."""
    notif = None
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
        notif = None

    if notif is not None:
        try:
            push_notification(user_id, {
                'id': notif.id,
                'type': notif.type,
                'message': notif.message,
                'lien': notif.lien,
                'lu': notif.lu,
                'date_creation': notif.date_creation.isoformat(),
            })
        except Exception as e:
            print(f'[NOTIF] Erreur SSE push: {e}')

def notifier_plusieurs(user_ids, type_notif, message, lien=None):
    """Crée la même notification pour plusieurs utilisateurs."""
    for uid in user_ids:
        creer_notification(uid, type_notif, message, lien)
