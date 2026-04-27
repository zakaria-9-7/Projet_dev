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
    if role not in ['AdminGlobal', 'AdminEspace', 'Utilisateur']:
        return jsonify({'error': 'Rôle invalide'}), 400
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

    return jsonify({'message': 'OTP envoyé', 'user_id': user.id}), 200


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

    return jsonify({'token': token, 'role': user.role}), 200


# ── SD-04 : Logout ───────────────────────────────────────────────
@auth_bp.route('/logout', methods=['POST'])
def logout():
    user = getattr(g, 'user', None)
    if user:
        log = Log(action='deconnexion', statut='succes', user_id=user['id'])
        db.session.add(log)
        db.session.commit()
    return jsonify({'message': 'Déconnecté'}), 200