from datetime import datetime

from flask import Blueprint, g, jsonify, request
from app.extensions import db
from app.models.quota_request import QuotaRequest
from app.decorators import require_role

quota_requests_bp = Blueprint('quota_requests', __name__)


@quota_requests_bp.route('/quota/requests', methods=['POST'])
def create_quota_request():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.get_json(silent=True) or {}

    quota_demande = data.get('quota_demande')
    raison = data.get('raison')
    espace_id = data.get('espace_id')

    try:
        quota_demande = float(quota_demande)
    except (TypeError, ValueError):
        return jsonify({'error': 'quota_demande doit être un nombre valide'}), 400

    if quota_demande <= 0:
        return jsonify({'error': 'quota_demande doit être supérieur à 0'}), 400

    if espace_id is not None:
        from app.models.espace import Espace
        from app.models.membership import Membership

        espace = Espace.query.get(espace_id)
        if espace is None:
            return jsonify({'error': 'Espace introuvable'}), 404

        is_admin = (
            espace.admin_id == g.user['id']
            or Membership.query.filter_by(
                espace_id=espace_id,
                user_id=g.user['id'],
                role='admin'
            ).first() is not None
        )
        if not is_admin:
            return jsonify({'error': "Vous n'êtes pas administrateur de cet espace"}), 403

        if quota_demande <= espace.quota:
            return jsonify({
                'error': f"Le quota demandé doit être supérieur au quota actuel de l'espace ({espace.quota} Go)"
            }), 400

        existing = QuotaRequest.query.filter(
            QuotaRequest.user_id == g.user['id'],
            QuotaRequest.espace_id == espace_id,
            QuotaRequest.statut == 'pending'
        ).first()
        if existing:
            return jsonify({'error': 'Une demande en attente existe déjà pour cet espace'}), 409

    else:
        from app.models.user import User

        user = User.query.get(g.user['id'])

        if quota_demande <= user.quota:
            return jsonify({
                'error': f'Le quota demandé doit être supérieur à votre quota actuel ({user.quota} Go)'
            }), 400

        existing = QuotaRequest.query.filter(
            QuotaRequest.user_id == g.user['id'],
            QuotaRequest.espace_id.is_(None),
            QuotaRequest.statut == 'pending'
        ).first()
        if existing:
            return jsonify({'error': 'Une demande personnelle en attente existe déjà'}), 409

    new_request = QuotaRequest(
        user_id=g.user['id'],
        espace_id=espace_id,
        quota_demande=quota_demande,
        raison=raison,
        statut='pending'
    )
    db.session.add(new_request)
    db.session.commit()

    from app.services.notifier import notifier_plusieurs
    from app.models.user import User as _User
    admin_ids = [u.id for u in _User.query.filter_by(role='AdminGlobal').all()]
    notifier_plusieurs(
        admin_ids,
        'quota',
        f"Nouvelle demande de quota de {g.user['email']}",
        lien='/admin-quota-requests',
    )

    return jsonify({
        'id': new_request.id,
        'user_id': new_request.user_id,
        'espace_id': new_request.espace_id,
        'quota_demande': new_request.quota_demande,
        'raison': new_request.raison,
        'statut': new_request.statut,
        'created_at': new_request.created_at.isoformat() if new_request.created_at else None,
        'traite_at': None,
        'reponse_admin': None
    }), 201


@quota_requests_bp.route('/quota/requests/mine', methods=['GET'])
def get_my_requests():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    mes_demandes = QuotaRequest.query.filter_by(user_id=g.user['id']) \
        .order_by(QuotaRequest.created_at.desc()).all()

    result = []
    for r in mes_demandes:
        espace_nom = r.espace.nom if r.espace_id and r.espace else None
        result.append({
            'id': r.id,
            'espace_id': r.espace_id,
            'espace_nom': espace_nom,
            'quota_demande': r.quota_demande,
            'raison': r.raison,
            'statut': r.statut,
            'created_at': r.created_at.isoformat() if r.created_at else None,
            'traite_at': r.traite_at.isoformat() if r.traite_at else None,
            'reponse_admin': r.reponse_admin
        })

    return jsonify(result), 200


