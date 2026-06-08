import os
from flask import Blueprint, request, jsonify, g
from app.decorators import require_role
from app.models.espace import Espace
from app.models.user import User
from app.extensions import db

admin_espace_bp = Blueprint('admin_espace', __name__)

# ── Gestion des espaces (endpoints utilisateur) ─────────────────

@admin_espace_bp.route('/espaces', methods=['POST'])
def create_my_espace():
    from flask import g, jsonify, request
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    data = request.get_json(silent=True) or {}
    nom = (data.get('nom') or '').strip()
    if not nom:
        return jsonify({'error': "Nom de l'espace requis"}), 400
    if Espace.query.filter_by(nom=nom).first():
        return jsonify({'error': 'Nom déjà utilisé'}), 409
    user = User.query.get(g.user['id'])
    if user is None:
        return jsonify({'error': 'Utilisateur introuvable'}), 404
    espace = Espace(nom=nom, admin_id=user.id)
    db.session.add(espace)
    if user.role == 'Utilisateur':
        user.role = 'AdminEspace'
    db.session.commit()
    from app.services.logger import log_action
    log_action(
        user_id=user.id,
        action='create_espace',
        resource_id=espace.id,
        statut='succes',
        details=f'Espace "{espace.nom}" créé, rôle promu : {user.role}'
    )
    return jsonify({
        'id': espace.id,
        'nom': espace.nom,
        'admin_id': espace.admin_id,
        'role_updated': user.role
    }), 201

@admin_espace_bp.route('/espaces/mine', methods=['GET'])
def list_my_espaces():
    from flask import g, jsonify
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    espaces = Espace.query.filter_by(admin_id=g.user['id']).all()
    return jsonify([{
        'id': e.id,
        'nom': e.nom,
        'admin_id': e.admin_id,
        'quota_used': e.quota
    } for e in espaces]), 200

@admin_espace_bp.route('/espaces/<int:espace_id>/members', methods=['GET'])
def list_members(espace_id):
    from flask import g, jsonify
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404
    if espace.admin_id != g.user['id'] and g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès refusé'}), 403
    from app.models.fichier import Fichier
    member_ids = set([espace.admin_id])
    for f in Fichier.query.filter_by(espace_id=espace_id).all():
        member_ids.add(f.user_id)
    members = User.query.filter(User.id.in_(member_ids)).all()
    return jsonify([{
        'id': u.id,
        'nom': u.nom,
        'email': u.email,
        'role': u.role,
        'is_admin': u.id == espace.admin_id,
    } for u in members]), 200

@admin_espace_bp.route('/espaces/<int:espace_id>/invite', methods=['POST'])
def invite_to_espace(espace_id):
    from flask import g, jsonify, request
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404
    if espace.admin_id != g.user['id'] and g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès refusé'}), 403
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email requis'}), 400
    user = User.query.filter_by(email=email).first()
    if user is None:
        return jsonify({'error': 'Utilisateur introuvable'}), 404
    return jsonify({
        'message': f'Invitation envoyée à {user.nom}',
        'user_id': user.id
    }), 200

# ── Gestion des espaces (AdminGlobal) ────────────────────────────

@admin_espace_bp.route('/admin/espaces', methods=['POST'])
@require_role('AdminGlobal')
def create_espace():
  data = request.get_json()
  space_name = data['name']
  admin = User.query.get(data['user_id'])
  if Espace.query.filter_by(nom=space_name).first() is None :
    if admin is not None and admin.role == 'AdminEspace' :
      space = Espace(nom=space_name, admin_id=admin.id)
      db.session.add(space)
      db.session.commit()
      return jsonify({'message' : 'Espace créé avec succès'}), 201
    else :
      return jsonify({'error' : 'Administrateur inexistant ou non non habilité à créer un espace'}), 400
  else :
    return jsonify({'error' : 'Nom d\'espace déjà utilisé'}), 409

