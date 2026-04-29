"""
Routes pour la gestion des quotas
"""

from flask import Blueprint, jsonify, g
from app.models.user import User

quota_bp = Blueprint('quota', __name__)

@quota_bp.route('/quota/me', methods=['GET'])
def get_my_quota():
    """
    Retourne le quota total et utilisé de l'utilisateur connecté.
    """
    user_data = getattr(g, 'user', None)
    if not user_data:
        return jsonify({'error': 'Non authentifié'}), 401
        
    user = User.query.get(user_data['id'])
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404
        
    return jsonify({
        'quota_total_gb': user.quota,
        'quota_utilise_gb': user.quota_utilise,
        'pourcentage_utilise': round((user.quota_utilise / user.quota) * 100, 2) if user.quota > 0 else 0
    }), 200
