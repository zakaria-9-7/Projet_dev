from flask import Blueprint, request, jsonify, g 
from app.routes.acl import require_permission

folders_bp = Blueprint('folders', __name__, url_prefix='/folders')

@folders_bp.route('/', methods=['POST'])
@require_permission('upload')

def create_folder():

    data = request.get_json()
    nom = data.get('nom')
    espace_id = data.get('espace_id')
    parent_id = data.get('parent_id',None)

    if not nom or not espace_id:
        return jsonify({"error": "Le nom et l'ID de l'espace sont requis"}), 400
    
    try:

        return jsonify({"message": f"Dossier '{nom}' créé avec succès"}), 201
    
    except Exception as e: 

        return jsonify({"error": str(e)}), 500
    

@folders_bp.route('/<int:folder_id>', methods=['PUT'])
@require_permission('ecriture')
def rename_folder(folder_id):
    """Renomme un dossier existant."""
    data = request.get_json()
    nouveau_nom = data.get('nom')

    if not nouveau_nom:
        return jsonify({"error": "Le nouveau nom est requis"}), 400

    try:
        # dossier = Folder.query.get_or_404(folder_id)
        # ancien_nom = dossier.nom
        # dossier.nom = nouveau_nom
        # db.session.commit()
        
        # log_action(g.user.id, "MODIFICATION_DOSSIER", folder_id, "SUCCES", f"'{ancien_nom}' renommé en '{nouveau_nom}'")
        
        return jsonify({"message": "Dossier renommé avec succès"}), 200
    except Exception as e:
        # db.session.rollback()
        return jsonify({"error": str(e)}), 500

@folders_bp.route('/<int:folder_id>', methods=['DELETE'])
@require_permission('suppression')
def delete_folder(folder_id):
    """Supprime un dossier (et potentiellement son contenu selon la logique métier)."""
    try:
        # dossier = Folder.query.get_or_404(folder_id)
        # nom = dossier.nom
        # db.session.delete(dossier)
        # db.session.commit()
        
        # log_action(g.user.id, "SUPPRESSION_DOSSIER", folder_id, "SUCCES", f"Dossier '{nom}' supprimé")
        
        return jsonify({"message": "Dossier supprimé avec succès"}), 200
    except Exception as e:
        # db.session.rollback()
        return jsonify({"error": str(e)}), 500