@admin_espace_bp.route('/admin/espaces', methods=['GET'])
@require_role('AdminGlobal')
def get_espaces() :
  spaces = Espace.query.all()
  result = []
  for elt in spaces :
    admin = User.query.get(elt.admin_id)
    result.append({
      'id' : elt.id,
      'name' : elt.nom,
      'adminEspace' : {'nom': admin.nom, 'email': admin.email} if admin is not None else None,
      'used_quota' : elt.quota
    })
  return jsonify({'spaces' : result})
    
@admin_espace_bp.route('/admin/espaces/<int:espace_id>', methods=['PUT'])
@require_role('AdminGlobal')
def update_espace(espace_id):
  space = Espace.query.get(espace_id)
  if space is None :
    return jsonify({'error' : 'espace inexistant'}), 404
  else :
    data = request.get_json()
    name = data.get('nom')
    admin_id = data.get('admin_id')
    admin = User.query.get(admin_id) if admin_id is not None else None
    if name is not None :
      if Espace.query.filter_by(nom=name).first() is None :
        space.nom = name
      else :
        return jsonify({'error' : 'Nom déjà utilisé'}), 409
    if admin is not None :
      if admin.role == 'AdminEspace' :
        space.admin_id = admin.id
      else :
        return jsonify({'error' : 'utilisateur inexistant ou non non habilité à devenir administarteur Espace'}), 404
    db.session.commit()
    return jsonify({'message' : 'Espace modifié avec succès'}), 200

@admin_espace_bp.route('/admin/espaces/<int:espace_id>', methods=['DELETE'])
@require_role('AdminGlobal')
def delete_espace(espace_id):
  space = Espace.query.get(espace_id)
  if space is None :
    return jsonify({'error' : 'espace inexistant'}), 404
  else :
    db.session.delete(space)
    db.session.commit()
    return  jsonify({'message' : 'Espace supprimé avec succès'}), 200

# ── Endpoint dédié AdminEspace : son propre espace ──────────────

@admin_espace_bp.route('/admin/espaces/mine', methods=['GET'])
def get_my_espace():
    from flask import g, jsonify
    from app.models.membership import Membership
    from app.models.fichier import Fichier
    from app.models.acl import ACL
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] not in ('AdminEspace', 'AdminGlobal'):
        return jsonify({'error': 'Accès refusé'}), 403
    my_id = g.user['id']
    espaces = Espace.query.filter_by(admin_id=my_id).all()
    result = []
    for e in espaces:
        admin = User.query.get(e.admin_id)
        nb_membres = Membership.query.filter_by(espace_id=e.id).count() + 1
        nb_fichiers = Fichier.query.filter_by(espace_id=e.id).count()
        nb_acls = ACL.query.filter(ACL.fichier_id.in_(
            [f.id for f in Fichier.query.filter_by(espace_id=e.id).all()]
        )).count()
        result.append({
            'id': e.id,
            'nom': e.nom,
            'admin_id': e.admin_id,
            'admin_nom': admin.nom if admin else None,
            'admin_email': admin.email if admin else None,
            'quota_used': e.quota,
            'nb_membres': nb_membres,
            'nb_fichiers': nb_fichiers,
            'nb_acls': nb_acls,
        })
    return jsonify({'spaces': result}), 200

# ── Liste utilisateurs pour ACL (AdminEspace + AdminGlobal) ─────

@admin_espace_bp.route('/users/list', methods=['GET'])
def list_users_for_acl():
    from flask import g, jsonify
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] not in ('AdminEspace', 'AdminGlobal'):
        return jsonify({'error': 'Accès refusé'}), 403
    users = User.query.filter(User.id != g.user['id']).all()
    return jsonify([{'id': u.id, 'nom': u.nom, 'email': u.email, 'role': u.role} for u in users]), 200


@admin_espace_bp.route('/users/search', methods=['GET'])
def search_users():
    from flask import g, jsonify, request
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    q = (request.args.get('q') or '').strip()
    if len(q) < 2:
        return jsonify([]), 200
    results = User.query.filter(
        (User.nom.ilike(f'%{q}%')) | (User.email.ilike(f'%{q}%')),
        User.id != g.user['id']
    ).limit(10).all()
    return jsonify([{'id': u.id, 'nom': u.nom, 'email': u.email} for u in results]), 200

