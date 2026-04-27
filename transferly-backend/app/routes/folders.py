from flask import Blueprint, request, jsonify, g
from app.models.folder import Folder  
from app.models.acl import ACL        
from app.extensions import db         

folders_bp = Blueprint('folders', __name__)


@folders_bp.route('/folders/', methods=['GET'])
def get_folders():

    user_id = g.user['id']
    fichiers = db.session.query(Folder)\
        .join(ACL, ACL.dossier_id == Folder.id)\
        .filter(ACL.user_id == user_id, ACL.lecture == True)\
        .all()
    result = []
    for f in fichiers :
        result.append({
            'id' : f.id,
            'nom' : f.nom,
        })
    return jsonify({'folders' : result}), 200
