from flask import Blueprint, g, jsonify
from app.extensions import db
from app.models.user import User
from app.models.fichier import Fichier

quota_bp = Blueprint('quota', __name__)

@quota_bp.route('/quota/me', methods=['GET'])
def get_my_quota():
    user_data = getattr(g, 'user', None)
    if not user_data:
        return jsonify({'error': 'Non authentifié'}), 401

    user = User.query.get(user_data['id'])
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    # Calcul en direct : somme des tailles (en Mo) de tous les fichiers de l'utilisateur
    fichiers = Fichier.query.filter_by(user_id=user.id).all()
    total_mb = sum((f.taille or 0) for f in fichiers)
    utilise_gb = total_mb / 1024.0

    user.quota_utilise = utilise_gb
    db.session.commit()

    total_gb = user.quota or 2.0
    total_mb_quota = total_gb * 1024
    pourcentage = round((total_mb / total_mb_quota) * 100, 2) if total_mb_quota > 0 else 0

    print(f'[QUOTA] user={user.email} fichiers={len(fichiers)} total_mb={total_mb} utilise_gb={utilise_gb}')

    return jsonify({
        'quota_total_gb': round(total_gb, 2),
        'quota_utilise_gb': round(utilise_gb, 4),
        'quota_total_mb': round(total_mb_quota, 2),
        'quota_utilise_mb': round(total_mb, 2),
        'pourcentage_utilise': pourcentage
    }), 200
