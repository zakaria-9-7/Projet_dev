# backend/app/routes/files.py
import os
import threading
import hashlib
from flask import Blueprint, request, jsonify, g
from app.routes.acl import require_permission  # Importé depuis le module d'Imane
from app.crypto import encrypt_file             # Importé depuis le module de Salma
# from app.models.fichier import Fichier
from app.routes.acl import require_permission # Importé depuis le module d'Imane
from app.services.crypto import encrypt_file # Importé depuis le module de Salma
# from app.models.file import File
# from app.models.version import VersionFichier
# from app import db

files_bp = Blueprint('files', __name__, url_prefix='/files')

# Dictionnaire global pour stocker les verrous en mémoire (Mutex)
file_locks = {}
lock_mutex = threading.Lock()

def get_file_lock(file_id):
    """Récupère ou crée un verrou thread-safe pour un fichier spécifique."""
    with lock_mutex:
        if file_id not in file_locks:
            file_locks[file_id] = threading.Lock()
        return file_locks[file_id]

@files_bp.route('/<int:file_id>', methods=['PUT'])
@require_permission('ecriture') # Vérifie l'ACL avant d'aller plus loin
def update_file(file_id):
    lock = get_file_lock(file_id)
    
    # Tentative d'acquisition du verrou (non-bloquant)
    if not lock.acquire(blocking=False):
        return jsonify({"error": "Erreur 423 : Ce fichier est en cours de modification par un autre utilisateur."}), 423
    
    try:
        uploaded_file = request.files.get('file')
        if not uploaded_file:
            return jsonify({"error": "Aucun fichier fourni"}), 400

        file_content = uploaded_file.read()
        sha256_hash = hashlib.sha256(file_content).hexdigest()
        
        # LOGIQUE DE VERSIONNEMENT (NE-01)
        # 1. Récupérer le fichier en base
        # 2. Archiver le binaire actuel (ex: rename en fichier_v1.enc)
        # 3. Créer une nouvelle entrée dans la table VersionFichier
        # 4. Chiffrer le nouveau file_content avec encrypt_file() et le sauvegarder
        # 5. Mettre à jour la base de données (db.session.commit())
        
        return jsonify({
            "message": "Fichier mis à jour avec succès, nouvelle version créée",
            "hash": sha256_hash
        }), 200

    except Exception as e:
        # db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        # Relâcher le verrou quoiqu'il arrive
        lock.release()

@files_bp.route('/<int:file_id>', methods=['DELETE'])
@require_permission('suppression')
def delete_file(file_id):
    """Supprime définitivement un fichier, son historique et les binaires chiffrés sur le disque."""
    lock = get_file_lock(file_id)
    
    # On verrouille le fichier pour s'assurer que personne ne le modifie pendant la suppression
    if not lock.acquire(blocking=False):
        return jsonify({"error": "Le fichier est en cours d'utilisation et ne peut être supprimé"}), 423
        
    try:
        # 1. Récupérer le fichier en base
        # fichier = File.query.get_or_404(file_id)
        # owner_id = fichier.owner_id
        # file_path = f"uploads/user_{owner_id}/{fichier.id}.enc"
        
        # 2. Supprimer les métadonnées (ACL associées, versions, et le fichier lui-même)
        # VersionFichier.query.filter_by(file_id=file_id).delete()
        # ACL.query.filter_by(file_id=file_id).delete()
        # db.session.delete(fichier)
        # db.session.commit()
        
        # 3. Supprimer les fichiers physiques chiffrés sur le disque (VM 2)
        # if os.path.exists(file_path):
        #     os.remove(file_path)
        # (Faire de même pour les anciens binaires de versions archivées)
        
        # 4. Logger l'action
        # log_action(g.user.id, "SUPPRESSION_FICHIER", file_id, "SUCCES", "Fichier et historique supprimés")
        
        return jsonify({"message": "Fichier supprimé définitivement"}), 200

    except Exception as e:
        # db.session.rollback()
        # log_action(g.user.id, "SUPPRESSION_FICHIER", file_id, "ECHEC", str(e))
        return jsonify({"error": str(e)}), 500
    finally:
        lock.release()
