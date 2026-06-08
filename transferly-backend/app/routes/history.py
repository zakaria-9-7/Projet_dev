from flask import Blueprint, g, jsonify, request
from app.extensions import db
from app.models.version import VersionFichier
from app.models.fichier import Fichier
from app.models.user import User
from app.models.espace import Espace
from app.models.membership import Membership

history_bp = Blueprint('history', __name__)


@history_bp.route('/history', methods=['GET'])
def get_history():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    user_id = g.user['id']

    try:
        limit  = min(int(request.args.get('limit',  200)), 500)
        offset = max(int(request.args.get('offset', 0)),   0)
    except (ValueError, TypeError):
        return jsonify({'error': 'Paramètres limit/offset invalides'}), 400

    scope             = request.args.get('scope', 'all')
    fichier_id_filter = request.args.get('fichier_id', type=int)

    if scope not in ('all', 'mine', 'espaces'):
        return jsonify({'error': "scope doit être 'all', 'mine' ou 'espaces'"}), 400

    # Fichiers perso
    mine_q = db.session.query(Fichier.id).filter(Fichier.user_id == user_id)

    # Fichiers des espaces dont l'utilisateur est membre
    espace_ids_membre = (
        db.session.query(Membership.espace_id)
        .filter(Membership.user_id == user_id)
    )
    espace_ids_admin = (
        db.session.query(Espace.id)
        .filter(Espace.admin_id == user_id)
    )
    espace_ids_union = espace_ids_membre.union(espace_ids_admin).subquery()
    espaces_q = db.session.query(Fichier.id).filter(Fichier.espace_id.in_(espace_ids_union))

    if scope == 'mine':
        accessible_sq = mine_q.subquery()
    elif scope == 'espaces':
        accessible_sq = espaces_q.subquery()
    else:  # 'all'
        accessible_sq = mine_q.union(espaces_q).subquery()

    # Comptage sans jointure lourde
    count_q = (
        db.session.query(db.func.count(VersionFichier.id))
        .filter(VersionFichier.fichier_id.in_(accessible_sq))
    )
    if fichier_id_filter is not None:
        count_q = count_q.filter(VersionFichier.fichier_id == fichier_id_filter)
    total = count_q.scalar() or 0

    # Données en un seul aller-retour (jointures explicites, pas de N+1)
    data_q = (
        db.session.query(VersionFichier, Fichier, User, Espace)
        .join(Fichier, VersionFichier.fichier_id == Fichier.id)
        .outerjoin(User, VersionFichier.auteur_id == User.id)
        .outerjoin(Espace, Fichier.espace_id == Espace.id)
        .filter(VersionFichier.fichier_id.in_(accessible_sq))
    )
    if fichier_id_filter is not None:
        data_q = data_q.filter(VersionFichier.fichier_id == fichier_id_filter)

    rows = (
        data_q
        .order_by(VersionFichier.date_modification.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [
        {
            'id':                v.id,
            'fichier_id':        v.fichier_id,
            'fichier_nom':       f.nom,
            'espace_id':         f.espace_id,
            'espace_nom':        e.nom if e else None,
            'numero_version':    v.numero_version,
            'date_modification': v.date_modification.isoformat() if v.date_modification else None,
            'description':       v.description,
            'auteur_id':         v.auteur_id,
            'auteur_email':      u.email if u else None,
            'is_mine':           f.user_id == user_id,
        }
        for v, f, u, e in rows
    ]

    return jsonify({
        'items':  items,
        'total':  total,
        'limit':  limit,
        'offset': offset,
    }), 200
