from flask import Blueprint, request, jsonify, g
from app.extensions import db, bcrypt
from app.models.user import User
from app.models.otp import OTP
from app.models.log import Log
import jwt, os, re, pyotp
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

MAX_TENTATIVES = 5

# ── SD-02 : Inscription ──────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    nom = data.get('nom', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    role = data.get('role', 'Utilisateur')

    if not nom or not email or not password:
        return jsonify({'error': 'Champs manquants'}), 400
    if not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', email):
        return jsonify({'error': 'Format email invalide'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Mot de passe trop court (min 8 caractères)'}), 400
    # Seul Utilisateur autorisé à l'inscription publique
    # AdminEspace = promotion automatique lors de la création d'un espace
    # AdminGlobal = uniquement par seed ou promotion par un AdminGlobal existant
    if role != 'Utilisateur':
        return jsonify({'error': 'Inscription publique réservée au rôle Utilisateur'}), 403
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email déjà utilisé'}), 409

    hashed = bcrypt.generate_password_hash(password).decode('utf-8')
    user = User(nom=nom, email=email, password=hashed, role=role)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Compte créé avec succès'}), 201


# ── SD-03 : Connexion + envoi OTP ────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '')
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({'error': 'Identifiants incorrects'}), 401

    if user.statut == 'bloque':
        return jsonify({'error': 'Compte temporairement bloqué'}), 403

    # Génère OTP valide 5 min
    code = pyotp.TOTP(pyotp.random_base32(), interval=300).now()
    expiration = datetime.utcnow() + timedelta(minutes=5)

    # Supprime anciens OTPs
    OTP.query.filter_by(user_id=user.id).delete()

    otp_entry = OTP(code=code, date_expiration=expiration, user_id=user.id)
    db.session.add(otp_entry)
    db.session.commit()

    print(f"[DEV] OTP pour {user.email} : {code}")

    return jsonify({
        'message': 'OTP généré',
        'user_id': user.id,
        'otp_dev': code  # ⚠️ MODE DEV : on renvoie le code directement
    }), 200


# ── SD-04 : Vérification OTP + JWT ──────────────────────────────
@auth_bp.route('/mfa/verify', methods=['POST'])
def verify_otp():
    data = request.get_json()
    user_id = data.get('user_id')
    code = data.get('code', '').strip()

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Utilisateur inexistant'}), 404

    otp = OTP.query.filter_by(user_id=user_id).order_by(OTP.id.desc()).first()

    if not otp:
        return jsonify({'error': 'Aucun OTP demandé'}), 400

    if otp.tentatives >= MAX_TENTATIVES:
        user.statut = 'bloque'
        db.session.delete(otp)
        db.session.commit()
        return jsonify({'error': 'Trop de tentatives, compte bloqué'}), 403

    if otp.date_expiration < datetime.utcnow():
        db.session.delete(otp)
        db.session.commit()
        return jsonify({'error': 'OTP expiré'}), 401

    if otp.code != code:
        otp.tentatives += 1
        db.session.commit()
        restantes = MAX_TENTATIVES - otp.tentatives
        return jsonify({'error': f'Code incorrect, {restantes} tentative(s) restante(s)'}), 401

    # OTP valide → génère JWT
    token = jwt.encode({
        'user_id': user.id,
        'role': user.role,
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(hours=2)
    }, os.getenv('SECRET_KEY', 'devsecret'), algorithm='HS256')

    db.session.delete(otp)

    log = Log(action='connexion', statut='succes', user_id=user.id)
    db.session.add(log)
    db.session.commit()

    return jsonify({'token': token, 'role': user.role, 'nom': user.nom, 'email': user.email}), 200


# ── SD-04 : Logout ───────────────────────────────────────────────
@auth_bp.route('/logout', methods=['POST'])
def logout():
    user = getattr(g, 'user', None)
    if user:
        log = Log(action='deconnexion', statut='succes', user_id=user['id'])
        db.session.add(log)
        db.session.commit()
    return jsonify({'message': 'Déconnecté'}), 200


# ══════════════════════════════════════════════════════════════════
# ZT-04 — Reset mot de passe sécurisé (HMAC + email)
# ══════════════════════════════════════════════════════════════════

import time
import hmac
import hashlib

RESET_TOKEN_TTL = 15 * 60

def _generate_reset_token(user_id: int, email: str) -> str:
    secret = os.getenv('SECRET_KEY', 'devsecret').encode()
    expiry = int(time.time()) + RESET_TOKEN_TTL
    payload = f"{expiry}.{user_id}.{email}"
    sig = hmac.new(secret, payload.encode(), hashlib.sha256).hexdigest()
    return f"{expiry}.{user_id}.{sig}"

def _verify_reset_token(token: str):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None, 'Token malformé'

        expiry_str, user_id_str, received_sig = parts
        expiry = int(expiry_str)
        user_id = int(user_id_str)

        if int(time.time()) > expiry:
            return None, 'Token expiré'

        user = User.query.get(user_id)
        if not user:
            return None, 'Utilisateur introuvable'

        secret = os.getenv('SECRET_KEY', 'devsecret').encode()
        payload = f"{expiry}.{user_id}.{user.email}"
        expected_sig = hmac.new(secret, payload.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_sig, received_sig):
            return None, 'Signature invalide'

        return user_id, None
    except (ValueError, AttributeError):
        return None, 'Token invalide'

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()

    NEUTRAL = {'message': 'Si cette adresse est connue, un lien vous a été envoyé.'}

    if not email or not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', email):
        return jsonify(NEUTRAL), 200

    user = User.query.filter_by(email=email).first()

    if user:
        token = _generate_reset_token(user.id, user.email)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password/{token}"

        print(f"[DEV] Reset URL pour {user.email} : {reset_url}")

        from app.services.logger import log_action
        log_action(
            user_id=user.id,
            action='reset_password_demande',
            statut='succes',
            details=f'Token HMAC généré, expire dans {RESET_TOKEN_TTL}s'
        )

    return jsonify(NEUTRAL), 200

@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    data = request.get_json(silent=True) or {}
    new_password = data.get('password', '')

    if len(new_password) < 8:
        return jsonify({'error': 'Mot de passe trop court (min 8 caractères)'}), 400

    user_id, error = _verify_reset_token(token)
    if error:
        return jsonify({'error': error}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')

    if user.statut == 'bloque':
        user.statut = 'actif'

    from app.services.logger import log_action
    log_action(
        user_id=user.id,
        action='reset_password_succes',
        statut='succes',
        details='Mot de passe réinitialisé via lien HMAC'
    )
    db.session.commit()

    return jsonify({'message': 'Mot de passe réinitialisé avec succès'}), 200


# ── Profil personnel ──────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
def get_me():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    user = User.query.get(g.user['id'])
    if not user:
        return jsonify({'error': 'Introuvable'}), 404
    return jsonify({
        'id': user.id,
        'nom': user.nom,
        'email': user.email,
        'role': user.role,
        'quota': user.quota,
        'quota_utilise': user.quota_utilise,
    }), 200


@auth_bp.route('/me', methods=['PUT'])
def update_me():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    user = User.query.get(g.user['id'])
    if not user:
        return jsonify({'error': 'Introuvable'}), 404
    data = request.get_json(silent=True) or {}
    if 'nom' in data and data['nom'].strip():
        user.nom = data['nom'].strip()
    if 'email' in data and data['email'] != user.email:
        email = data['email'].strip().lower()
        if not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', email):
            return jsonify({'error': 'Format email invalide'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email déjà utilisé'}), 409
        user.email = email
    db.session.commit()
    return jsonify({'message': 'Profil mis à jour', 'nom': user.nom, 'email': user.email}), 200


@auth_bp.route('/me', methods=['DELETE'])
def delete_my_account():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    user = User.query.get(g.user['id'])
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Compte supprimé'}), 200


@auth_bp.route('/me/password', methods=['PUT'])
def change_password():
    if not hasattr(g, 'user') or g.user is None:
        return jsonify({'error': 'Non authentifié'}), 401
    user = User.query.get(g.user['id'])
    if not user:
        return jsonify({'error': 'Introuvable'}), 404
    data = request.get_json(silent=True) or {}
    current = data.get('current_password', '')
    new = data.get('new_password', '')
    if not bcrypt.check_password_hash(user.password, current):
        return jsonify({'error': 'Mot de passe actuel incorrect'}), 401
    if len(new) < 8:
        return jsonify({'error': 'Mot de passe trop court (min 8 caractères)'}), 400
    user.password = bcrypt.generate_password_hash(new).decode('utf-8')
    db.session.commit()
    return jsonify({'message': 'Mot de passe modifié'}), 200
