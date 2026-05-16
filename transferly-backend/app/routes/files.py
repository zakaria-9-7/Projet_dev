import os
import io
import threading
import hashlib
from flask import Blueprint, request, jsonify, g, send_file, current_app
from app.extensions import db
from app.models.fichier import Fichier
from app.models.version import VersionFichier
from app.models.acl import ACL
from app.models.user import User
from app.crypto import encrypt_file, decrypt_file
from app.routes.acl import require_permission
from app.acl_engine import grant_owner_permissions
from app.services.quota import check_quota, update_quota
from app.services.logger import log_action

files_bp = Blueprint('files', __name__, url_prefix='/files')

file_locks = {}
lock_mutex = threading.Lock()

ALLOWED_EXTENSIONS = {
    'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt',
    'txt', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'csv', 'md',
}


def get_file_lock(file_id):
    with lock_mutex:
        if file_id not in file_locks:
            file_locks[file_id] = threading.Lock()
        return file_locks[file_id]


def _ext(filename):
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def _serialize(f, user_id):
    est_partage = any(acl.user_id != user_id for acl in f.acls)
    return {
        'id':           f.id,
        'nom':          f.nom,
        'taille':       f.taille,
        'date_creation': f.date_creation.isoformat() if f.date_creation else None,
        'espace_id':    f.espace_id,
        'est_partage':  est_partage,
    }


# ── GET /files/shared-with-me ────────────────────────────────────
# Doit être déclaré AVANT /<int:fichier_id> pour éviter toute ambiguïté.
@files_bp.route('/shared-with-me', methods=['GET'])
def shared_with_me():
    user_id = g.user['id']
    try:
        acls = ACL.query.filter_by(user_id=user_id).all()
        result = []
        for acl in acls:
            fichier = Fichier.query.get(acl.fichier_id)
            if fichier is None or fichier.user_id == user_id:
                continue
            proprietaire = User.query.get(fichier.user_id)
            result.append({
                'id':                fichier.id,
                'nom':               fichier.nom,
                'taille':            fichier.taille,
                'date_creation':     fichier.date_creation.isoformat() if fichier.date_creation else None,
                'proprietaire_nom':  proprietaire.nom   if proprietaire else None,
                'proprietaire_email': proprietaire.email if proprietaire else None,
                'mes_permissions': {
                    'lecture':     acl.lecture,
                    'ecriture':    acl.ecriture,
                    'upload':      acl.upload,
                    'download':    acl.download,
                    'suppression': acl.suppression,
                    'partage':     acl.partage,
                },
            })
        return jsonify(result), 200
    except Exception as e:
        print(f'ERROR GET /files/shared-with-me: {e}')
        return jsonify({'error': str(e)}), 500


# ── GET /files/ ───────────────────────────────────────────────────
@files_bp.route('/', methods=['GET'])
def list_files():
    user_id = g.user['id']
    try:
        fichiers = Fichier.query.filter_by(user_id=user_id).all()
        return jsonify({'files': [_serialize(f, user_id) for f in fichiers]}), 200
    except Exception as e:
        print(f'ERROR GET /files/: {e}')
        return jsonify({'error': str(e)}), 500