# ─── Créer une invitation par email ───────────────────────────────
@admin_espace_bp.route('/espaces/<int:espace_id>/invitations', methods=['POST'])
def create_invitation(espace_id):
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    if espace.admin_id != g.user['id'] and g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Vous ne gérez pas cet espace'}), 403

    from app.models.invitation import Invitation
    from app.models.membership import Membership

    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower() or None

    if email:
        target = User.query.filter_by(email=email).first()
        if target:
            existing = Membership.query.filter_by(user_id=target.id, espace_id=espace_id).first()
            if existing:
                return jsonify({'error': 'Utilisateur déjà membre'}), 409

    invitation = Invitation(
        espace_id=espace_id,
        email=email,
        cree_par=g.user['id'],
    )
    db.session.add(invitation)
    db.session.commit()

    if email:
        from app.services.notifier import creer_notification
        target_invit = User.query.filter_by(email=email).first()
        if target_invit:
            creer_notification(
                target_invit.id,
                'invitation',
                f'Vous avez été invité à rejoindre l espace "{espace.nom}"',
                lien=f'/join/{invitation.token}'
            )

    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    invite_url = f"{frontend_url}/join/{invitation.token}"

    if email:
        from app.services.mailer import send_invitation_email
        send_invitation_email(email, invite_url, espace.nom)

    from app.services.logger import log_action
    log_action(
        user_id=g.user['id'],
        action='create_invitation',
        resource_id=espace_id,
        statut='succes',
        details=f'Invitation pour {email or "lien public"} -> {invitation.token[:8]}...',
    )

    return jsonify({
        'id': invitation.id,
        'token': invitation.token,
        'invite_url': invite_url,
        'email': invitation.email,
        'date_expiration': invitation.date_expiration.isoformat(),
        'message': f'Invitation créée pour {email}' if email else 'Lien d invitation créé',
    }), 201


# ─── Lister les invitations d'un espace ───────────────────────────
@admin_espace_bp.route('/espaces/<int:espace_id>/invitations', methods=['GET'])
def list_invitations(espace_id):
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    if espace.admin_id != g.user['id'] and g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès refusé'}), 403

    from app.models.invitation import Invitation
    invitations = Invitation.query.filter_by(espace_id=espace_id).order_by(Invitation.date_creation.desc()).all()
    return jsonify([{
        'id': i.id,
        'token': i.token,
        'email': i.email,
        'utilise': i.utilise,
        'date_creation': i.date_creation.isoformat(),
        'date_expiration': i.date_expiration.isoformat(),
    } for i in invitations]), 200


