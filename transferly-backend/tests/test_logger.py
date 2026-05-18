import os
import jwt
import pytest
from datetime import datetime, timedelta

from app import create_app
from app.extensions import db, bcrypt
from app.models.user import User
from app.models.log import Log
from app.services.logger import log_action

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
def user(app):
    with app.app_context():
        u = User(nom="TestLogger", email="logger@test.com", password="pwd")
        db.session.add(u)
        db.session.commit()
        return u.id

def test_log_action_success(app, user):
    with app.app_context():
        log_action(user_id=user, action='test_action', resource_id=123, statut='succes', details='test details')
        
        logs = Log.query.all()
        assert len(logs) == 1
        assert logs[0].action == 'test_action'
        assert logs[0].resource_id == 123
        assert logs[0].statut == 'succes'
        assert logs[0].details == 'test details'
        assert logs[0].user_id == user

def test_log_action_silent_failure(app):
    with app.app_context():
        # Test with an invalid user_id that causes IntegrityError (foreign key constraint)
        # Assuming SQLite enforces FKs, but just in case, we also check that exceptions inside log_action are swallowed
        # Actually in SQLAlchemy without explicit PRAGMA foreign_keys=ON, SQLite might not enforce it.
        # Let's drop the table to force an error.
        db.drop_all()

        # This should not raise an exception because log_action swallows it
        log_action(user_id=999, action='test_action')

        # Test passes if no exception is thrown


# ══════════════════════════════════════════════════════════════════
# ZT-08 — Contrôle d'accès aux logs : AdminEspace vs AdminGlobal
# ══════════════════════════════════════════════════════════════════

@pytest.fixture
def client(app):
    return app.test_client()


def _make_token(user_id, role="Utilisateur"):
    secret = os.environ.get("SECRET_KEY", "devsecret")
    return jwt.encode(
        {"user_id": user_id, "role": role,
         "exp": datetime.utcnow() + timedelta(hours=2)},
        secret, algorithm="HS256",
    )


def _h(token):
    return {"Authorization": f"Bearer {token}"}


def _create_user(app, nom, email, role="Utilisateur"):
    with app.app_context():
        hashed = bcrypt.generate_password_hash("MotDePasse1!").decode("utf-8")
        u = User(nom=nom, email=email, password=hashed,
                 role=role, quota=2.0, quota_utilise=0.0, statut="actif")
        db.session.add(u)
        db.session.commit()
        uid = u.id
    return uid, _make_token(uid, role)


class TestAccesLogsAdminEspace:
    """GET /logs/ est réservé à AdminGlobal (@require_role('AdminGlobal')).
    Un AdminEspace ou tout autre rôle doit recevoir 403."""

    def test_adminespace_ne_peut_pas_voir_logs_403(self, app, client):
        """Un AdminEspace accédant à GET /logs/ reçoit 403."""
        _, token_admin_espace = _create_user(
            app, "Admin Espace", "adminespace@logs.com", role="AdminEspace"
        )
        res = client.get("/logs/", headers=_h(token_admin_espace))
        assert res.status_code == 403

    def test_utilisateur_ordinaire_ne_peut_pas_voir_logs_403(self, app, client):
        """Un Utilisateur ordinaire accédant à GET /logs/ reçoit 403."""
        _, token_user = _create_user(
            app, "User Normal", "user@logs.com", role="Utilisateur"
        )
        res = client.get("/logs/", headers=_h(token_user))
        assert res.status_code == 403

    def test_adminglobal_peut_voir_logs_200(self, app, client):
        """L'AdminGlobal légitime accédant à GET /logs/ reçoit 200."""
        _, token_global = _create_user(
            app, "Admin Global", "adminglobal@logs.com", role="AdminGlobal"
        )
        res = client.get("/logs/", headers=_h(token_global))
        assert res.status_code == 200
        assert isinstance(res.get_json(), list)