# ── POST /files/ ──────────────────────────────────────────────────
@files_bp.route('/', methods=['POST'])
def upload_file():
    user_id = g.user['id']
    try:
        uploaded = request.files.get('file')
        if not uploaded:
            return jsonify({'error': 'Champ file manquant'}), 400

        if _ext(uploaded.filename) not in ALLOWED_EXTENSIONS:
            return jsonify({'error': f"Type de fichier non autorisé (.{_ext(uploaded.filename)})"}), 415

        file_content = uploaded.read()
        file_size_mb = len(file_content) / (1024 * 1024)

        if not check_quota(user_id, file_size_mb):
            return jsonify({'error': "Quota dépassé, impossible d'uploader ce fichier"}), 413

        encrypted = encrypt_file(file_content)
        espace_id = request.form.get('espace_id', type=int)

        if espace_id:
            from app.models.espace import Espace
            from app.models.membership import Membership
            espace_obj = Espace.query.get(espace_id)
            if espace_obj is None:
                return jsonify({'error': 'Espace introuvable'}), 404

            uid = g.user['id']
            is_espace_admin = (espace_obj.admin_id == uid)
            policy = espace_obj.upload_policy or 'tous'

            if not is_espace_admin:
                if policy == 'admin_seul':
                    return jsonify({'error': 'Seul l administrateur de l espace peut téléverser des fichiers'}), 403
                elif policy == 'membres_choisis':
                    autorises = []
                    if espace_obj.upload_autorises:
                        autorises = [int(x) for x in espace_obj.upload_autorises.split(',') if x.strip()]
                    if uid not in autorises:
                        return jsonify({'error': 'Vous n êtes pas autorisé à téléverser dans cet espace'}), 403

        fichier = Fichier(
            nom=uploaded.filename,
            taille=round(file_size_mb, 6),
            user_id=user_id,
            espace_id=espace_id,
            chemin='',
        )
        db.session.add(fichier)
        db.session.flush()  # obtient l'id avant l'écriture disque

        upload_dir = f'uploads/user_{user_id}'
        os.makedirs(upload_dir, exist_ok=True)
        file_path = f'{upload_dir}/{fichier.id}.enc'

        with open(file_path, 'wb') as fp:
            fp.write(encrypted)

        fichier.chemin = file_path

        version = VersionFichier(
            numero_version=1,
            description='Version initiale',
            chemin=file_path,
            fichier_id=fichier.id,
        )
        db.session.add(version)
        db.session.commit()

        grant_owner_permissions(user_id, fichier.id)

        # Si le fichier est dans un espace, donner accès à tous les membres
        if espace_id:
            from app.models.membership import Membership
            from app.models.espace import Espace
            from app.models.acl import ACL
            espace = Espace.query.get(espace_id)
            if espace:
                members_ids = [m.user_id for m in Membership.query.filter_by(espace_id=espace_id).all()]
                members_ids.append(espace.admin_id)
                for member_id in set(members_ids):
                    if member_id != user_id:
                        existing = ACL.query.filter_by(user_id=member_id, fichier_id=fichier.id).first()
                        if not existing:
                            is_espace_admin = (member_id == espace.admin_id)
                            new_acl = ACL(
                                user_id=member_id,
                                fichier_id=fichier.id,
                                lecture=True,
                                download=True,
                                ecriture=is_espace_admin,
                                upload=is_espace_admin,
                                suppression=is_espace_admin,
                                partage=is_espace_admin,
                            )
                            db.session.add(new_acl)
                db.session.commit()

        update_quota(user_id, file_size_mb, is_upload=True)
        log_action(user_id, 'upload', resource_id=fichier.id, statut='succes')

        return jsonify({
            'id':           fichier.id,
            'nom':          fichier.nom,
            'taille':       fichier.taille,
            'date_creation': fichier.date_creation.isoformat() if fichier.date_creation else None,
            'user_id':      fichier.user_id,
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f'ERROR POST /files/: {e}')
        log_action(user_id, 'upload', statut='echec', details=str(e))
        return jsonify({'error': str(e)}), 500


# ── GET /files/<fichier_id>/download ─────────────────────────────
@files_bp.route('/<int:fichier_id>/download', methods=['GET'])
@require_permission('download')
def download_file(fichier_id):
    user_id = g.user['id']
    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({'error': 'Fichier introuvable'}), 404
    if not fichier.chemin or not os.path.exists(fichier.chemin):
        return jsonify({'error': 'Binaire chiffré absent du disque'}), 404

    try:
        with open(fichier.chemin, 'rb') as fp:
            encrypted = fp.read()
        decrypted = decrypt_file(encrypted)
        log_action(user_id, 'download', resource_id=fichier_id, statut='succes')
        return send_file(
            io.BytesIO(decrypted),
            download_name=fichier.nom,
            as_attachment=True,
        )
    except Exception as e:
        print(f'ERROR GET /files/{fichier_id}/download: {e}')
        log_action(user_id, 'download', resource_id=fichier_id, statut='echec', details=str(e))
        return jsonify({'error': str(e)}), 500


# ── DELETE /files/<fichier_id> ────────────────────────────────────
@files_bp.route('/<int:fichier_id>', methods=['DELETE'])
@require_permission('suppression')
def delete_file(fichier_id):
    user_id = g.user['id']
    lock = get_file_lock(fichier_id)
    if not lock.acquire(blocking=False):
        return jsonify({'error': "Fichier en cours d'utilisation"}), 423

    try:
        fichier = Fichier.query.get(fichier_id)
        if fichier is None:
            return jsonify({'error': 'Fichier introuvable'}), 404

        taille_mb    = fichier.taille or 0.0
        chemin_principal = fichier.chemin

        # Collecte les chemins des versions archivées avant la suppression en cascade
        chemins_versions = [
            v.chemin for v in fichier.versions
            if v.chemin and v.chemin != chemin_principal and os.path.exists(v.chemin)
        ]

        db.session.delete(fichier)  # cascade supprime versions + ACLs
        db.session.commit()

        # Nettoyage disque après commit réussi
        for chemin in chemins_versions:
            os.remove(chemin)
        if chemin_principal and os.path.exists(chemin_principal):
            os.remove(chemin_principal)

        update_quota(user_id, taille_mb, is_upload=False)
        log_action(user_id, 'suppression', resource_id=fichier_id, statut='succes')
        return jsonify({'message': 'Fichier supprimé définitivement'}), 200

    except Exception as e:
        db.session.rollback()
        print(f'ERROR DELETE /files/{fichier_id}: {e}')
        log_action(user_id, 'suppression', resource_id=fichier_id, statut='echec', details=str(e))
        return jsonify({'error': str(e)}), 500
    finally:
        lock.release()


# ── GET /files/espace/<espace_id> ────────────────────────────────
@files_bp.route('/espace/<int:espace_id>', methods=['GET'])
def list_files_in_espace(espace_id):
    from app.models.espace import Espace
    from app.models.membership import Membership

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    espace = Espace.query.get(espace_id)
    if espace is None:
        return jsonify({'error': 'Espace introuvable'}), 404

    user_id = g.user['id']
    is_admin_espace = espace.admin_id == user_id
    is_admin_global = g.user['role'] == 'AdminGlobal'
    is_member = Membership.query.filter_by(user_id=user_id, espace_id=espace_id).first() is not None

    if not (is_admin_espace or is_admin_global or is_member):
        return jsonify({'error': 'Vous n êtes pas membre de cet espace'}), 403

    fichiers = Fichier.query.filter_by(espace_id=espace_id).all()
    result = []
    for f in fichiers:
        owner = User.query.get(f.user_id)
        result.append({
            'id': f.id,
            'nom': f.nom,
            'taille': f.taille,
            'date_creation': f.date_creation.isoformat() if f.date_creation else None,
            'owner_id': f.user_id,
            'owner_nom': owner.nom if owner else None,
            'owner_email': owner.email if owner else None,
        })
    return jsonify(result), 200


# ── PUT /files/<fichier_id> ───────────────────────────────────────
@files_bp.route('/<int:fichier_id>', methods=['PUT'])
@require_permission('ecriture')
def update_file(fichier_id):
    user_id = g.user['id']
    lock = get_file_lock(fichier_id)
    if not lock.acquire(blocking=False):
        return jsonify({'error': 'Fichier en cours de modification par un autre utilisateur'}), 423

    try:
        uploaded = request.files.get('file')
        if not uploaded:
            return jsonify({'error': 'Champ file manquant'}), 400

        fichier = Fichier.query.get(fichier_id)
        if fichier is None:
            return jsonify({'error': 'Fichier introuvable'}), 404

        new_content  = uploaded.read()
        new_size_mb  = len(new_content) / (1024 * 1024)
        old_size_mb  = fichier.taille or 0.0
        sha256       = hashlib.sha256(new_content).hexdigest()
        owner_id     = fichier.user_id

        # Prochain numéro de version
        max_version = (
            db.session.query(db.func.max(VersionFichier.numero_version))
            .filter_by(fichier_id=fichier_id)
            .scalar()
        ) or 0
        next_num = max_version + 1

        # Archive l'ancien binaire sous un nom versionné
        archive_path = f'uploads/user_{owner_id}/{fichier_id}_v{max_version}.enc'
        if fichier.chemin and os.path.exists(fichier.chemin):
            os.rename(fichier.chemin, archive_path)
        else:
            archive_path = fichier.chemin  # référence conservée même si absent

        version = VersionFichier(
            numero_version=next_num,
            description=f'Mise à jour par user {user_id}',
            chemin=archive_path,
            fichier_id=fichier_id,
        )
        db.session.add(version)

        # Écrit le nouveau binaire chiffré à l'emplacement canonique
        new_path = f'uploads/user_{owner_id}/{fichier_id}.enc'
        with open(new_path, 'wb') as fp:
            fp.write(encrypt_file(new_content))

        fichier.chemin = new_path
        fichier.taille = round(new_size_mb, 6)
        db.session.commit()

        # Ajuste le quota sur le delta uniquement
        delta = new_size_mb - old_size_mb
        if delta > 0:
            update_quota(owner_id, delta, is_upload=True)
        elif delta < 0:
            update_quota(owner_id, abs(delta), is_upload=False)

        log_action(user_id, 'modification', resource_id=fichier_id, statut='succes')
        return jsonify({
            'message':        'Fichier mis à jour, nouvelle version créée',
            'sha256':         sha256,
            'numero_version': next_num,
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f'ERROR PUT /files/{fichier_id}: {e}')
        log_action(user_id, 'modification', resource_id=fichier_id, statut='echec', details=str(e))
        return jsonify({'error': str(e)}), 500
    finally:
        lock.release()
