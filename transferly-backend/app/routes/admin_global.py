from flask import Blueprint, request, jsonify, g
from app.decorators import require_role
from app.models.user import User
from app.extensions import db, bcrypt

admin_global_bp = Blueprint('admin_global', __name__)

@admin_global_bp.route('/admin/users', methods=['GET'])
@require_role('AdminGlobal')
def get_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    users1 = User.query.paginate(page=page, per_page=per_page) 
    users = []
    for user in users1.items :
       users.append( {
    'id': user.id,
    'nom': user.nom,
    'email': user.email,
    'role': user.role,
    'statut': user.statut
})
    return jsonify({'users': users, 'total': users1.total, 'page': users1.page, 'pages': users1.pages})


@admin_global_bp.route('/admin/users', methods=['POST'])
@require_role('AdminGlobal')
def create_user():
    try :
      data = request.get_json()
      email = data['email']
      name = data['nom']
      role = data['role']
      password = data['password']
      if User.query.filter_by(email=email).first() is None :
        if role in ['AdminGlobal', 'AdminEspace', 'Utilisateur']:
          password = bcrypt.generate_password_hash(password).decode('utf-8')
          new_user = User(email=email, nom=name, role=role, password=password)
          db.session.add(new_user)
          db.session.commit()
          return jsonify({'message' : 'Utilisateur créé avec succès'}), 201
        else :
          return jsonify({'error' : 'rôle invalide'}), 400
      else :
        return jsonify({'error' : 'adresse déjà utilisé'}), 409
    except Exception as e :
      return jsonify({'error' : 'Champ(s) manquant(s)'}), 400

@admin_global_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@require_role('AdminGlobal')
def update_user(user_id):
    user = User.query.get(user_id)
    if user  is None :
      return  jsonify({'error' : 'utilisateur inexistant'}), 404
    else :
      data = request.get_json()
      new_email = data.get('email', user.email)
      new_statut = data.get('statut', user.statut)
      new_role = data.get('role', user.role)
      if new_role in ['AdminGlobal', 'AdminEspace', 'Utilisateur'] :
        user.role = new_role
      else :
        return jsonify({'error' : 'role non valide'}), 400
      user.email = new_email    
      user.statut = new_statut
      db.session.commit()
      return jsonify({'message': 'Utilisateur modifié avec succès'}), 200
      
@admin_global_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@require_role('AdminGlobal')
def delete_user(user_id):
  user = User.query.get(user_id)
  if user is None :
    return  jsonify({'error' : 'utilisateur inexistant'}), 404
  else :
    db.session.delete(user)
    db.session.commit()
    return  jsonify({'message' : 'utilisateur supprimé avec succès'}), 200


@admin_global_bp.route('/admin/files', methods=['GET'])
@require_role('AdminGlobal')
def get_all_files():
    from app.models.fichier import Fichier
    fichiers = Fichier.query.all()
    result = []
    for f in fichiers:
        owner = User.query.get(f.user_id)
        result.append({
            'id': f.id,
            'nom': f.nom,
            'taille': f.taille,
            'user_id': f.user_id,
            'owner_nom': owner.nom if owner else None,
            'owner_email': owner.email if owner else None,
            'espace_id': f.espace_id,
            'date_creation': f.date_creation.isoformat() if f.date_creation else None
        })
    return jsonify(result), 200


@admin_global_bp.route('/admin/users/<int:user_id>/quota', methods=['PUT'])
@require_role('AdminGlobal')
def admin_update_quota(user_id):
    user = User.query.get(user_id)
    if user is None:
        return jsonify({'error': 'Utilisateur inexistant'}), 404
    data = request.get_json(silent=True) or {}
    quota = data.get('quota')
    if quota is None or float(quota) <= 0:
        return jsonify({'error': 'Quota invalide'}), 400
    user.quota = float(quota)
    db.session.commit()
    return jsonify({'message': 'Quota mis à jour', 'quota': user.quota}), 200


@admin_global_bp.route('/admin/users/<int:user_id>/suspend', methods=['POST'])
@require_role('AdminGlobal')
def admin_suspend_user(user_id):
    user = User.query.get(user_id)
    if user is None:
        return jsonify({'error': 'Utilisateur inexistant'}), 404
    user.statut = 'bloque' if user.statut == 'actif' else 'actif'
    db.session.commit()
    return jsonify({'message': f'Utilisateur {user.statut}', 'statut': user.statut}), 200


@admin_global_bp.route('/admin/users/<int:user_id>/role', methods=['PUT'])
@require_role('AdminGlobal')
def update_user_role(user_id):
      user = User.query.get(user_id)
      if user  is None :
          return  jsonify({'error' : 'utilisateur inexistant'}), 404
      else :
        data = request.get_json()
        new_role = data.get('role', user.role)
        if new_role in ['AdminGlobal', 'AdminEspace', 'Utilisateur'] :
          user.role = new_role
          db.session.commit()
          return jsonify({'message': 'role modifié avec succès'}), 200
        else :
          return jsonify({'error' : 'role non valide'}), 400
