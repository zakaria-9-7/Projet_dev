import pytest
import json
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.otp import OTP
from datetime import datetime, timedelta

@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()


# ── SD-02 : Tests inscription ────────────────────────────────────

def test_register_success(client):
    res = client.post('/register', json={
        'nom': 'Salma', 'email': 'nouveau@test.com', 'password': 'password123'
    })
    assert res.status_code == 201
    assert b'succ' in res.data

def test_register_email_invalide(client):
    res = client.post('/register', json={
        'nom': 'Salma', 'email': 'pasunemail', 'password': 'password123'
    })
    assert res.status_code == 400

def test_register_password_court(client):
    res = client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': '123'
    })
    assert res.status_code == 400

def test_register_email_deja_utilise(client):
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    res = client.post('/register', json={
        'nom': 'Salma2', 'email': 'salma@test.com', 'password': 'password123'
    })
    assert res.status_code == 409

def test_register_champs_manquants(client):
    res = client.post('/register', json={'nom': 'Salma'})
    assert res.status_code == 400


# ── SD-03 : Tests login ──────────────────────────────────────────

def test_login_success(client):
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    res = client.post('/login', json={
        'email': 'salma@test.com', 'password': 'password123'
    })
    assert res.status_code == 200
    assert b'OTP' in res.data or b'user_id' in res.data

def test_login_mauvais_mot_de_passe(client):
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    res = client.post('/login', json={
        'email': 'salma@test.com', 'password': 'mauvaismdp'
    })
    assert res.status_code == 401

def test_login_email_inexistant(client):
    res = client.post('/login', json={
        'email': 'inconnu@test.com', 'password': 'password123'
    })
    assert res.status_code == 401


# ── SD-04 : Tests OTP + JWT ──────────────────────────────────────

def test_verify_otp_valide(client, app):
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    client.post('/login', json={
        'email': 'salma@test.com', 'password': 'password123'
    })
    with app.app_context():
        user = User.query.filter_by(email='salma@test.com').first()
        otp = OTP.query.filter_by(user_id=user.id).first()
        code = otp.code
        user_id = user.id

    res = client.post('/mfa/verify', json={
        'user_id': user_id, 'code': code
    })
    assert res.status_code == 200
    assert b'token' in res.data

def test_verify_otp_invalide(client, app):
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    client.post('/login', json={
        'email': 'salma@test.com', 'password': 'password123'
    })
    with app.app_context():
        user = User.query.filter_by(email='salma@test.com').first()
        user_id = user.id

    res = client.post('/mfa/verify', json={
        'user_id': user_id, 'code': '000000'
    })
    assert res.status_code == 401

def test_verify_otp_expire(client, app):
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    client.post('/login', json={
        'email': 'salma@test.com', 'password': 'password123'
    })
    with app.app_context():
        user = User.query.filter_by(email='salma@test.com').first()
        otp = OTP.query.filter_by(user_id=user.id).first()
        otp.date_expiration = datetime.utcnow() - timedelta(minutes=10)
        db.session.commit()
        code = otp.code
        user_id = user.id

    res = client.post('/mfa/verify', json={
        'user_id': user_id, 'code': code
    })
    assert res.status_code == 401

def test_blocage_apres_5_tentatives(client, app):
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    client.post('/login', json={
        'email': 'salma@test.com', 'password': 'password123'
    })
    with app.app_context():
        user = User.query.filter_by(email='salma@test.com').first()
        user_id = user.id

    for _ in range(5):
        client.post('/mfa/verify', json={
            'user_id': user_id, 'code': '000000'
        })

    res = client.post('/mfa/verify', json={
        'user_id': user_id, 'code': '000000'
    })
    assert res.status_code == 403


# ── ZT-04 : Tests Reset Password ─────────────────────────────────

def test_forgot_password_email_existant(client):
    """Réponse 200 + message neutre quand l'email est connu."""
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    res = client.post('/forgot-password', json={'email': 'salma@test.com'})
    assert res.status_code == 200
    assert 'message' in res.get_json()

def test_forgot_password_email_inexistant(client):
    """Réponse 200 + message neutre quand l'email est inconnu (pas de fuite d'info)."""
    res = client.post('/forgot-password', json={'email': 'inconnu@test.com'})
    assert res.status_code == 200
    assert 'message' in res.get_json()

def test_forgot_password_reponse_identique(client):
    """Même réponse qu'email connu ou inconnu — pas d'oracle d'énumération."""
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    res_connu = client.post('/forgot-password', json={'email': 'salma@test.com'})
    res_inconnu = client.post('/forgot-password', json={'email': 'inconnu@test.com'})
    assert res_connu.status_code == res_inconnu.status_code == 200
    assert res_connu.get_json() == res_inconnu.get_json()

def test_reset_password_token_valide(client, app):
    """Reset avec token valide → 200 et le nouveau mot de passe fonctionne au login."""
    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    with app.app_context():
        from app.routes.auth import _generate_reset_token
        user = User.query.filter_by(email='salma@test.com').first()
        token = _generate_reset_token(user.id, user.email)

    res = client.post(f'/reset-password/{token}', json={'password': 'nouveaumdp123'})
    assert res.status_code == 200

    login_res = client.post('/login', json={
        'email': 'salma@test.com', 'password': 'nouveaumdp123'
    })
    assert login_res.status_code == 200

def test_reset_password_token_invalide(client):
    """Token invalide/malformé → 400."""
    res = client.post('/reset-password/ceci.n.estpasuntoken', json={'password': 'nouveaumdp123'})
    assert res.status_code == 400

def test_reset_password_token_inexistant(client):
    """Token complètement aléatoire → 400."""
    res = client.post('/reset-password/1234567890.999.aaabbbccc', json={'password': 'nouveaumdp123'})
    assert res.status_code == 400

def test_reset_password_token_expire(client, app):
    """Token avec expiry dans le passé → 400 avec mention 'expir'."""
    import time, hmac, hashlib, os

    client.post('/register', json={
        'nom': 'Salma', 'email': 'salma@test.com', 'password': 'password123'
    })
    with app.app_context():
        user = User.query.filter_by(email='salma@test.com').first()
        secret = os.getenv('SECRET_KEY', 'devsecret').encode()
        expiry = int(time.time()) - 1  # déjà expiré
        payload = f"{expiry}.{user.id}.{user.email}"
        sig = hmac.new(secret, payload.encode(), hashlib.sha256).hexdigest()
        token = f"{expiry}.{user.id}.{sig}"

    res = client.post(f'/reset-password/{token}', json={'password': 'nouveaumdp123'})
    assert res.status_code == 400
    assert b'expir' in res.data