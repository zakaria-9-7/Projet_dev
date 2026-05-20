import io
import os
from datetime import datetime
from flask import Blueprint, jsonify, g, send_file
from app.extensions import db
from app.models.fichier import Fichier
from app.models.version import VersionFichier
from app.models.user import User
from app.models.acl import ACL
from app.routes.acl import require_permission
from app.services.logger import log_action
from app.crypto import decrypt_file

versions_bp = Blueprint('versions', __name__, url_prefix='/files/<int:fichier_id>/versions')


# ── GET /files/<fichier_id>/versions/<numero_version>/content ────
@versions_bp.route('/<int:numero_version>/content', methods=['GET'])
@require_permission('lecture')
def get_version_content(fichier_id, numero_version):
    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({'error': 'Fichier introuvable'}), 404

    version = VersionFichier.query.filter_by(
        fichier_id=fichier_id,
        numero_version=numero_version,
    ).first()
    if version is None:
        return jsonify({'error': f'Version {numero_version} introuvable'}), 404

    if not _is_editable(fichier):
        return jsonify({'error': 'Type de fichier non éditable'}), 415

    if not version.chemin or not os.path.exists(version.chemin):
        return jsonify({'error': 'Binaire de la version absent du disque'}), 404

    try:
        with open(version.chemin, 'rb') as fp:
            encrypted = fp.read()
        decrypted = decrypt_file(encrypted)
        try:
            text = decrypted.decode('utf-8')
        except UnicodeDecodeError:
            return jsonify({'error': 'Type de fichier non éditable'}), 415
        return jsonify({
            'content':         text,
            'numero_version':  numero_version,
            'nom':             fichier.nom,
        }), 200
    except Exception as e:
        print(f'ERROR GET /files/{fichier_id}/versions/{numero_version}/content: {e}')
        return jsonify({'error': str(e)}), 500


# ── GET /files/<fichier_id>/versions/ ────────────────────────────
@versions_bp.route('/', methods=['GET'])
@require_permission('lecture')
def get_versions(fichier_id):
    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({'error': 'Fichier introuvable'}), 404

    versions = (
        VersionFichier.query
        .filter_by(fichier_id=fichier_id)
        .order_by(VersionFichier.numero_version.desc())
        .all()
    )

    data = [
        {
            'id':               v.id,
            'numero_version':   v.numero_version,
            'date_modification': v.date_modification.isoformat() if v.date_modification else None,
            'description':      v.description,
            'sha256':           v.sha256,
            'auteur_nom':       User.query.get(v.auteur_id).nom if v.auteur_id else None,
        }
        for v in versions
    ]

    # Compute ACL permission flags for the caller
    if g.user['role'] == 'AdminGlobal' or fichier.user_id == g.user['id']:
        # AdminGlobal and the file owner always have full permissions
        permissions = {'can_restore': True, 'can_preview': True, 'can_download': True}
    else:
        acl = ACL.query.filter_by(user_id=g.user['id'], fichier_id=fichier_id).first()
        if acl:
            permissions = {
                'can_restore':  bool(acl.ecriture),
                'can_preview':  bool(acl.lecture),
                'can_download': bool(acl.download),
            }
        else:
            permissions = {'can_restore': False, 'can_preview': False, 'can_download': False}

    return jsonify({'versions': data, 'permissions': permissions}), 200


