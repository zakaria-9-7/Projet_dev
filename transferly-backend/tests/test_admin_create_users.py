"""
Tests — POST /admin/users (création de compte par l'AdminGlobal)
et comportements associés (must_reset_password dans login/reset).
"""

import os
import jwt
import pytest
from datetime import datetime, timedelta

from app import create_app
from app.extensions import db as _db, bcrypt


# ══════════════════════════════════════════════════════════════════
# FIXTURES
# ══════════════════════════════════════════════════════════════════

@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "test-secret-key")
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture(scope="session")
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    yield
    with app.app_context():
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


# ══════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════

def _make_token(user_id, role):
    secret = os.environ.get("SECRET_KEY", "test-secret-key")
    return jwt.encode(
        {"user_id": user_id, "role": role,
         "exp": datetime.utcnow() + timedelta(hours=2)},
        secret, algorithm="HS256",
    )


def _h(token):
    return {"Authorization": f"Bearer {token}"}


def _create_admin(app):
    """Crée un AdminGlobal en base et retourne (id, token)."""
    with app.app_context():
        from app.models.user import User
        hashed = bcrypt.generate_password_hash("AdminPass1!").decode("utf-8")
        admin = User(nom="Admin Global", email="admin@test.com",
                     password=hashed, role="AdminGlobal", statut="actif")
        _db.session.add(admin)
        _db.session.commit()
        uid = admin.id
    return uid, _make_token(uid, "AdminGlobal")


def _create_standard_user(app):
    """Crée un Utilisateur standard et retourne (id, token)."""
    with app.app_context():
        from app.models.user import User
        hashed = bcrypt.generate_password_hash("UserPass1!").decode("utf-8")
        user = User(nom="User Standard", email="user@test.com",
                    password=hashed, role="Utilisateur", statut="actif")
        _db.session.add(user)
        _db.session.commit()
        uid = user.id
    return uid, _make_token(uid, "Utilisateur")


# ══════════════════════════════════════════════════════════════════
# CAS 1 : AdminGlobal crée un user → 201, user en base, must_reset_password=True
# ══════════════════════════════════════════════════════════════════

def test_admin_cree_user_succes(client, app):
    _, admin_token = _create_admin(app)

    res = client.post(
        "/admin/users",
        headers=_h(admin_token),
        json={"email": "nouveau@test.com", "nom": "Nouvel Utilisateur", "role": "utilisateur"},
    )
    assert res.status_code == 201

    data = res.get_json()
    assert data["email"] == "nouveau@test.com"
    assert data["nom"] == "Nouvel Utilisateur"
    assert data["role"] == "Utilisateur"
    assert "temporary_password" in data
    assert len(data["temporary_password"]) >= 12
    assert "email_sent" in data
    assert "id" in data

    with app.app_context():
        from app.models.user import User
        user = User.query.filter_by(email="nouveau@test.com").first()
        assert user is not None
        assert user.must_reset_password is True


# ══════════════════════════════════════════════════════════════════
# CAS 2 : Email déjà existant → 409
# ══════════════════════════════════════════════════════════════════

def test_admin_cree_user_email_existant(client, app):
    _, admin_token = _create_admin(app)

    client.post(
        "/admin/users",
        headers=_h(admin_token),
        json={"email": "doublon@test.com", "nom": "Premier", "role": "utilisateur"},
    )

    res = client.post(
        "/admin/users",
        headers=_h(admin_token),
        json={"email": "doublon@test.com", "nom": "Doublon", "role": "utilisateur"},
    )
    assert res.status_code == 409


# ══════════════════════════════════════════════════════════════════
# CAS 3 : role="admin_global" → 400 (interdit via cet endpoint)
# ══════════════════════════════════════════════════════════════════

def test_admin_cree_user_role_admin_global_rejete(client, app):
    _, admin_token = _create_admin(app)

    res = client.post(
        "/admin/users",
        headers=_h(admin_token),
        json={"email": "superadmin@test.com", "nom": "Super Admin", "role": "admin_global"},
    )
    assert res.status_code == 400


