from flask import Blueprint, g, jsonify, request
from app.extensions import db
from app.models.folder import Folder
from app.models.fichier import Fichier

folders_bp = Blueprint('folders', __name__)

@folders_bp.route('/folders', methods=['GET'])
def list_folders():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    parent_id = request.args.get('parent_id', type=int)
    query = Folder.query.filter_by(user_id=g.user['id'])
    if parent_id:
        query = query.filter_by(parent_id=parent_id)
    else:
        query = query.filter_by(parent_id=None)
    folders = query.order_by(Folder.nom).all()
    return jsonify([{
        'id': f.id, 'nom': f.nom, 'parent_id': f.parent_id,
        'date_creation': f.date_creation.isoformat() if f.date_creation else None
    } for f in folders]), 200

@folders_bp.route('/folders', methods=['POST'])
def create_folder():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    data = request.get_json(silent=True) or {}
    nom = (data.get('nom') or '').strip()
    if not nom:
        return jsonify({'error': 'Nom du dossier requis'}), 400
    parent_id = data.get('parent_id')
    if parent_id:
        parent = Folder.query.filter_by(id=parent_id, user_id=g.user['id']).first()
        if not parent:
            return jsonify({'error': 'Dossier parent introuvable'}), 404
    folder = Folder(nom=nom, user_id=g.user['id'], parent_id=parent_id)
    db.session.add(folder)
    db.session.commit()
    return jsonify({'id': folder.id, 'nom': folder.nom, 'parent_id': folder.parent_id}), 201

@folders_bp.route('/folders/<int:folder_id>', methods=['PUT'])
def rename_folder(folder_id):
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    folder = Folder.query.filter_by(id=folder_id, user_id=g.user['id']).first()
    if not folder:
        return jsonify({'error': 'Dossier introuvable'}), 404
    data = request.get_json(silent=True) or {}
    nom = (data.get('nom') or '').strip()
    if not nom:
        return jsonify({'error': 'Nom requis'}), 400
    folder.nom = nom
    db.session.commit()
    return jsonify({'message': 'Dossier renommé', 'nom': folder.nom}), 200

@folders_bp.route('/folders/<int:folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    folder = Folder.query.filter_by(id=folder_id, user_id=g.user['id']).first()
    if not folder:
        return jsonify({'error': 'Dossier introuvable'}), 404
    Fichier.query.filter_by(folder_id=folder_id).update({'folder_id': None})
    Folder.query.filter_by(parent_id=folder_id).update({'parent_id': None})
    db.session.delete(folder)
    db.session.commit()
    return jsonify({'message': 'Dossier supprimé'}), 200

@folders_bp.route('/folders/move-files', methods=['PUT'])
def move_files_to_folder():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.get_json(silent=True) or {}
    fichier_ids = data.get('fichier_ids')
    folder_id = data.get('folder_id')

    if not isinstance(fichier_ids, list) or len(fichier_ids) == 0:
        return jsonify({'error': 'fichier_ids doit être une liste non vide d\'entiers'}), 400
    if len(fichier_ids) > 500:
        return jsonify({'error': 'Trop de fichiers (maximum 500 par requête)'}), 400

    if folder_id is not None:
        folder = Folder.query.filter_by(id=folder_id, user_id=g.user['id']).first()
        if not folder:
            return jsonify({'error': 'Dossier introuvable'}), 404

    moved   = 0
    skipped = []

    for fid in fichier_ids:
        if not isinstance(fid, int):
            skipped.append({'id': fid, 'raison': 'Identifiant invalide'})
            continue
        fichier = Fichier.query.filter_by(id=fid, user_id=g.user['id']).first()
        if not fichier:
            skipped.append({'id': fid, 'raison': 'Fichier introuvable ou accès refusé'})
            continue
        fichier.folder_id = folder_id
        moved += 1

    db.session.commit()

    return jsonify({
        'moved_count':   moved,
        'skipped_count': len(skipped),
        'skipped':        skipped,
        'folder_id':      folder_id,
    }), 200


@folders_bp.route('/folders/move-file', methods=['PUT'])
def move_file_to_folder():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    data = request.get_json(silent=True) or {}
    fichier_id = data.get('fichier_id')
    folder_id = data.get('folder_id')
    fichier = Fichier.query.filter_by(id=fichier_id, user_id=g.user['id']).first()
    if not fichier:
        return jsonify({'error': 'Fichier introuvable'}), 404
    if folder_id:
        folder = Folder.query.filter_by(id=folder_id, user_id=g.user['id']).first()
        if not folder:
            return jsonify({'error': 'Dossier introuvable'}), 404
    fichier.folder_id = folder_id
    db.session.commit()
    return jsonify({'message': 'Fichier déplacé'}), 200
