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