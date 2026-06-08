from flask import Blueprint, g, jsonify, request
from app.extensions import db
from app.models.folder import Folder
from app.models.fichier import Fichier

folders_bp = Blueprint('folders', __name__)


def _is_espace_admin(user_id, user_role, espace_id):
    """Retourne True si l'utilisateur est AdminGlobal, admin de l'espace
    (via Espace.admin_id), ou membre avec rôle 'admin'."""
    from app.models.espace import Espace
    from app.models.membership import Membership
    if user_role == 'AdminGlobal':
        return True
    espace = Espace.query.get(espace_id)
    if espace and espace.admin_id == user_id:
        return True
    membership = Membership.query.filter_by(user_id=user_id, espace_id=espace_id).first()
    return membership is not None and membership.role == 'admin'


@folders_bp.route('/folders', methods=['GET'])
def list_folders():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    user_id   = g.user['id']
    user_role = g.user.get('role', '')
    espace_id = request.args.get('espace_id', type=int)
    parent_id = request.args.get('parent_id', type=int)
    fetch_all = request.args.get('all', type=int)

    if espace_id is not None:
        # Dossiers d'un espace : accessible à tout membre
        from app.models.espace import Espace
        from app.models.membership import Membership
        espace = Espace.query.get(espace_id)
        if espace is None:
            return jsonify({'error': 'Espace introuvable'}), 404
        is_member = (
            user_role == 'AdminGlobal'
            or espace.admin_id == user_id
            or Membership.query.filter_by(user_id=user_id, espace_id=espace_id).first() is not None
        )
        if not is_member:
            return jsonify({'error': 'Accès refusé'}), 403
        query = Folder.query.filter_by(espace_id=espace_id)
    else:
        # Dossiers personnels (espace_id NULL)
        query = Folder.query.filter_by(user_id=user_id, espace_id=None)

    if not fetch_all:
        # Par défaut : un seul niveau (pour la navigation paresseuse)
        if parent_id:
            query = query.filter_by(parent_id=parent_id)
        else:
            query = query.filter_by(parent_id=None)

    folders = query.order_by(Folder.nom).all()
    return jsonify([{
        'id':           f.id,
        'nom':          f.nom,
        'parent_id':    f.parent_id,
        'espace_id':    f.espace_id,
        'date_creation': f.date_creation.isoformat() if f.date_creation else None,
    } for f in folders]), 200


@folders_bp.route('/folders', methods=['POST'])
def create_folder():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    data      = request.get_json(silent=True) or {}
    nom       = (data.get('nom') or '').strip()
    if not nom:
        return jsonify({'error': 'Nom du dossier requis'}), 400

    user_id   = g.user['id']
    user_role = g.user.get('role', '')
    espace_id = data.get('espace_id')
    parent_id = data.get('parent_id')

    if espace_id is not None:
        # Dossier d'espace : réservé aux admins
        if not _is_espace_admin(user_id, user_role, espace_id):
            return jsonify({'error': "Action réservée aux administrateurs de l'espace"}), 403
        if parent_id:
            parent = Folder.query.filter_by(id=parent_id, espace_id=espace_id).first()
            if not parent:
                return jsonify({'error': 'Dossier parent introuvable'}), 404
    else:
        # Dossier personnel
        if parent_id:
            parent = Folder.query.filter_by(id=parent_id, user_id=user_id).first()
            if not parent:
                return jsonify({'error': 'Dossier parent introuvable'}), 404

    folder = Folder(nom=nom, user_id=user_id, parent_id=parent_id, espace_id=espace_id)
    db.session.add(folder)
    db.session.commit()
    return jsonify({
        'id':        folder.id,
        'nom':       folder.nom,
        'parent_id': folder.parent_id,
        'espace_id': folder.espace_id,
    }), 201


@folders_bp.route('/folders/<int:folder_id>', methods=['PUT'])
def rename_folder(folder_id):
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    user_id   = g.user['id']
    user_role = g.user.get('role', '')

    folder = Folder.query.get(folder_id)
    if not folder:
        return jsonify({'error': 'Dossier introuvable'}), 404

    if folder.espace_id is not None:
        if not _is_espace_admin(user_id, user_role, folder.espace_id):
            return jsonify({'error': "Action réservée aux administrateurs de l'espace"}), 403
    else:
        if folder.user_id != user_id:
            return jsonify({'error': 'Dossier introuvable'}), 404

    data = request.get_json(silent=True) or {}
    nom  = (data.get('nom') or '').strip()
    if not nom:
        return jsonify({'error': 'Nom requis'}), 400
    folder.nom = nom
    db.session.commit()
    return jsonify({'message': 'Dossier renommé', 'nom': folder.nom}), 200


