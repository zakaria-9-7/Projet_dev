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
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] not in ('AdminEspace', 'AdminGlobal'):
        return jsonify({'error': 'Accès refusé'}), 403
    my_id = g.user['id']
    espaces = Espace.query.filter_by(admin_id=my_id).all()
    result = []
    for e in espaces:
        admin = User.query.get(e.admin_id)
        result.append({
            'id': e.id,
            'nom': e.nom,
            'admin_id': e.admin_id,
            'admin_nom': admin.nom if admin else None,
            'admin_email': admin.email if admin else None,
            'quota_used': e.quota,
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
  
