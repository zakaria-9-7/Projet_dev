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
    'statut': user.statut,
    'quota': user.quota,
    'quota_utilise': user.quota_utilise,
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

  if user_id == g.user['id']:
      return jsonify({'error': 'Vous ne pouvez pas supprimer votre propre compte administrateur'}), 403

  if user.role == 'AdminGlobal':
      nb_admins = User.query.filter_by(role='AdminGlobal').count()
      if nb_admins <= 1:
          return jsonify({'error': 'Impossible de supprimer le dernier administrateur global'}), 403

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
        if new_role not in ['AdminGlobal', 'AdminEspace', 'Utilisateur'] :
          return jsonify({'error' : 'role non valide'}), 400

        if user_id == g.user['id'] and new_role != 'AdminGlobal':
            nb_admins = User.query.filter_by(role='AdminGlobal').count()
            if nb_admins <= 1:
                return jsonify({'error': 'Vous êtes le dernier administrateur, vous ne pouvez pas changer votre rôle'}), 403

        user.role = new_role
        db.session.commit()
        return jsonify({'message': 'role modifié avec succès'}), 200


@admin_global_bp.route('/admin/stats', methods=['GET'])
@require_role('AdminGlobal')
def admin_stats():
    from app.models.fichier import Fichier
    from app.models.espace import Espace
    fichiers = Fichier.query.all()
    total_mo = sum(f.taille or 0 for f in fichiers)  # taille stockée en Mo
    total_go = total_mo / 1024
    return jsonify({
        'stockage_mo': round(total_mo, 2),
        'stockage_go': round(total_go, 4),
        'total_fichiers': len(fichiers),
        'total_users': User.query.count(),
        'total_espaces': Espace.query.count(),
    }), 200


@admin_global_bp.route('/admin/espaces', methods=['GET'])
def admin_list_all_espaces():
    from app.models.espace import Espace
    from app.models.membership import Membership
    from app.models.fichier import Fichier

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès réservé à l administrateur global'}), 403

    espaces = Espace.query.all()
    result = []
    for e in espaces:
        admin = User.query.get(e.admin_id)
        nb_membres = Membership.query.filter_by(espace_id=e.id).count()
        nb_fichiers = Fichier.query.filter_by(espace_id=e.id).count()
        result.append({
            'id': e.id,
            'nom': e.nom,
            'admin_nom': admin.nom if admin else 'Inconnu',
            'admin_email': admin.email if admin else None,
            'nb_membres': nb_membres + 1,
            'nb_fichiers': nb_fichiers,
        })
    return jsonify(result), 200


@admin_global_bp.route('/admin/espaces/<int:espace_id>', methods=['DELETE'])
def admin_delete_espace(espace_id):
    from app.models.espace import Espace
    from app.models.membership import Membership
    from app.models.invitation import Invitation
    from app.models.fichier import Fichier
    from app.models.acl import ACL
    from app.models.version import VersionFichier
    import os as os_module

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès réservé'}), 403

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

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

    return jsonify({'message': 'Espace supprimé'}), 200


@admin_global_bp.route('/admin/fichiers', methods=['GET'])
def admin_list_all_fichiers():
    from app.models.fichier import Fichier
    from app.models.espace import Espace

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès réservé'}), 403

    fichiers = Fichier.query.all()
    result = []
    for f in fichiers:
        owner = User.query.get(f.user_id)
        espace_nom = None
        if f.espace_id:
            esp = Espace.query.get(f.espace_id)
            espace_nom = esp.nom if esp else None
        result.append({
            'id': f.id,
            'nom': f.nom,
            'taille': f.taille,
            'owner_nom': owner.nom if owner else 'Inconnu',
            'owner_email': owner.email if owner else None,
            'espace_nom': espace_nom,
            'date_creation': f.date_creation.isoformat() if f.date_creation else None,
        })
    return jsonify(result), 200


@admin_global_bp.route('/admin/fichiers/<int:fichier_id>', methods=['DELETE'])
def admin_delete_fichier(fichier_id):
    from app.models.fichier import Fichier
    from app.models.acl import ACL
    from app.models.version import VersionFichier
    import os as os_module

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès réservé'}), 403

    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({'error': 'Fichier introuvable'}), 404

    if fichier.chemin and os_module.path.exists(fichier.chemin):
        try:
            os_module.remove(fichier.chemin)
        except Exception:
            pass
    VersionFichier.query.filter_by(fichier_id=fichier_id).delete()
    ACL.query.filter_by(fichier_id=fichier_id).delete()
    db.session.delete(fichier)
    db.session.commit()

    return jsonify({'message': 'Fichier supprimé'}), 200