# ── POST /files/<fichier_id>/versions/<numero_version>/restore ───
@versions_bp.route('/<int:numero_version>/restore', methods=['POST'])
@require_permission('ecriture')
def restore_version(fichier_id, numero_version):
    lock = get_file_lock(fichier_id)
    if not lock.acquire(blocking=False):
        return jsonify({'error': 'Fichier en cours de modification par un autre utilisateur'}), 423

    try:
        # 1. Version cible
        version_cible = VersionFichier.query.filter_by(
            fichier_id=fichier_id,
            numero_version=numero_version,
        ).first()
        if version_cible is None:
            return jsonify({'error': f'Version {numero_version} introuvable'}), 404

        # 2. Fichier courant
        fichier = Fichier.query.get(fichier_id)
        if fichier is None:
            return jsonify({'error': 'Fichier introuvable'}), 404

        if not version_cible.chemin or not os.path.exists(version_cible.chemin):
            return jsonify({'error': 'Binaire de la version absente du disque'}), 404

        # 3. Prochain numéro de version pour l'archivage de l'état courant
        max_num = (
            db.session.query(db.func.max(VersionFichier.numero_version))
            .filter_by(fichier_id=fichier_id)
            .scalar()
        ) or 0
        next_num = max_num + 1

        owner_id     = fichier.user_id
        current_path = fichier.chemin  # uploads/user_<owner_id>/<fichier_id>.enc
        archive_path = f'uploads/user_{owner_id}/{fichier_id}_v{next_num}.enc'

        # 4. Lit le binaire restauré avant de toucher au disque
        with open(version_cible.chemin, 'rb') as fp:
            contenu_restaure = fp.read()

        # 5. Archive le binaire courant
        if current_path and os.path.exists(current_path):
            os.rename(current_path, archive_path)
        else:
            archive_path = current_path  # rien à déplacer, conserve la référence

        nouvelle_version = VersionFichier(
            numero_version=next_num,
            description=f'État avant restauration de la v{numero_version}',
            chemin=archive_path,
            auteur_id=g.user['id'],
            fichier_id=fichier_id,
        )
        db.session.add(nouvelle_version)

        # 6. Écrit le binaire restauré à l'emplacement canonique
        with open(current_path, 'wb') as fp:
            fp.write(contenu_restaure)

        db.session.commit()

        log_action(
            g.user['id'], 'restore_version',
            resource_id=fichier_id,
            statut='succes',
            details=f'restaurée v{numero_version}',
        )
        return jsonify({
            'message': f'Version {numero_version} restaurée avec succès.',
            'nouvelle_version_archivee': next_num,
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f'ERROR POST /files/{fichier_id}/versions/{numero_version}/restore: {e}')
        log_action(
            g.user['id'], 'restore_version',
            resource_id=fichier_id,
            statut='echec',
            details=str(e),
        )
        return jsonify({'error': str(e)}), 500
    finally:
        lock.release()


# ── GET /files/<fichier_id>/versions/<numero_version>/preview ────
@versions_bp.route('/<int:numero_version>/preview', methods=['GET'])
@require_permission('lecture')
def preview_version(fichier_id, numero_version):
    version = VersionFichier.query.filter_by(
        fichier_id=fichier_id,
        numero_version=numero_version,
    ).first()
    if version is None:
        return jsonify({'error': 'Version introuvable'}), 404

    if not version.chemin or not os.path.exists(version.chemin):
        return jsonify({'error': 'Binaire de la version absente du disque'}), 404

    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({'error': 'Fichier introuvable'}), 404

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
        with open(version.chemin, 'rb') as fp:
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


# ── GET /files/<fichier_id>/versions/<numero_version>/download ───
@versions_bp.route('/<int:numero_version>/download', methods=['GET'])
@require_permission('download')
def download_version(fichier_id, numero_version):
    version = VersionFichier.query.filter_by(
        fichier_id=fichier_id,
        numero_version=numero_version,
    ).first()
    if version is None:
        return jsonify({'error': 'Version introuvable'}), 404

    if not version.chemin or not os.path.exists(version.chemin):
        return jsonify({'error': 'Binaire de la version absente du disque'}), 404

    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({'error': 'Fichier introuvable'}), 404

    try:
        with open(version.chemin, 'rb') as fp:
            encrypted = fp.read()
        decrypted = decrypt_file(encrypted)
        log_action(g.user['id'], 'download_version', resource_id=fichier_id, statut='succes')
        return send_file(
            io.BytesIO(decrypted),
            download_name=fichier.nom,
            as_attachment=True,
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