@quota_requests_bp.route('/quota/requests/<int:request_id>', methods=['DELETE'])
def cancel_quota_request(request_id):
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    quota_request = QuotaRequest.query.get(request_id)
    if quota_request is None:
        return jsonify({'error': 'Demande introuvable'}), 404

    if quota_request.user_id != g.user['id']:
        return jsonify({'error': 'Accès refusé'}), 403

    if quota_request.statut != 'pending':
        return jsonify({'error': 'Demande déjà traitée'}), 400

    db.session.delete(quota_request)
    db.session.commit()
    return '', 204


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_for_admin(r):
    from app.models.user import User

    demandeur = User.query.get(r.user_id)
    espace_nom = r.espace.nom if r.espace_id and r.espace else None

    if r.espace_id and r.espace:
        quota_actuel = r.espace.quota
    elif demandeur:
        quota_actuel = demandeur.quota
    else:
        quota_actuel = None

    traite_par_email = r.admin.email if r.traite_par and r.admin else None

    return {
        'id': r.id,
        'user_id': r.user_id,
        'user_email': demandeur.email if demandeur else None,
        'user_nom': demandeur.nom if demandeur else None,
        'espace_id': r.espace_id,
        'espace_nom': espace_nom,
        'quota_demande': r.quota_demande,
        'quota_actuel': quota_actuel,
        'raison': r.raison,
        'statut': r.statut,
        'created_at': r.created_at.isoformat() if r.created_at else None,
        'traite_at': r.traite_at.isoformat() if r.traite_at else None,
        'reponse_admin': r.reponse_admin,
        'traite_par_email': traite_par_email,
    }


# ── Routes admin global ───────────────────────────────────────────────────────

@quota_requests_bp.route('/admin/quota-requests', methods=['GET'])
@require_role('AdminGlobal')
def admin_list_quota_requests():
    statut = request.args.get('statut', 'pending')
    demandes = QuotaRequest.query.filter_by(statut=statut) \
        .order_by(QuotaRequest.created_at.desc()).all()
    return jsonify([_serialize_for_admin(r) for r in demandes]), 200


@quota_requests_bp.route('/admin/quota-requests/<int:request_id>/approve', methods=['POST'])
@require_role('AdminGlobal')
def admin_approve_quota_request(request_id):
    quota_request = QuotaRequest.query.get(request_id)
    if quota_request is None:
        return jsonify({'error': 'Demande introuvable'}), 404
    if quota_request.statut != 'pending':
        return jsonify({'error': 'Demande déjà traitée'}), 400

    data = request.get_json(silent=True) or {}
    commentaire = data.get('commentaire')

    quota_accorde = data.get('quota_accorde')
    if quota_accorde is not None:
        try:
            quota_accorde = float(quota_accorde)
        except (TypeError, ValueError):
            return jsonify({'error': 'quota_accorde doit être un nombre valide'}), 400
        if quota_accorde <= 0:
            return jsonify({'error': 'quota_accorde doit être supérieur à 0'}), 400
    else:
        quota_accorde = quota_request.quota_demande

    if quota_request.espace_id is None:
        from app.models.user import User
        user = User.query.get(quota_request.user_id)
        if user is None:
            return jsonify({'error': 'Utilisateur introuvable'}), 404
        user.quota = quota_accorde
    else:
        from app.models.espace import Espace
        espace = Espace.query.get(quota_request.espace_id)
        if espace is None:
            return jsonify({'error': 'Espace introuvable'}), 404
        espace.quota = quota_accorde

    quota_request.statut = 'approved'
    quota_request.traite_par = g.user['id']
    quota_request.traite_at = datetime.utcnow()
    quota_request.reponse_admin = commentaire

    db.session.commit()

    from app.services.notifier import creer_notification
    creer_notification(
        quota_request.user_id,
        'quota',
        f"Votre demande d'augmentation de quota a été approuvée ({quota_accorde} Go accordés)",
        lien='/settings',
    )

    return jsonify(_serialize_for_admin(quota_request)), 200


@quota_requests_bp.route('/admin/quota-requests/<int:request_id>/reject', methods=['POST'])
@require_role('AdminGlobal')
def admin_reject_quota_request(request_id):
    quota_request = QuotaRequest.query.get(request_id)
    if quota_request is None:
        return jsonify({'error': 'Demande introuvable'}), 404
    if quota_request.statut != 'pending':
        return jsonify({'error': 'Demande déjà traitée'}), 400

    data = request.get_json(silent=True) or {}
    commentaire = (data.get('commentaire') or '').strip()
    if not commentaire:
        return jsonify({'error': 'Un commentaire est obligatoire pour rejeter une demande'}), 400

    quota_request.statut = 'rejected'
    quota_request.traite_par = g.user['id']
    quota_request.traite_at = datetime.utcnow()
    quota_request.reponse_admin = commentaire

    db.session.commit()

    from app.services.notifier import creer_notification
    creer_notification(
        quota_request.user_id,
        'quota',
        "Votre demande d'augmentation de quota a été rejetée",
        lien='/settings',
    )

    return jsonify(_serialize_for_admin(quota_request)), 200
