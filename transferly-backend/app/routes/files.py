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
from app.models.espace import Espace
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
        'folder_id':    f.folder_id,
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
            espace_nom = None
            source = 'direct'
            if fichier.espace_id:
                source = 'espace'
                esp = Espace.query.get(fichier.espace_id)
                espace_nom = esp.nom if esp else None
            result.append({
                'id':                fichier.id,
                'nom':               fichier.nom,
                'taille':            fichier.taille,
                'date_creation':     fichier.date_creation.isoformat() if fichier.date_creation else None,
                'proprietaire_nom':  proprietaire.nom   if proprietaire else None,
                'proprietaire_email': proprietaire.email if proprietaire else None,
                'source':            source,
                'espace_nom':        espace_nom,
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
# Returns the user's own files + files directly shared with them (not via espace).
@files_bp.route('/', methods=['GET'])
def list_files():
    user_id = g.user['id']
    try:
        folder_id = request.args.get('folder_id', type=int)
        query = Fichier.query.filter_by(user_id=user_id)
        if 'folder_id' in request.args:
            query = query.filter_by(folder_id=folder_id)
        fichiers = query.all()
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
        folder_id = request.form.get('folder_id', type=int)

        if espace_id:
            from app.models.espace import Espace
            from app.models.membership import Membership
            espace_obj = Espace.query.get(espace_id)
            if espace_obj is None:
                return jsonify({'error': 'Espace introuvable'}), 404

            uid = g.user['id']
            is_espace_admin = (espace_obj.admin_id == uid)
            policy = espace_obj.upload_policy or 'tous'

            # Enforce espace quota if one is set (quota > 0 means limited)
            if espace_obj.quota and espace_obj.quota > 0:
                utilise_mb = sum(f.taille or 0 for f in Fichier.query.filter_by(espace_id=espace_id).all())
                utilise_gb = utilise_mb / 1024.0
                file_size_gb = file_size_mb / 1024.0
                if utilise_gb + file_size_gb > espace_obj.quota:
                    return jsonify({'error': f"Quota de l'espace dépassé ({espace_obj.quota:.2f} Go alloués)"}), 413

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
            folder_id=folder_id,
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

        sha256_init = hashlib.sha256(file_content).hexdigest()
        auteur_init = User.query.get(user_id)
        version = VersionFichier(
            numero_version=1,
            description=f'Version initiale — {auteur_init.nom if auteur_init else "utilisateur"}',
            chemin=file_path,
            sha256=sha256_init,
            auteur_id=user_id,
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

        if espace_id:
            from app.services.notifier import notifier_plusieurs
            from app.models.membership import Membership as _MS
            from app.models.espace import Espace as _ES
            _esp = _ES.query.get(espace_id)
            if _esp:
                _dest = [m.user_id for m in _MS.query.filter_by(espace_id=espace_id).all()]
                _dest.append(_esp.admin_id)
                _dest = [uid for uid in set(_dest) if uid != g.user['id']]
                notifier_plusieurs(
                    _dest,
                    'upload_espace',
                    f'Nouveau fichier "{fichier.nom}" dans l espace "{_esp.nom}"',
                    lien=f'/espace/{espace_id}'
                )

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


# ── GET /files/<fichier_id> ───────────────────────────────────────
# Returns metadata for a single file. Accessible to the owner, any user with
# an ACL entry on the file, and AdminGlobal.
@files_bp.route('/<int:fichier_id>', methods=['GET'])
def get_file(fichier_id):
    user_id = g.user['id']
    role    = g.user.get('role', '')

    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({'error': 'Fichier introuvable'}), 404

    # Access check: owner, AdminGlobal, or any ACL entry
    is_owner  = fichier.user_id == user_id
    is_admin  = role == 'AdminGlobal'
    has_acl   = ACL.query.filter_by(user_id=user_id, fichier_id=fichier_id).first() is not None

    if not (is_owner or is_admin or has_acl):
        return jsonify({'error': 'Accès refusé'}), 403

    return jsonify({
        'id':            fichier.id,
        'nom':           fichier.nom,
        'taille':        fichier.taille,
        'date_creation': fichier.date_creation.isoformat() if fichier.date_creation else None,
    }), 200


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

# ── GET /files/<fichier_id>/content ──────────────────────────────
# Returns the current file content as decoded UTF-8 text (for the in-browser editor).
# Requires lecture permission. Returns 415 if the file is not a text type.
_TEXT_EXTS = {
    'txt', 'md', 'html', 'css', 'js', 'jsx', 'ts', 'tsx',
    'csv', 'json', 'py', 'xml', 'yaml', 'yml', 'sh', 'ini',
    'cfg', 'log', 'env', 'java', 'c', 'cpp', 'h', 'hpp',
    'rb', 'go', 'rs', 'php', 'sql', 'scss', 'sass', 'htm',
}

@files_bp.route('/<int:fichier_id>/content', methods=['GET'])
@require_permission('lecture')
def get_file_content(fichier_id):
    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({'error': 'Fichier introuvable'}), 404

    ext = _ext(fichier.nom)
    if ext not in _TEXT_EXTS:
        return jsonify({'error': 'Type de fichier non éditable'}), 415

    if not fichier.chemin or not os.path.exists(fichier.chemin):
        return jsonify({'error': 'Binaire chiffré absent du disque'}), 404

    try:
        with open(fichier.chemin, 'rb') as fp:
            encrypted = fp.read()
        decrypted = decrypt_file(encrypted)
        try:
            text = decrypted.decode('utf-8')
        except UnicodeDecodeError:
            return jsonify({'error': 'Type de fichier non éditable'}), 415
        return jsonify({
            'content': text,
            'nom':     fichier.nom,
            'taille':  fichier.taille,
        }), 200
    except Exception as e:
        print(f'ERROR GET /files/{fichier_id}/content: {e}')
        return jsonify({'error': str(e)}), 500


@files_bp.route('/<int:fichier_id>/preview', methods=['GET'])
@require_permission('lecture')
def preview_file(fichier_id):
    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({'error': 'Fichier introuvable'}), 404
    if not fichier.chemin or not os.path.exists(fichier.chemin):
        return jsonify({'error': 'Fichier absent'}), 404

    ext = fichier.nom.rsplit('.', 1)[-1].lower() if '.' in fichier.nom else ''
    mime_map = {
        'pdf': 'application/pdf',
        'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'gif': 'image/gif', 'webp': 'image/webp',
        'txt': 'text/plain', 'md': 'text/plain',
        'html': 'text/html', 'css': 'text/css',
        'js': 'application/javascript',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'csv': 'text/csv',
    }
    mime = mime_map.get(ext, 'application/octet-stream')

    try:
        with open(fichier.chemin, 'rb') as fp:
            encrypted = fp.read()
        decrypted = decrypt_file(encrypted)
        return send_file(
            io.BytesIO(decrypted),
            mimetype=mime,
            as_attachment=False,
            download_name=fichier.nom,
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    
# ── DELETE /files/batch ──────────────────────────────────────────
@files_bp.route('/batch', methods=['DELETE'])
def delete_files_batch():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    user_id = g.user['id']
    data = request.get_json(silent=True) or {}
    ids = data.get('ids')

    if not isinstance(ids, list) or len(ids) == 0:
        return jsonify({'error': 'ids doit être une liste non vide d\'entiers'}), 400
    if len(ids) > 500:
        return jsonify({'error': 'Trop de fichiers (maximum 500 par requête)'}), 400

    from app.acl_engine import check_permission

    to_delete      = []   # dicts: id, taille_mb, chemin_principal, chemins_versions
    skipped        = []
    acquired_locks = {}

    try:
        for file_id in ids:
            if not isinstance(file_id, int):
                skipped.append({'id': file_id, 'raison': 'Identifiant invalide'})
                continue

            fichier = Fichier.query.get(file_id)
            if fichier is None:
                skipped.append({'id': file_id, 'raison': 'Fichier introuvable'})
                continue

            if not check_permission(user_id, file_id, 'suppression'):
                skipped.append({'id': file_id, 'raison': 'Accès refusé'})
                continue


            lock = get_file_lock(file_id)
            if not lock.acquire(blocking=False):
                skipped.append({'id': file_id, 'raison': "Fichier en cours d'utilisation"})
                continue
            acquired_locks[file_id] = lock

            chemin_principal = fichier.chemin
            chemins_versions = [
                v.chemin for v in fichier.versions
                if v.chemin and v.chemin != chemin_principal and os.path.exists(v.chemin)
            ]
            to_delete.append({
                'id':               fichier.id,
                'taille_mb':        fichier.taille or 0.0,
                'chemin_principal': chemin_principal,
                'chemins_versions': chemins_versions,
            })
            db.session.delete(fichier)  # cascade : versions + ACLs

        if to_delete:
            db.session.commit()  # un seul commit pour tous les fichiers

            total_mb = 0.0
            for item in to_delete:
                for chemin in item['chemins_versions']:
                    try:
                        os.remove(chemin)
                    except OSError:
                        pass
                if item['chemin_principal'] and os.path.exists(item['chemin_principal']):
                    try:
                        os.remove(item['chemin_principal'])
                    except OSError:
                        pass
                total_mb += item['taille_mb']
                log_action(user_id, 'suppression', resource_id=item['id'], statut='succes')

            if total_mb > 0:
                update_quota(user_id, total_mb, is_upload=False)

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        for lock in acquired_locks.values():
            lock.release()

    return jsonify({
        'deleted_count': len(to_delete),
        'skipped_count': len(skipped),
        'skipped':        skipped,
    }), 200


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
            'folder_id': f.folder_id,
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
        json_body = request.get_json(silent=True, force=True) if not uploaded else None

        # Accept either a multipart file upload or a JSON { content } body
        if uploaded:
            new_content = uploaded.read()
        elif json_body and 'content' in json_body:
            text_content = json_body['content']
            fichier_check = Fichier.query.get(fichier_id)
            if fichier_check is None:
                return jsonify({'error': 'Fichier introuvable'}), 404
            ext = fichier_check.nom.rsplit('.', 1)[-1].lower() if '.' in fichier_check.nom else ''
            if ext not in _TEXT_EXTS:
                return jsonify({'error': 'Type de fichier non éditable'}), 415
            new_content = text_content.encode('utf-8')
        else:
            return jsonify({'error': 'Champ file manquant'}), 400

        fichier = Fichier.query.get(fichier_id)
        if fichier is None:
            return jsonify({'error': 'Fichier introuvable'}), 404

        new_size_mb  = len(new_content) / (1024 * 1024)
        old_size_mb  = fichier.taille or 0.0
        sha256       = hashlib.sha256(new_content).hexdigest()
        owner_id     = fichier.user_id

        # ── No-op check: if content is identical to current file, skip versioning ──
        if fichier.chemin and os.path.exists(fichier.chemin):
            try:
                with open(fichier.chemin, 'rb') as fp:
                    current_sha256 = hashlib.sha256(decrypt_file(fp.read())).hexdigest()
                if current_sha256 == sha256:
                    return jsonify({
                        'message':        'Aucune modification détectée, version inchangée',
                        'sha256':         sha256,
                        'numero_version': (
                            db.session.query(db.func.max(VersionFichier.numero_version))
                            .filter_by(fichier_id=fichier_id).scalar()
                        ) or 1,
                    }), 200
            except Exception:
                pass  # if we can't read/decrypt, proceed with the update

        # Resolve author name for the version description
        auteur = User.query.get(user_id)
        auteur_nom = auteur.nom if auteur else f'user {user_id}'

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
            # On Windows os.rename fails if destination exists — remove it first
            if os.path.exists(archive_path):
                os.remove(archive_path)
            os.rename(fichier.chemin, archive_path)
        else:
            archive_path = fichier.chemin  # référence conservée même si absent

        version = VersionFichier(
            numero_version=next_num,
            description=f'Modifié par {auteur_nom}',
            chemin=archive_path,
            sha256=sha256,
            auteur_id=user_id,
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
