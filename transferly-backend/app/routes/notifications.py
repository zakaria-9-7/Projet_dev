from flask import Blueprint, g, jsonify
from app.extensions import db
from app.models.notification import Notification

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/notifications', methods=['GET'])
def list_notifications():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    notifs = Notification.query.filter_by(user_id=g.user['id']) \
        .order_by(Notification.date_creation.desc()).limit(30).all()

    return jsonify([{
        'id': n.id,
        'type': n.type,
        'message': n.message,
        'lien': n.lien,
        'lu': n.lu,
        'date_creation': n.date_creation.isoformat() if n.date_creation else None
    } for n in notifs]), 200


@notifications_bp.route('/notifications/non-lues', methods=['GET'])
def count_non_lues():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    count = Notification.query.filter_by(user_id=g.user['id'], lu=False).count()
    return jsonify({'count': count}), 200


@notifications_bp.route('/notifications/<int:notif_id>/lu', methods=['PUT'])
def marquer_lu(notif_id):
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    notif = Notification.query.get(notif_id)
    if notif is None:
        return jsonify({'error': 'Notification introuvable'}), 404
    if notif.user_id != g.user['id']:
        return jsonify({'error': 'Accès refusé'}), 403

    notif.lu = True
    db.session.commit()
    return jsonify({'message': 'Marquée comme lue'}), 200


@notifications_bp.route('/notifications/tout-lu', methods=['PUT'])
def marquer_tout_lu():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    Notification.query.filter_by(user_id=g.user['id'], lu=False).update({'lu': True})
    db.session.commit()
    return jsonify({'message': 'Toutes marquées comme lues'}), 200
