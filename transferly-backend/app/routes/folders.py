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