@folders_bp.route('/folders/<int:folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    import os as _os
    from app.services.quota import update_quota

    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    user_id   = g.user['id']
    user_role = g.user.get('role', '')

    folder = Folder.query.get(folder_id)
    if not folder:
        return jsonify({'error': 'Dossier introuvable'}), 404

    if folder.espace_id is not None:
        if not _is_espace_admin(user_id, user_role, folder.espace_id):
            return jsonify({'error': "Action réservée aux administrateurs de l'espace"}), 403
    else:
        if folder.user_id != user_id:
            return jsonify({'error': 'Dossier introuvable'}), 404

    # 1. BFS : collecter tous les sous-dossiers et fichiers de la descendance
    all_fichiers   = []
    all_subfolders = []
    stack = [folder_id]
    while stack:
        fid = stack.pop()
        all_fichiers.extend(Fichier.query.filter_by(folder_id=fid).all())
        children = Folder.query.filter_by(parent_id=fid).all()
        for child in children:
            all_subfolders.append(child)
            stack.append(child.id)

    # 2. Pré-collecter les infos disque AVANT toute suppression DB
    disk_info = []
    for f in all_fichiers:
        versions_chemins = [
            v.chemin for v in f.versions
            if v.chemin and v.chemin != f.chemin and _os.path.exists(v.chemin)
        ]
        disk_info.append({
            'chemin':           f.chemin,
            'versions_chemins': versions_chemins,
            'taille_mb':        f.taille or 0.0,
            'user_id':          f.user_id,
        })

    # 3. Supprimer tout de la session (cascade SQLAlchemy : versions + ACLs)
    for f in all_fichiers:
        db.session.delete(f)
# Supprimer les sous-dossiers du plus profond au moins profond
# (all_subfolders est déjà dans l'ordre BFS, donc reversed() donne les feuilles en premier)
    for sub in reversed(all_subfolders):
        db.session.delete(sub)
    db.session.delete(folder)


    # 4. Un seul commit
    db.session.commit()

    # 5. Nettoyage disque et quota post-commit
    for info in disk_info:
        for chemin in info['versions_chemins']:
            try:
                _os.remove(chemin)
            except OSError:
                pass
        if info['chemin'] and _os.path.exists(info['chemin']):
            try:
                _os.remove(info['chemin'])
            except OSError:
                pass
        if info['taille_mb'] > 0:
            update_quota(info['user_id'], info['taille_mb'], is_upload=False)

    return jsonify({'message': 'Dossier supprimé'}), 200


@folders_bp.route('/folders/move-files', methods=['PUT'])
def move_files_to_folder():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    user_id   = g.user['id']
    user_role = g.user.get('role', '')
    data        = request.get_json(silent=True) or {}
    fichier_ids = data.get('fichier_ids')
    folder_id   = data.get('folder_id')
    espace_id   = data.get('espace_id')

    if not isinstance(fichier_ids, list) or len(fichier_ids) == 0:
        return jsonify({'error': "fichier_ids doit être une liste non vide d'entiers"}), 400
    if len(fichier_ids) > 500:
        return jsonify({'error': 'Trop de fichiers (maximum 500 par requête)'}), 400

    moved   = 0
    skipped = []

    if espace_id is not None:
        # ── Contexte espace collaboratif ──────────────────────────────
        if folder_id is not None:
            folder = Folder.query.get(folder_id)
            if not folder or folder.espace_id != espace_id:
                return jsonify({'error': 'Dossier introuvable dans cet espace'}), 404

        for fid in fichier_ids:
            if not isinstance(fid, int):
                skipped.append({'id': fid, 'raison': 'Identifiant invalide'})
                continue
            fichier = Fichier.query.get(fid)
            if not fichier:
                skipped.append({'id': fid, 'raison': 'Fichier introuvable'})
                continue
            if fichier.espace_id != espace_id:
                skipped.append({'id': fid, 'raison': 'Fichier hors de l\'espace'})
                continue
            is_owner = (fichier.user_id == user_id)
            is_admin = _is_espace_admin(user_id, user_role, espace_id)
            if not (is_owner or is_admin):
                skipped.append({'id': fid, 'raison': 'Permission refusée'})
                continue
            fichier.folder_id = folder_id
            moved += 1

    else:
        # ── Contexte personnel (logique inchangée) ────────────────────
        if folder_id is not None:
            folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
            if not folder:
                return jsonify({'error': 'Dossier introuvable'}), 404

        for fid in fichier_ids:
            if not isinstance(fid, int):
                skipped.append({'id': fid, 'raison': 'Identifiant invalide'})
                continue
            fichier = Fichier.query.filter_by(id=fid, user_id=user_id).first()
            if not fichier:
                skipped.append({'id': fid, 'raison': 'Fichier introuvable ou accès refusé'})
                continue
            fichier.folder_id = folder_id
            fichier.espace_id = folder.espace_id if (folder_id and folder) else None
            moved += 1

    db.session.commit()

    return jsonify({
        'moved_count':   moved,
        'skipped_count': len(skipped),
        'skipped':       skipped,
        'folder_id':     folder_id,
        'espace_id':     espace_id,
    }), 200


@folders_bp.route('/folders/move-file', methods=['PUT'])
def move_file_to_folder():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    data       = request.get_json(silent=True) or {}
    fichier_id = data.get('fichier_id')
    folder_id  = data.get('folder_id')
    espace_id  = data.get('espace_id')
    fichier    = Fichier.query.filter_by(id=fichier_id, user_id=g.user['id']).first()
    if not fichier:
        return jsonify({'error': 'Fichier introuvable'}), 404
    if folder_id:
        folder = Folder.query.get(folder_id)
        if not folder:
            return jsonify({'error': 'Dossier introuvable'}), 404
        # Vérifier que le dossier appartient au même contexte que le fichier
        if folder.espace_id != espace_id:
            return jsonify({'error': 'Dossier incompatible avec le contexte du fichier'}), 400

    fichier.folder_id = folder_id
    fichier.espace_id = espace_id  # ← AJOUTER : toujours préserver l'espace d'origine
    db.session.commit()
    return jsonify({'message': 'Fichier déplacé'}), 200