# ══════════════════════════════════════════════════════════════════
# CAS 4 : Utilisateur standard tente de créer un user → 403
# ══════════════════════════════════════════════════════════════════

def test_utilisateur_standard_ne_peut_pas_creer(client, app):
    _, user_token = _create_standard_user(app)

    res = client.post(
        "/admin/users",
        headers=_h(user_token),
        json={"email": "cible@test.com", "nom": "Cible", "role": "utilisateur"},
    )
    assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# CAS 5 : Utilisateur non authentifié → 401
# ══════════════════════════════════════════════════════════════════

def test_non_authentifie_ne_peut_pas_creer(client, app):
    res = client.post(
        "/admin/users",
        json={"email": "cible@test.com", "nom": "Cible", "role": "utilisateur"},
    )
    assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════
# CAS 6 : Login d'un user fraîchement créé → must_reset_password=true
# ══════════════════════════════════════════════════════════════════

def test_login_user_fraichement_cree_must_reset(client, app):
    _, admin_token = _create_admin(app)

    # L'admin crée l'utilisateur
    create_res = client.post(
        "/admin/users",
        headers=_h(admin_token),
        json={"email": "reset_user@test.com", "nom": "Reset User", "role": "utilisateur"},
    )
    assert create_res.status_code == 201
    temp_password = create_res.get_json()["temporary_password"]

    # Connexion avec le mot de passe temporaire
    login_res = client.post("/login", json={
        "email": "reset_user@test.com",
        "password": temp_password,
    })
    assert login_res.status_code == 200
    user_id = login_res.get_json()["user_id"]

    # Récupérer l'OTP en base
    with app.app_context():
        from app.models.otp import OTP
        otp = OTP.query.filter_by(user_id=user_id).first()
        assert otp is not None
        code = otp.code

    # Vérification OTP → JWT
    verify_res = client.post("/mfa/verify", json={"user_id": user_id, "code": code})
    assert verify_res.status_code == 200

    data = verify_res.get_json()
    assert "token" in data
    assert data.get("must_reset_password") is True


# ══════════════════════════════════════════════════════════════════
# CAS 7 : Après reset password réussi → must_reset_password=False en base
# ══════════════════════════════════════════════════════════════════

def test_reset_password_efface_flag_must_reset(client, app):
    # Créer directement un user avec must_reset_password=True
    with app.app_context():
        from app.models.user import User
        hashed = bcrypt.generate_password_hash("TempPass1!").decode("utf-8")
        user = User(
            nom="Reset Test",
            email="reset_test@test.com",
            password=hashed,
            role="Utilisateur",
            must_reset_password=True,
        )
        _db.session.add(user)
        _db.session.commit()
        uid = user.id

        from app.routes.auth import _generate_reset_token
        token = _generate_reset_token(uid, "reset_test@test.com")

    # Reset du mot de passe
    res = client.post(f"/reset-password/{token}", json={"password": "NouveauMdp1!"})
    assert res.status_code == 200

    # Vérifier en base que must_reset_password est passé à False
    with app.app_context():
        from app.models.user import User
        user = User.query.get(uid)
        assert user.must_reset_password is False


# ══════════════════════════════════════════════════════════════════
# CAS 8 : Deux créations génèrent des mots de passe différents
# ══════════════════════════════════════════════════════════════════

def test_mots_de_passe_temporaires_differents(client, app):
    _, admin_token = _create_admin(app)

    res1 = client.post(
        "/admin/users",
        headers=_h(admin_token),
        json={"email": "user1@test.com", "nom": "User Un", "role": "utilisateur"},
    )
    res2 = client.post(
        "/admin/users",
        headers=_h(admin_token),
        json={"email": "user2@test.com", "nom": "User Deux", "role": "utilisateur"},
    )
    assert res1.status_code == 201
    assert res2.status_code == 201

    pwd1 = res1.get_json()["temporary_password"]
    pwd2 = res2.get_json()["temporary_password"]
    assert pwd1 != pwd2
