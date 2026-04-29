"""
ZT-03 — Service de gestion de quota
Fichier : app/services/quota.py

Fournit les fonctions pour vérifier et mettre à jour le quota des utilisateurs.
"""

from app.extensions import db
from app.models.user import User

def check_quota(user_id: int, file_size_mb: float) -> bool:
    """
    Vérifie si l'ajout d'un fichier de taille `file_size_mb` dépasse le quota de l'utilisateur.
    Le quota est stocké en GB dans la BDD.
    """
    user = User.query.get(user_id)
    if not user:
        return False
        
    # Conversion mb -> gb
    file_size_gb = file_size_mb / 1024.0
    
    if (user.quota_utilise + file_size_gb) > user.quota:
        return False
    return True

def update_quota(user_id: int, file_size_mb: float, is_upload: bool = True) -> bool:
    """
    Met à jour la consommation du quota.
    is_upload=True ajoute la taille.
    is_upload=False soustrait la taille.
    """
    user = User.query.get(user_id)
    if not user:
        return False
        
    file_size_gb = file_size_mb / 1024.0
    
    if is_upload:
        if (user.quota_utilise + file_size_gb) > user.quota:
            return False # Ne devrait pas arriver si check_quota a été appelé avant
        user.quota_utilise += file_size_gb
    else:
        user.quota_utilise = max(0.0, user.quota_utilise - file_size_gb)
        
    db.session.commit()
    return True
