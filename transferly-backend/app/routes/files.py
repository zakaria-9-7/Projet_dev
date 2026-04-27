"""
IE-03 — Upload de fichier
IE-04 — Download de fichier
IE-05 — Partage de fichier

Fichier : app/routes/files.py

Adapté au middleware de Salma :
  - g.user dict avec 'id' et 'role' (pas g.current_user)
  - Fichier (pas File) avec colonnes : nom, taille, chemin, user_id, espace_id
  - User.quota et User.quota_utilise en Go
  - crypto.py : encrypt_file() et decrypt_file()
  - VersionFichier : numero_version, date_modification, description, chemin, fichier_id
"""

import os
import io
import hashlib
import mimetypes
from datetime import datetime
from flask import Blueprint, request, jsonify, g, send_file
from app.extensions import db
from app.models.fichier import Fichier
from app.models.acl import ACL
from app.models.user import User
from app.models.log import Log
from app.models.version import VersionFichier
from app.crypto import encrypt_file, decrypt_file
from app.acl_engine import require_permission, grant_owner_permissions

files_bp = Blueprint("files", __name__, url_prefix="/files")

# ── Extensions refusées ───────────────────────────────────────────
BLOCKED_EXTENSIONS = {
    ".exe", ".sh", ".bat", ".cmd", ".msi",
    ".ps1", ".vbs", ".jar", ".php"
}
BLOCKED_MIMES = {
    "application/x-msdownload",
    "application/x-executable",
    "application/x-sh",
    "application/x-bat",
}

DEFAULT_QUOTA_GO = 2.0


def _get_current_user():
    """
    Récupère l'utilisateur connecté depuis g.user (middleware Salma).
    g.user = {'id': ..., 'role': ..., 'email': ...}
    Retourne un objet User SQLAlchemy ou None.
    """
    if not hasattr(g, 'user') or g.user is None:
        return None
    return User.query.get(g.user['id'])


# ══════════════════════════════════════════════════════════════════
# IE-03 — POST /files/upload
# ══════════════════════════════════════════════════════════════════

