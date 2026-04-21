from flask import Blueprint, request, jsonify, g
from app.decorators import require_role
from app.models.espace import Espace    
from app.models.user import User        
from app.extensions import db           

admin_espace_bp = Blueprint('admin_espace', __name__)

# ── Gestion des espaces ──────────────────────────────────────────

@admin_espace_bp.route('/admin/espaces', methods=['POST'])
@require_role('AdminGlobal')
def create_espace():
  data = request.get_json()
  space_name = data['name']
  admin = User.query.get(data['user_id'])
  if Espace.query.filter_by(nom=space_name).first() is None :
    if admin is not None and admin.role == 'AdminEspace' :
      space = Espace(name=space_name, admin_id=admin.id)
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
    result.append({
      'id' : elt.id,
      'name' : elt.nom,
      'adminEspace' : (User.query.get(elt.admin_id).nom, User.query.get(elt.admin_id).email) if admin is not None else None,
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

# ── Gestion des quotas ───────────────────────────────────────────

@admin_espace_bp.route('/admin/users/<int:user_id>/quota', methods=['PUT'])
@require_role('AdminGlobal')
def update_quota(user_id):
  user = User.query.get(user_id)
  if user is None :
    return  jsonify({'error' : 'Utilisateur inexistant'}), 404
  data = request.get_json()
  quota = data.get('quota')
  if quota > 0 :
    user.quota = quota
    db.session.commit()
    return jsonify({'message' : 'quota modifié avec succès'}), 200
  else :
    return  jsonify({'error' : 'Valeur du quota non valide'}), 400
  
