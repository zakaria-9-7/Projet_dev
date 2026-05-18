import io
import os
import jwt
import pytest
from datetime import datetime, timedelta

from app import create_app
from app.extensions import db, bcrypt
from app.models.user import User
from app.services.quota import check_quota, update_quota

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

@pytest.fixture
def user(app):
    with app.app_context():
        u = User(nom="TestUser", email="test@quota.com", password="pwd", quota=2.0, quota_utilise=0.5)
        db.session.add(u)
        db.session.commit()
        return u.id

def test_check_quota_success(app, user):
    with app.app_context():
        # User has 1.5GB left, adding 500MB (0.488GB)
        assert check_quota(user, 500.0) is True

def test_check_quota_exceeded(app, user):
    with app.app_context():
        # User has 1.5GB left, adding 2000MB (1.95GB) should fail
        assert check_quota(user, 2000.0) is False

def test_update_quota_upload(app, user):
    with app.app_context():
        # Uploading 1024MB = 1GB
        success = update_quota(user, 1024.0, is_upload=True)
        assert success is True
        
        u = User.query.get(user)
        assert u.quota_utilise == 1.5

def test_update_quota_delete(app, user):
    with app.app_context():
        # Deleting 512MB = 0.5GB
        success = update_quota(user, 512.0, is_upload=False)
        assert success is True
        
        u = User.query.get(user)
        assert u.quota_utilise == 0.0

def test_update_quota_delete_below_zero(app, user):
    with app.app_context():
        # Deleting more than what is used
        success = update_quota(user, 2048.0, is_upload=False)
        assert success is True

        u = User.query.get(user)
        assert u.quota_utilise == 0.0


# ══════════════════════════════════════════════════════════════════
# ZT-08 — Refus d'upload quand le quota est dépassé (route HTTP)
# ══════════════════════════════════════════════════════════════════

def _make_token(user_id, role="Utilisateur"):
    secret = os.environ.get("SECRET_KEY", "devsecret")
    return jwt.encode(
        {"user_id": user_id, "role": role,
         "exp": datetime.utcnow() + timedelta(hours=2)},
        secret, algorithm="HS256",
    )


def _h(token):
    return {"Authorization": f"Bearer {token}"}


class TestUploadQuotaDepasse:

    def test_upload_refuse_si_quota_depasse_413(self, app, client):
        """POST /files/ renvoie 413 quand la taille dépasse le quota, et
        aucun Fichier n'est créé en base."""
        with app.app_context():
            hashed = bcrypt.generate_password_hash("MotDePasse1!").decode("utf-8")
            u = User(nom="Mini", email="mini@quota.com", password=hashed,
                     role="Utilisateur", quota=0.000001, quota_utilise=0.0,
                     statut="actif")
            db.session.add(u)
            db.session.commit()
            uid = u.id

        token = _make_token(uid)
        # 10 000 octets ≈ 0.0095 Mo >> quota de 0.000001 Go (≈ 0.001 Mo)
        contenu = b"X" * 10_000

        res = client.post(
            "/files/",
            headers=_h(token),
            data={"file": (io.BytesIO(contenu), "gros_fichier.txt")},
            content_type="multipart/form-data",
        )
        assert res.status_code == 413

        with app.app_context():
            from app.models.fichier import Fichier
            count = Fichier.query.filter_by(user_id=uid).count()
            assert count == 0
