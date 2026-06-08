import secrets
import string

from flask import Blueprint, request, jsonify, g
from app.decorators import require_role
from app.models.user import User
from app.models.fichier import Fichier
from app.models.espace import Espace
from app.models.membership import Membership
from app.models.acl import ACL
from app.models.version import VersionFichier
from app.models.notification import Notification
from app.models.quota_request import QuotaRequest
from app.models.log import Log
from app.extensions import db, bcrypt


def _generate_temp_password(length=12):
    """Génère un mot de passe aléatoire avec majuscules, minuscules, chiffres et 1 spécial."""
    specials = "!@#$%&*"
    alphabet = string.ascii_letters + string.digits + specials
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(specials),
    ]
    for _ in range(length - 4):
        pwd.append(secrets.choice(alphabet))
    # Mélange cryptographiquement sûr (Fisher-Yates avec secrets.randbelow)
    for i in range(len(pwd) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        pwd[i], pwd[j] = pwd[j], pwd[i]
    return ''.join(pwd)

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
    data = request.get_json(silent=True) or {}

    email = data.get('email', '').strip()
    nom = data.get('nom', '').strip()
    role = data.get('role', 'Utilisateur').strip()

    if not email or not nom:
        return jsonify({'error': 'Champs manquants (email, nom)'}), 400

    if role not in ['Utilisateur', 'AdminEspace', 'AdminGlobal']:
        return jsonify({'error': 'Rôle non valide'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Adresse email déjà utilisée'}), 409

    temp_password = _generate_temp_password()
    hashed = bcrypt.generate_password_hash(temp_password).decode('utf-8')

    new_user = User(
        email=email,
        nom=nom,
        role=role,
        password=hashed,
        must_reset_password=True,
    )
    db.session.add(new_user)
    db.session.commit()

    email_envoye = False
    try:
        from app.services.mailer import send_temp_password_email
        email_envoye = send_temp_password_email(email, nom, temp_password)
    except Exception as mail_err:
        print(f"Alerte Mail non envoyé : {str(mail_err)}")

    if email_envoye:
        print(f"[ADMIN] Email de bienvenue envoyé à {email}")
    else:
        print(f"[ADMIN FALLBACK] Envoi email échoué. Mot de passe temporaire pour {email} : {temp_password}")

    return jsonify({
        'id': new_user.id,
        'email': new_user.email,
        'nom': new_user.nom,
        'role': new_user.role,
        'temporary_password': temp_password,
        'email_sent': email_envoye,
    }), 201

@admin_global_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@require_role('AdminGlobal')
def update_user(user_id):
    user = User.query.get(user_id)
    if user  is None :
      return  jsonify({'error' : 'utilisateur inexistant'}), 404

    # SÉCURITÉ : un AdminGlobal ne peut pas modifier son propre rôle
    if user.id == g.user['id']:
        return jsonify({'error': 'Vous ne pouvez pas modifier votre propre rôle'}), 403

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

  try:
      # Nettoyage manuel des dépendances pour éviter les violations de clés étrangères
      ACL.query.filter_by(user_id=user_id).delete()
      Membership.query.filter_by(user_id=user_id).delete()
      Notification.query.filter_by(user_id=user_id).delete()
      QuotaRequest.query.filter_by(user_id=user_id).delete()
      Log.query.filter_by(user_id=user_id).delete()

      # Suppression des fichiers dont il est le propriétaire
      fichiers = Fichier.query.filter_by(user_id=user_id).all()
      for f in fichiers:
          VersionFichier.query.filter_by(fichier_id=f.id).delete()
          ACL.query.filter_by(fichier_id=f.id).delete()
          db.session.delete(f)

      # Suppression des espaces dont il est l'administrateur
      espaces = Espace.query.filter_by(admin_id=user_id).all()
      for e in espaces:
          # Note: On pourrait réassigner l'espace, mais ici on choisit le nettoyage simple
          db.session.delete(e)

      db.session.delete(user)
      db.session.commit()
      return jsonify({'message': 'Utilisateur et ses données supprimés avec succès'}), 200
  except Exception as e:
      db.session.rollback()
      return jsonify({'error': f"Erreur d'intégrité BDD : {str(e)}"}), 400


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


# ── GET /admin/espaces/quotas ─────────────────────────────────────
# Returns all espaces with their storage usage and quota.
@admin_global_bp.route('/admin/espaces/quotas', methods=['GET'])
@require_role('AdminGlobal')
def admin_get_espace_quotas():
    from app.models.espace import Espace
    from app.models.fichier import Fichier

    espaces = Espace.query.all()
    result = []
    for e in espaces:
        admin = User.query.get(e.admin_id)
        # Sum of file sizes (stored in MB) for all files in this espace
        fichiers = Fichier.query.filter_by(espace_id=e.id).all()
        utilise_mb = sum(f.taille or 0 for f in fichiers)
        utilise_gb = utilise_mb / 1024.0
        
        # Harmonise les quotas existants à 0 vers le nouveau défaut de 5.0
        effective_quota = e.quota if (e.quota is not None and e.quota > 0) else 5.0
        
        result.append({
            'id':          e.id,
            'nom':         e.nom,
            'admin_nom':   admin.nom   if admin else 'Inconnu',
            'admin_email': admin.email if admin else None,
            'quota':       effective_quota,
            'quota_utilise': round(utilise_gb, 6),
            'nb_fichiers': len(fichiers),
        })
    return jsonify(result), 200


# ── PUT /admin/espaces/<id>/quota ─────────────────────────────────
@admin_global_bp.route('/admin/espaces/<int:espace_id>/quota', methods=['PUT'])
@require_role('AdminGlobal')
def admin_update_espace_quota(espace_id):
    from app.models.espace import Espace

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404
    data = request.get_json(silent=True) or {}
    quota = data.get('quota')
    if quota is None or float(quota) < 0:
        return jsonify({'error': 'Quota invalide (doit être ≥ 0, 0 = illimité)'}), 400
    espace.quota = float(quota)
    db.session.commit()
    return jsonify({'message': 'Quota espace mis à jour', 'quota': espace.quota}), 200



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


@admin_global_bp.route('/admin/espaces/<int:espace_id>/members', methods=['GET'])
def admin_get_espace_members(espace_id):
    from app.models.espace import Espace
    from app.models.membership import Membership

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès réservé'}), 403

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    admin = User.query.get(espace.admin_id)
    members = []

    # Admin of the espace
    if admin:
        members.append({
            'id':       admin.id,
            'nom':      admin.nom,
            'email':    admin.email,
            'is_admin': True,
        })

    # Regular members
    for m in Membership.query.filter_by(espace_id=espace_id).all():
        if m.user_id == espace.admin_id:
            continue
        u = User.query.get(m.user_id)
        if u:
            members.append({
                'id':       u.id,
                'nom':      u.nom,
                'email':    u.email,
                'is_admin': False,
            })

    return jsonify(members), 200


@admin_global_bp.route('/admin/espaces/<int:espace_id>/members/<int:user_id>', methods=['DELETE'])
def admin_remove_espace_member(espace_id, user_id):
    from app.models.espace import Espace
    from app.models.membership import Membership

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès réservé'}), 403

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    if espace.admin_id == user_id:
        return jsonify({'error': "Impossible de retirer l'administrateur de l'espace"}), 400

    m = Membership.query.filter_by(espace_id=espace_id, user_id=user_id).first()
    if m is None:
        return jsonify({'error': 'Membre introuvable'}), 404

    db.session.delete(m)
    db.session.commit()
    return jsonify({'message': 'Membre retiré'}), 200


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


@admin_global_bp.route('/admin/fichiers/batch', methods=['DELETE'])
def admin_delete_fichiers_batch():
    from app.models.fichier import Fichier
    from app.services.quota import update_quota
    from app.services.logger import log_action
    import os as os_module

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    if g.user['role'] != 'AdminGlobal':
        return jsonify({'error': 'Accès réservé'}), 403

    data = request.get_json(silent=True) or {}
    ids = data.get('ids')

    if not isinstance(ids, list) or len(ids) == 0:
        return jsonify({'error': 'ids doit être une liste non vide d\'entiers'}), 400
    if len(ids) > 500:
        return jsonify({'error': 'Trop de fichiers (maximum 500 par requête)'}), 400

    to_delete = []
    skipped = []

    try:
        for file_id in ids:
            if not isinstance(file_id, int):
                skipped.append({'id': file_id, 'raison': 'Identifiant invalide'})
                continue

            fichier = Fichier.query.get(file_id)
            if fichier is None:
                skipped.append({'id': file_id, 'raison': 'Fichier introuvable'})
                continue

            chemin_principal = fichier.chemin
            chemins_versions = [
                v.chemin for v in fichier.versions
                if v.chemin and v.chemin != chemin_principal and os_module.path.exists(v.chemin)
            ]
            to_delete.append({
                'id':               fichier.id,
                'user_id':          fichier.user_id,
                'taille_mb':        fichier.taille or 0.0,
                'chemin_principal': chemin_principal,
                'chemins_versions': chemins_versions,
            })
            db.session.delete(fichier)  # cascade : versions + ACLs

        if to_delete:
            db.session.commit()

            for item in to_delete:
                for chemin in item['chemins_versions']:
                    try:
                        os_module.remove(chemin)
                    except OSError:
                        pass
                if item['chemin_principal'] and os_module.path.exists(item['chemin_principal']):
                    try:
                        os_module.remove(item['chemin_principal'])
                    except OSError:
                        pass
                if item['taille_mb'] > 0:
                    update_quota(item['user_id'], item['taille_mb'], is_upload=False)
                log_action(g.user['id'], 'suppression', resource_id=item['id'], statut='succes')

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({
        'deleted_count': len(to_delete),
        'skipped_count': len(skipped),
        'skipped':        skipped,
    }), 200
