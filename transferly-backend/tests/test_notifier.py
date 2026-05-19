"""
Unit tests for app.services.notifier.creer_notification

Covers:
  - push_notification is called with the correct 6-field payload after a
    successful DB commit  (Requirement 2.1, 2.2)
  - push_notification is NOT called when the DB commit raises (rollback path)
    (Requirement 2.1)
  - An exception raised inside push_notification does not propagate out of
    creer_notification  (Requirement 2.1)
"""

import pytest
from unittest.mock import patch

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.notification import Notification


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def app():
    """Minimal Flask app backed by an in-memory SQLite database."""
    application = create_app()
    application.config['TESTING'] = True
    application.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with application.app_context():
        db.create_all()
        yield application
        db.drop_all()


@pytest.fixture
def user_id(app):
    """Create a minimal User row and return its id."""
    with app.app_context():
        from app.extensions import bcrypt
        hashed = bcrypt.generate_password_hash("TestPass1!").decode("utf-8")
        u = User(
            nom="Notif Tester",
            email="notif@test.com",
            password=hashed,
            role="Utilisateur",
            statut="actif",
            quota=1.0,
        )
        db.session.add(u)
        db.session.commit()
        return u.id


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestCreerNotificationSuccess:
    """push_notification is called with the correct payload on the happy path."""

    def test_push_notification_called_once(self, app, user_id):
        """creer_notification should call push_notification exactly once on success."""
        with app.app_context():
            with patch('app.services.notifier.push_notification') as mock_push:
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'upload', 'Fichier uploadé', '/files/1')
                mock_push.assert_called_once()

    def test_push_notification_called_with_correct_user_id(self, app, user_id):
        """push_notification should receive the correct user_id as first argument."""
        with app.app_context():
            with patch('app.services.notifier.push_notification') as mock_push:
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'upload', 'Fichier uploadé', '/files/1')
                call_args = mock_push.call_args
                assert call_args[0][0] == user_id

    def test_push_notification_payload_has_all_six_fields(self, app, user_id):
        """The payload passed to push_notification must contain all 6 required fields."""
        with app.app_context():
            with patch('app.services.notifier.push_notification') as mock_push:
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'upload', 'Fichier uploadé', '/files/1')
                payload = mock_push.call_args[0][1]
                for field in ('id', 'type', 'message', 'lien', 'lu', 'date_creation'):
                    assert field in payload, f"Missing field '{field}' in payload"

    def test_push_notification_payload_values_match_db_row(self, app, user_id):
        """Payload values should match the persisted Notification row exactly."""
        with app.app_context():
            with patch('app.services.notifier.push_notification') as mock_push:
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'partage', 'Fichier partagé', '/files/2')
                payload = mock_push.call_args[0][1]

                notif = Notification.query.filter_by(user_id=user_id).first()
                assert notif is not None
                assert payload['id'] == notif.id
                assert payload['type'] == notif.type
                assert payload['message'] == notif.message
                assert payload['lien'] == notif.lien
                assert payload['lu'] == notif.lu
                assert payload['date_creation'] == notif.date_creation.isoformat()

    def test_push_notification_payload_lu_is_false_by_default(self, app, user_id):
        """A freshly created notification should have lu=False in the payload."""
        with app.app_context():
            with patch('app.services.notifier.push_notification') as mock_push:
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'info', 'Message info', None)
                payload = mock_push.call_args[0][1]
                assert payload['lu'] is False

    def test_push_notification_payload_lien_can_be_none(self, app, user_id):
        """lien=None should be forwarded as-is in the payload."""
        with app.app_context():
            with patch('app.services.notifier.push_notification') as mock_push:
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'info', 'Sans lien', None)
                payload = mock_push.call_args[0][1]
                assert payload['lien'] is None

    def test_notification_row_is_persisted_in_db(self, app, user_id):
        """A Notification row should exist in the DB after a successful call."""
        with app.app_context():
            with patch('app.services.notifier.push_notification'):
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'upload', 'Fichier uploadé', '/files/3')
                count = Notification.query.filter_by(user_id=user_id).count()
                assert count == 1


class TestCreerNotificationRollback:
    """push_notification must NOT be called when the DB commit fails."""

    def test_push_not_called_on_commit_error(self, app, user_id):
        """If db.session.commit raises, push_notification should never be called."""
        with app.app_context():
            with patch('app.services.notifier.push_notification') as mock_push, \
                 patch('app.extensions.db.session.commit',
                       side_effect=Exception("DB error")):
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'upload', 'Fichier uploadé', '/files/1')
                mock_push.assert_not_called()

    def test_creer_notification_does_not_raise_on_commit_error(self, app, user_id):
        """creer_notification must swallow the commit exception and not re-raise."""
        with app.app_context():
            with patch('app.extensions.db.session.commit',
                       side_effect=Exception("DB error")):
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'upload', 'Fichier uploadé', '/files/1')


class TestCreerNotificationPushError:
    """An exception inside push_notification must not propagate out of creer_notification."""

    def test_push_exception_does_not_propagate(self, app, user_id):
        """creer_notification must swallow any exception raised by push_notification."""
        with app.app_context():
            with patch('app.services.notifier.push_notification',
                       side_effect=RuntimeError("SSE failure")):
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'upload', 'Fichier uploadé', '/files/1')

    def test_notification_row_persisted_even_when_push_raises(self, app, user_id):
        """The DB row should still be committed even if push_notification raises."""
        with app.app_context():
            with patch('app.services.notifier.push_notification',
                       side_effect=RuntimeError("SSE failure")):
                from app.services.notifier import creer_notification
                creer_notification(user_id, 'upload', 'Fichier uploadé', '/files/1')
                count = Notification.query.filter_by(user_id=user_id).count()
                assert count == 1
