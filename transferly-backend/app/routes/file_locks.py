from datetime import datetime
from flask import Blueprint, jsonify, g, request
from app.extensions import db
from app.models.file_lock import FileLock
from app.models.fichier import Fichier

file_locks_bp = Blueprint('file_locks', __name__, url_prefix='/files')

TIMEOUT_MINUTES = 15


def _check_auth():
    return hasattr(g, 'user') and g.user is not None


def _cleanup_expired(fichier_id):
    lock = FileLock.query.filter_by(fichier_id=fichier_id).first()
    if lock and lock.is_expired(TIMEOUT_MINUTES):
        db.session.delete(lock)
        db.session.commit()
        return True
    return False


@file_locks_bp.route('/<int:fichier_id>/lock/heartbeat', methods=['PUT'])
def heartbeat_lock(fichier_id):
    if not _check_auth():
        return jsonify({'error': 'Non authentifié'}), 401

    lock = FileLock.query.filter_by(fichier_id=fichier_id).first()
    if not lock:
        return jsonify({'error': 'Aucun verrou actif'}), 404

    if lock.user_id != g.user['id']:
        return jsonify({'error': 'Ce verrou ne vous appartient pas'}), 403

    lock.last_activity = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Heartbeat reçu', 'last_activity': lock.last_activity.isoformat()}), 200
