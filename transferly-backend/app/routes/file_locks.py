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


@file_locks_bp.route('/<int:fichier_id>/lock', methods=['GET'])
def get_lock(fichier_id):
    if not _check_auth():
        return jsonify({'error': 'Non authentifié'}), 401

    _cleanup_expired(fichier_id)

    lock = FileLock.query.filter_by(fichier_id=fichier_id).first()
    if not lock:
        return jsonify({'locked': False}), 200

    return jsonify({
        'locked': True,
        'lock': lock.to_dict(),
        'is_mine': lock.user_id == g.user['id'],
    }), 200


@file_locks_bp.route('/<int:fichier_id>/lock', methods=['POST'])
def acquire_lock(fichier_id):
    if not _check_auth():
        return jsonify({'error': 'Non authentifié'}), 401

    user_id = g.user['id']
    fichier = Fichier.query.get(fichier_id)
    if not fichier:
        return jsonify({'error': 'Fichier introuvable'}), 404

    if not fichier.espace_id:
        return jsonify({'error': "Le verrouillage ne s'applique qu'aux fichiers d'espaces collaboratifs"}), 400

    _cleanup_expired(fichier_id)

    existing = FileLock.query.filter_by(fichier_id=fichier_id).first()
    if existing:
        if existing.user_id == user_id:
            existing.last_activity = datetime.utcnow()
            db.session.commit()
            return jsonify({
                'locked': True,
                'lock': existing.to_dict(),
                'is_mine': True,
                'refreshed': True,
            }), 200
        else:
            return jsonify({
                'error': f'Fichier déjà verrouillé par {existing.user.nom or existing.user.email}',
                'locked_by': existing.to_dict(),
            }), 409

    body = request.get_json(silent=True) or {}
    is_manual = bool(body.get('manual', False))

    new_lock = FileLock(
        fichier_id=fichier_id,
        user_id=user_id,
        is_manual=is_manual,
        created_at=datetime.utcnow(),
        last_activity=datetime.utcnow(),
    )
    db.session.add(new_lock)
    db.session.commit()

    return jsonify({
        'locked': True,
        'lock': new_lock.to_dict(),
        'is_mine': True,
    }), 201


@file_locks_bp.route('/<int:fichier_id>/lock', methods=['DELETE'])
def release_lock(fichier_id):
    if not _check_auth():
        return jsonify({'error': 'Non authentifié'}), 401

    lock = FileLock.query.filter_by(fichier_id=fichier_id).first()
    if not lock:
        return jsonify({'message': 'Aucun verrou à libérer'}), 200

    user_id = g.user['id']
    is_admin_global = g.user.get('role') == 'AdminGlobal'

    if lock.user_id != user_id and not is_admin_global:
        return jsonify({'error': 'Vous ne pouvez libérer que vos propres verrous'}), 403

    db.session.delete(lock)
    db.session.commit()
    return jsonify({'message': 'Verrou libéré'}), 200


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
