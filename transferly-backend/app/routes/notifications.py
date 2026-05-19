import queue
from flask import Blueprint, g, jsonify, Response, stream_with_context, request
from app.extensions import db
from app.models.notification import Notification
from app.services.sse_manager import register_queue, unregister_queue

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


@notifications_bp.route('/notifications/stream', methods=['GET'])
def sse_stream():
    """
    SSE endpoint — streams real-time notification events to the authenticated client.

    Authentication: JWT supplied either via the standard `Authorization: Bearer <token>`
    header (handled by middleware, g.user already set) OR via the `?token=<jwt>` query
    parameter (needed because the browser's native EventSource API cannot send custom
    headers).
    """
    import jwt as pyjwt
    import os

    # g.user is set by middleware when the Authorization header is present.
    # For EventSource connections the token arrives as a query parameter instead.
    if not hasattr(g, 'user') or g.user is None:
        token = request.args.get('token', '')
        if not token:
            return jsonify({'error': 'Token manquant'}), 401
        try:
            payload = pyjwt.decode(
                token,
                os.getenv('SECRET_KEY', 'devsecret'),
                algorithms=['HS256']
            )
            g.user = {
                'id': payload['user_id'],
                'role': payload['role'],
                'email': payload.get('email'),
            }
        except pyjwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expiré'}), 401
        except pyjwt.InvalidTokenError:
            return jsonify({'error': 'Token invalide'}), 401

    user_id = g.user['id']

    def event_stream():
        q = register_queue(user_id)
        try:
            # Send retry hint once so the browser knows the reconnect interval
            yield 'retry: 5000\n\n'
            while True:
                try:
                    event = q.get(timeout=30)
                    yield event
                except queue.Empty:
                    # Keep-alive comment to prevent proxy / browser timeout
                    yield ': keep-alive\n\n'
        finally:
            unregister_queue(user_id, q)

    return Response(
        stream_with_context(event_stream()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
        }
    )
