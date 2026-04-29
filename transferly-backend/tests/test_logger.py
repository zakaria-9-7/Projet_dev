import pytest
from app import create_app
from app.extensions import db
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
