# backend/app/routes/versions.py

from flask import Blueprint, jsonify, g
from datetime import datetime
from app.routes.acl import require_permission
from app.models.version import VersionFichier
from app.models.file import File
from app.services.logger import log_action
from app import db

versions_bp = Blueprint('versions', __name__, url_prefix='/files/<int:file_id>/versions')

@versions_bp.route('/', methods=['GET'])
@require_permission('lecture')
def get_versions(file_id):
    """Retourne l'historique des versions d'un fichier (Tâche NE-02)."""
    versions = VersionFichier.query.filter_by(file_id=file_id).order_by(VersionFichier.numeroVersion.desc()).all()
    
    if not versions:
        return jsonify([]), 200
    
    data = [
        {
            "numeroVersion": v.numeroVersion,
            "date": v.date,
            "auteur": v.auteur,
            "taille": v.taille,
            "sha256": v.sha256
        }
        for v in versions
    ]
    return jsonify(data), 200

@versions_bp.route('/<int:numero_version>/restore', methods=['POST'])
@require_permission('ecriture')
def restore_version(file_id, numero_version):
    """Restaure une version antérieure du fichier (Tâche NE-02)."""
    try:
        # 1. Vérifier que la version existe
        version_to_restore = VersionFichier.query.filter_by(
            file_id=file_id, 
            numeroVersion=numero_version
        ).first()
        
        if not version_to_restore:
            return jsonify({"error": "Version non trouvée"}), 404
        
        # 2. Récupérer le fichier courant
        fichier = File.query.get(file_id)
        if not fichier:
            return jsonify({"error": "Fichier non trouvé"}), 404
        
        # 3. Le binaire de la version <numero_version> devient le binaire courant
        fichier.binaire = version_to_restore.binaire
        fichier.sha256 = version_to_restore.sha256
        
        # 4. Créer une NOUVELLE version (ex: v3) qui est une copie exacte de la version restaurée
        nouvelle_version = VersionFichier(
            file_id=file_id,
            numeroVersion=max([v.numeroVersion for v in fichier.versions]) + 1,
            binaire=version_to_restore.binaire,
            taille=version_to_restore.taille,
            sha256=version_to_restore.sha256,
            auteur=g.user_id,  # L'utilisateur courant
            date=datetime.now()
        )
        
        db.session.add(nouvelle_version)
        db.session.commit()
        
        # 5. Logger l'action de restauration
        log_action(
            user_id=g.user_id,
            action="RESTORE_VERSION",
            file_id=file_id,
            details=f"Restauration de la version {numero_version}"
        )
        
        return jsonify({"message": f"La version {numero_version} a été restaurée avec succès."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500