# ─── Accepter une invitation (rejoindre un espace) ────────────────
@admin_espace_bp.route('/invitations/<token>/accept', methods=['POST'])
def accept_invitation(token):
    from flask import g, jsonify
    from app.models.invitation import Invitation
    from app.models.membership import Membership
    from app.models.espace import Espace
    from datetime import datetime

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    invitation = Invitation.query.filter_by(token=token).first()
    if invitation is None:
        return jsonify({'error': 'Invitation introuvable'}), 404

    espace = Espace.query.get(invitation.espace_id)
    if espace is None:
        return jsonify({'error': 'Cet espace n existe plus'}), 410

    if invitation.date_expiration < datetime.utcnow():
        return jsonify({'error': 'Invitation expirée'}), 410

    if invitation.email:
        user_email = (g.user.get('email') or '').lower()
        if user_email != invitation.email.lower():
            return jsonify({'error': 'Cette invitation est destinée à un autre utilisateur'}), 403

    user_id = g.user['id']

    # CAS 1 : l'utilisateur est déjà l'admin de l'espace
    if espace.admin_id == user_id:
        return jsonify({
            'message': 'Vous êtes l administrateur de cet espace',
            'espace_id': espace.id
        }), 200

    # CAS 2 : l'utilisateur est déjà membre -> ne pas réinsérer
    existing = Membership.query.filter_by(user_id=user_id, espace_id=invitation.espace_id).first()
    if existing:
        if invitation.email and not invitation.utilise:
            invitation.utilise = True
            db.session.commit()
        return jsonify({
            'message': 'Vous êtes déjà membre de cet espace',
            'espace_id': invitation.espace_id,
            'already_member': True
        }), 200

    # CAS 3 : invitation nominative déjà utilisée
    if invitation.email and invitation.utilise:
        return jsonify({'error': 'Cette invitation a déjà été utilisée'}), 410

    # CAS 4 : nouvel ajout -> créer le membership
    membership = Membership(
        user_id=user_id,
        espace_id=invitation.espace_id,
        role='membre'
    )
    db.session.add(membership)

    if invitation.email:
        invitation.utilise = True

    db.session.commit()

    from app.services.logger import log_action
    log_action(
        user_id=user_id,
        action='join_espace',
        resource_id=invitation.espace_id,
        statut='succes'
    )

    from app.services.notifier import creer_notification
    nouveau = User.query.get(user_id)
    if espace and nouveau:
        creer_notification(
            espace.admin_id,
            'join_espace',
            f'{nouveau.nom} a rejoint votre espace "{espace.nom}"',
            lien=f'/espace/{espace.id}'
        )

    return jsonify({
        'message': 'Bienvenue dans l espace !',
        'espace_id': invitation.espace_id
    }), 200


# ─── Lister tous mes espaces (admin OU membre) ────────────────────
@admin_espace_bp.route('/espaces/all-mine', methods=['GET'])
def list_all_my_espaces():
    from app.models.membership import Membership
    from app.models.fichier import Fichier

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    user_id = g.user['id']

    espaces_admin = Espace.query.filter_by(admin_id=user_id).all()

    memberships = Membership.query.filter_by(user_id=user_id).all()
    espaces_membre_ids = [m.espace_id for m in memberships]
    espaces_membre = Espace.query.filter(Espace.id.in_(espaces_membre_ids)).all() if espaces_membre_ids else []

    def serialize(e, role):
        nb_membres = Membership.query.filter_by(espace_id=e.id).count() + 1  # +1 pour l'admin
        
        # Calcul de l'espace utilisé (en Go)
        fichiers = Fichier.query.filter_by(espace_id=e.id).all()
        nb_fichiers = len(fichiers)
        utilise_mb = sum(f.taille or 0 for f in fichiers)
        utilise_gb = utilise_mb / 1024.0

        return {
            'id': e.id,
            'nom': e.nom,
            'role': role,
            'admin_id': e.admin_id,
            'nb_membres': nb_membres,
            'nb_fichiers': nb_fichiers,
            'quota': e.quota,
            'utilise_gb': utilise_gb,
        }

    result = []
    for e in espaces_admin:
        result.append(serialize(e, 'admin'))
    for e in espaces_membre:
        if e.id not in [x['id'] for x in result]:
            result.append(serialize(e, 'membre'))

    return jsonify(result), 200


# ─── Lister les membres d'un espace ──────────────────────────────
@admin_espace_bp.route('/espaces/<int:espace_id>/membres', methods=['GET'])
def list_membres(espace_id):
    from app.models.membership import Membership

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    user_id = g.user['id']
    is_admin = espace.admin_id == user_id or g.user['role'] == 'AdminGlobal'
    is_member = Membership.query.filter_by(user_id=user_id, espace_id=espace_id).first() is not None

    if not (is_admin or is_member):
        return jsonify({'error': 'Vous n êtes pas membre de cet espace'}), 403

    admin_user = User.query.get(espace.admin_id)
    result = []
    if admin_user:
        result.append({
            'id': admin_user.id,
            'nom': admin_user.nom,
            'email': admin_user.email,
            'role': 'admin',
            'date_ajout': None,
        })

    memberships = Membership.query.filter_by(espace_id=espace_id).all()
    for m in memberships:
        u = User.query.get(m.user_id)
        if u and u.id != espace.admin_id:
            result.append({
                'id': u.id,
                'nom': u.nom,
                'email': u.email,
                'role': 'membre',
                'date_ajout': m.date_ajout.isoformat() if m.date_ajout else None,
            })

    return jsonify(result), 200