@files_bp.route("/upload", methods=["POST"])
def upload_file():
    user = _get_current_user()
    if user is None:
        return jsonify({"error": "Non authentifié"}), 401

    if "file" not in request.files:
        return jsonify({"error": "Champ 'file' manquant"}), 400

    uploaded = request.files["file"]
    if not uploaded.filename:
        return jsonify({"error": "Nom de fichier vide"}), 400

    espace_id = request.form.get("espace_id", type=int)
    filename = uploaded.filename
    _, ext = os.path.splitext(filename.lower())

    # Validation extension
    if ext in BLOCKED_EXTENSIONS:
        _log(user.id, f"UPLOAD_REFUSE_EXT:{ext}", "echec")
        return jsonify({"error": f"Extension '{ext}' refusée"}), 415

    # Lecture du binaire
    file_bytes = uploaded.read()
    detected_mime = _detect_mime(file_bytes, filename)

    if detected_mime in BLOCKED_MIMES:
        _log(user.id, f"UPLOAD_REFUSE_MIME:{detected_mime}", "echec")
        return jsonify({"error": f"Type MIME '{detected_mime}' non autorisé"}), 415

    # Vérification quota (en Go)
    file_size_bytes = len(file_bytes)
    file_size_go = file_size_bytes / (1024 ** 3)
    quota_max = user.quota if user.quota else DEFAULT_QUOTA_GO
    quota_utilise = user.quota_utilise if user.quota_utilise else 0.0

    if quota_utilise + file_size_go > quota_max:
        _log(user.id, "UPLOAD_REFUSE_QUOTA", "echec")
        return jsonify({
            "error": "Quota de stockage dépassé",
            "quota_max_go": quota_max,
            "quota_utilise_go": round(quota_utilise, 4),
            "fichier_taille_go": round(file_size_go, 6)
        }), 507

    # Chiffrement
    encrypted_bytes = encrypt_file(file_bytes)

    # Sauvegarde sur disque
    upload_root = os.environ.get("UPLOAD_ROOT", "uploads")
    user_dir = os.path.join(upload_root, f"user_{user.id}")
    os.makedirs(user_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    stored_name = f"{timestamp}_{filename}.enc"
    stored_path = os.path.join(user_dir, stored_name)

    with open(stored_path, "wb") as f:
        f.write(encrypted_bytes)

    # Enregistrement en base
    new_fichier = Fichier(
        nom=filename,
        taille=float(file_size_bytes),
        chemin=stored_path,
        user_id=user.id,
        espace_id=espace_id,
        date_creation=datetime.utcnow()
    )
    db.session.add(new_fichier)
    db.session.flush()

    # Permissions propriétaire
    grant_owner_permissions(user.id, new_fichier.id)

    # Version initiale v1
    _create_version_initiale(new_fichier.id, stored_path, file_bytes)

    # Mise à jour quota
    user.quota_utilise = quota_utilise + file_size_go
    db.session.commit()

    _log(user.id, f"UPLOAD:fichier_{new_fichier.id}:{filename}", "succes")

    return jsonify({
        "message": "Fichier uploadé avec succès",
        "fichier": {
            "id": new_fichier.id,
            "nom": new_fichier.nom,
            "taille": new_fichier.taille,
            "date_creation": new_fichier.date_creation.isoformat(),
            "version": 1
        }
    }), 201


# ══════════════════════════════════════════════════════════════════
# IE-04 — GET /files/<fichier_id>/download
# ══════════════════════════════════════════════════════════════════

@files_bp.route("/<int:fichier_id>/download", methods=["GET"])
@require_permission("download")
def download_file(fichier_id):
    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({"error": "Fichier introuvable"}), 404

    if not fichier.chemin or not os.path.exists(fichier.chemin):
        return jsonify({"error": "Fichier introuvable sur le disque"}), 500

    with open(fichier.chemin, "rb") as f:
        encrypted_bytes = f.read()

    try:
        clear_bytes = decrypt_file(encrypted_bytes)
    except Exception:
        return jsonify({"error": "Erreur de déchiffrement"}), 500

    user = _get_current_user()
    if user:
        _log(user.id, f"DOWNLOAD:fichier_{fichier_id}", "succes")

    content_type, _ = mimetypes.guess_type(fichier.nom)
    content_type = content_type or "application/octet-stream"

    return send_file(
        io.BytesIO(clear_bytes),
        mimetype=content_type,
        as_attachment=True,
        download_name=fichier.nom
    )


# ══════════════════════════════════════════════════════════════════
# IE-05 — POST /files/<fichier_id>/share
# ══════════════════════════════════════════════════════════════════

@files_bp.route("/<int:fichier_id>/share", methods=["POST"])
@require_permission("partage")
def share_file(fichier_id):
    user = _get_current_user()
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Corps JSON manquant"}), 400

    target_user_id = data.get("target_user_id")
    permissions_demandees = data.get("permissions", {})

    if not target_user_id:
        return jsonify({"error": "Champ 'target_user_id' obligatoire"}), 422

    fichier = Fichier.query.get(fichier_id)
    if fichier is None:
        return jsonify({"error": "Fichier introuvable"}), 404

    target = User.query.get(target_user_id)
    if target is None:
        return jsonify({"error": "Utilisateur cible introuvable"}), 404

    if target_user_id == user.id:
        return jsonify({"error": "Impossible de partager avec soi-même"}), 400

    caller_acl = ACL.query.filter_by(
        user_id=user.id, fichier_id=fichier_id
    ).first()

    permissions_accordees = {}
    for perm in ["lecture", "ecriture", "upload", "download", "suppression", "partage"]:
        demande = bool(permissions_demandees.get(perm, False))
        caller_a = bool(getattr(caller_acl, perm, False)) if caller_acl else False
        if user.role == "AdminGlobal":
            permissions_accordees[perm] = demande
        else:
            permissions_accordees[perm] = demande and caller_a

    existing_acl = ACL.query.filter_by(
        user_id=target_user_id, fichier_id=fichier_id
    ).first()

    if existing_acl:
        for perm, val in permissions_accordees.items():
            setattr(existing_acl, perm, val)
    else:
        new_acl = ACL(
            user_id=target_user_id,
            fichier_id=fichier_id,
            **permissions_accordees
        )
        db.session.add(new_acl)

    db.session.commit()
    _log(user.id, f"SHARE:fichier_{fichier_id}:vers_user_{target_user_id}", "succes")

    return jsonify({
        "message": f"Fichier partagé avec {target.nom}",
        "destinataire": {
            "id": target.id,
            "nom": target.nom,
            "email": target.email
        },
        "permissions_accordees": permissions_accordees
    }), 200


# ══════════════════════════════════════════════════════════════════
# GET /files/ — Mes fichiers
# ══════════════════════════════════════════════════════════════════

@files_bp.route("/", methods=["GET"])
def list_my_files():
    user = _get_current_user()
    if user is None:
        return jsonify({"error": "Non authentifié"}), 401

    fichiers = Fichier.query.filter_by(user_id=user.id)\
        .order_by(Fichier.date_creation.desc()).all()
    return jsonify([_fichier_to_dict(f) for f in fichiers]), 200


# ══════════════════════════════════════════════════════════════════
# GET /files/shared-with-me — Partagés avec moi
# ══════════════════════════════════════════════════════════════════

@files_bp.route("/shared-with-me", methods=["GET"])
def shared_with_me():
    user = _get_current_user()
    if user is None:
        return jsonify({"error": "Non authentifié"}), 401

    acl_entries = ACL.query.filter_by(user_id=user.id).all()
    result = []
    for entry in acl_entries:
        fichier = Fichier.query.get(entry.fichier_id)
        if fichier is None or fichier.user_id == user.id:
            continue
        fichier_dict = _fichier_to_dict(fichier)
        fichier_dict["mes_permissions"] = {
            "lecture":     entry.lecture,
            "ecriture":    entry.ecriture,
            "upload":      entry.upload,
            "download":    entry.download,
            "suppression": entry.suppression,
            "partage":     entry.partage,
        }
        result.append(fichier_dict)

    return jsonify(result), 200


# ── Helpers ───────────────────────────────────────────────────────

def _detect_mime(file_bytes: bytes, filename: str) -> str:
    try:
        import magic
        return magic.from_buffer(file_bytes, mime=True)
    except ImportError:
        mime, _ = mimetypes.guess_type(filename)
        return mime or "application/octet-stream"


def _create_version_initiale(fichier_id: int, chemin: str, file_bytes: bytes):
    try:
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        v1 = VersionFichier(
            fichier_id=fichier_id,
            numero_version=1,
            date_modification=datetime.utcnow(),
            description=f"Version initiale — SHA256: {sha256[:16]}…",
            chemin=chemin
        )
        db.session.add(v1)
    except Exception:
        pass


def _log(user_id: int, action: str, statut: str):
    try:
        log = Log(
            user_id=user_id,
            action=action,
            statut=statut,
            date=datetime.utcnow()
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        pass


def _fichier_to_dict(f: Fichier) -> dict:
    return {
        "id": f.id,
        "nom": f.nom,
        "taille": f.taille,
        "chemin": f.chemin,
        "user_id": f.user_id,
        "espace_id": f.espace_id,
        "date_creation": f.date_creation.isoformat() if f.date_creation else None,
    }