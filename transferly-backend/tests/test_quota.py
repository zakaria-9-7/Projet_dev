import pytest
from app import create_app
from app.extensions import db
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