# ─── Retirer un membre d'un espace ───────────────────────────────
@admin_espace_bp.route('/espaces/<int:espace_id>/membres/<int:user_id>', methods=['DELETE'])
def remove_member(espace_id, user_id):
    from app.models.membership import Membership

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    if espace.admin_id != g.user['id'] and g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Seul l admin de l espace peut retirer des membres'}), 403

    if user_id == espace.admin_id:
        return jsonify({'error': 'Impossible de retirer l admin de l espace'}), 400

    membership = Membership.query.filter_by(user_id=user_id, espace_id=espace_id).first()
    if membership is None:
        return jsonify({'error': 'Cet utilisateur n est pas membre de l espace'}), 404

    db.session.delete(membership)
    db.session.commit()

    from app.services.notifier import creer_notification
    espace_obj = Espace.query.get(espace_id)
    if espace_obj:
        creer_notification(
            user_id,
            'retrait_espace',
            f'Vous avez été retiré de l espace "{espace_obj.nom}"',
            lien='/admin-espace'
        )

    return jsonify({'message': 'Membre retiré'}), 200


# ─── Supprimer un espace (admin de l'espace seulement) ───────────
@admin_espace_bp.route('/espaces/<int:espace_id>', methods=['DELETE'])
def delete_espace_by_admin(espace_id):
    from app.models.membership import Membership
    from app.models.invitation import Invitation
    from app.models.fichier import Fichier
    from app.models.acl import ACL
    from app.models.version import VersionFichier
    import os as os_module

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    if espace.admin_id != g.user['id'] and g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Seul l admin de l espace peut le supprimer'}), 403

    fichiers = Fichier.query.filter_by(espace_id=espace_id).all()
    for f in fichiers:
        if f.chemin and os_module.path.exists(f.chemin):
            try:
                os_module.remove(f.chemin)
            except Exception:
                pass
        VersionFichier.query.filter_by(fichier_id=f.id).delete()
        ACL.query.filter_by(fichier_id=f.id).delete()
        db.session.delete(f)

    Membership.query.filter_by(espace_id=espace_id).delete()
    Invitation.query.filter_by(espace_id=espace_id).delete()

    db.session.delete(espace)
    db.session.commit()

    from app.services.logger import log_action
    log_action(
        user_id=g.user['id'],
        action='delete_espace',
        resource_id=espace_id,
        statut='succes',
        details=f'Espace "{espace.nom}" supprime'
    )

    # Rétrograder si l'utilisateur ne gère plus aucun espace
    role_change = None
    user = User.query.get(g.user['id'])
    if user and user.role == 'AdminEspace':
        autres = Espace.query.filter_by(admin_id=user.id).count()
        if autres == 0:
            user.role = 'Utilisateur'
            db.session.commit()
            role_change = 'Utilisateur'

    return jsonify({'message': 'Espace supprime', 'role_updated': role_change}), 200


# ─── Renommer un espace ───────────────────────────────────────────
@admin_espace_bp.route('/espaces/<int:espace_id>', methods=['PUT'])
def rename_espace(espace_id):
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    if espace.admin_id != g.user['id'] and g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès refusé'}), 403

    data = request.get_json(silent=True) or {}
    new_nom = (data.get('nom') or '').strip()
    if not new_nom:
        return jsonify({'error': 'Nom requis'}), 400

    if Espace.query.filter(Espace.nom == new_nom, Espace.id != espace_id).first():
        return jsonify({'error': 'Nom deja utilise'}), 409

    espace.nom = new_nom
    db.session.commit()
    return jsonify({'message': 'Espace renomme', 'nom': espace.nom}), 200


# ─── Quitter un espace (membre, pas l'admin) ──────────────────────
@admin_espace_bp.route('/espaces/<int:espace_id>/quitter', methods=['POST'])
def leave_espace(espace_id):
    from app.models.membership import Membership

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    if espace.admin_id == g.user['id']:
        return jsonify({'error': 'L admin ne peut pas quitter son propre espace. Supprimez-le à la place.'}), 400

    membership = Membership.query.filter_by(user_id=g.user['id'], espace_id=espace_id).first()
    if membership is None:
        return jsonify({'error': 'Vous n êtes pas membre de cet espace'}), 404

    db.session.delete(membership)
    db.session.commit()

    from app.services.notifier import creer_notification
    partant = User.query.get(g.user['id'])
    if espace and partant:
        creer_notification(
            espace.admin_id,
            'leave_espace',
            f'{partant.nom} a quitté votre espace "{espace.nom}"',
            lien=f'/espace/{espace.id}'
        )

    return jsonify({'message': 'Vous avez quitté l espace'}), 200


# ── Gestion des quotas ───────────────────────────────────────────

@admin_espace_bp.route('/admin/users/<int:user_id>/quota', methods=['PUT'])
@require_role('AdminGlobal')
def update_quota(user_id):
  user = User.query.get(user_id)
  if user is None :
    return  jsonify({'error' : 'Utilisateur inexistant'}), 404
  data = request.get_json()
  quota = data.get('quota')
  if quota is None or quota <= 0 :
    return jsonify({'error' : 'Valeur du quota non valide'}), 400
  user.quota = quota
  db.session.commit()
  return jsonify({'message' : 'quota modifié avec succès'}), 200


# ─── Modifier la politique d'upload d'un espace ──────────────────
@admin_espace_bp.route('/espaces/<int:espace_id>/upload-policy', methods=['PUT'])
def update_upload_policy(espace_id):
    from flask import g, jsonify, request

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    if espace.admin_id != g.user['id'] and g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Seul l admin de l espace peut modifier la politique'}), 403

    data = request.get_json(silent=True) or {}
    policy = data.get('upload_policy', 'tous')
    if policy not in ('tous', 'membres_choisis', 'admin_seul'):
        return jsonify({'error': 'Politique invalide'}), 400

    espace.upload_policy = policy

    if policy == 'membres_choisis':
        autorises = data.get('upload_autorises', [])
        espace.upload_autorises = ','.join(str(x) for x in autorises)
    else:
        espace.upload_autorises = ''

    db.session.commit()
    return jsonify({
        'message': 'Politique mise à jour',
        'upload_policy': espace.upload_policy,
        'upload_autorises': espace.upload_autorises
    }), 200


# ─── Détails complets d'un espace ────────────────────────────────
@admin_espace_bp.route('/espaces/<int:espace_id>/details', methods=['GET'])
def get_espace_details(espace_id):
    from flask import g, jsonify
    from app.models.membership import Membership

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    user_id = g.user['id']
    is_admin = espace.admin_id == user_id or g.user['role'] == 'AdminGlobal'
    is_member = Membership.query.filter_by(user_id=user_id, espace_id=espace_id).first() is not None

    if not (is_admin or is_member):
        return jsonify({'error': 'Accès refusé'}), 403

    autorises = []
    if espace.upload_autorises:
        autorises = [int(x) for x in espace.upload_autorises.split(',') if x.strip()]

    # Calcul de l'espace utilisé (en Go)
    from app.models.fichier import Fichier
    fichiers = Fichier.query.filter_by(espace_id=espace.id).all()
    utilise_mb = sum(f.taille or 0 for f in fichiers)
    utilise_gb = utilise_mb / 1024.0

    return jsonify({
        'id': espace.id,
        'nom': espace.nom,
        'admin_id': espace.admin_id,
        'upload_policy': espace.upload_policy or 'tous',
        'upload_autorises': autorises,
        'is_admin': is_admin,
        'mon_role': 'admin' if is_admin else 'membre',
        'quota': espace.quota,
        'utilise_gb': utilise_gb,
    }), 200

