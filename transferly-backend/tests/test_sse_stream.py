"""
Integration tests for the SSE stream endpoint and notification REST endpoints.

Covers:
  - GET /notifications/stream returns correct headers with valid JWT (Req 1.1, 6.4)
  - GET /notifications/stream returns 401 with missing/invalid JWT (Req 1.2, 1.3)
  - push_notification delivers an event into the stream (Req 2.1)
  - Existing REST endpoints remain functional (Req 5.1, 5.2, 5.3)
"""

import pytest
import jwt as pyjwt
import os
import json
from datetime import datetime, timedelta

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.notification import Notification
from app.services import sse_manager


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def app():
    application = create_app()
    application.config['TESTING'] = True
    application.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with application.app_context():
        db.create_all()
        yield application
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def user(app):
    """Create a test user and return (user_id, jwt_token)."""
    from app.extensions import bcrypt
    hashed = bcrypt.generate_password_hash("TestPass1!").decode("utf-8")
    u = User(
        nom="SSE Tester",
        email="sse@test.com",
        password=hashed,
        role="Utilisateur",
        statut="actif",
        quota=1.0,
    )
    db.session.add(u)
    db.session.commit()
    uid = u.id

    token = pyjwt.encode(
        {
            'user_id': uid,
            'role': 'Utilisateur',
            'email': 'sse@test.com',
            'exp': datetime.utcnow() + timedelta(hours=2),
        },
        os.getenv('SECRET_KEY', 'devsecret'),
        algorithm='HS256',
    )
    return uid, token


@pytest.fixture(autouse=True)
def clear_sse_registry():
    """Reset the SSE registry before and after each test."""
    from app.services.sse_manager import _registry, _lock
    with _lock:
        _registry.clear()
    yield
    with _lock:
        _registry.clear()


# ── SSE stream headers ────────────────────────────────────────────────────────

def test_sse_stream_returns_event_stream_content_type(app, client, user):
    """GET /notifications/stream with valid token should return text/event-stream."""
    uid, token = user
    with client.get(
        f'/notifications/stream?token={token}',
        headers={'Accept': 'text/event-stream'},
    ) as resp:
        assert resp.status_code == 200
        assert 'text/event-stream' in resp.content_type


def test_sse_stream_returns_no_cache_header(app, client, user):
    """GET /notifications/stream should include Cache-Control: no-cache."""
    uid, token = user
    with client.get(f'/notifications/stream?token={token}') as resp:
        assert resp.status_code == 200
        assert resp.headers.get('Cache-Control') == 'no-cache'


def test_sse_stream_returns_x_accel_buffering_header(app, client, user):
    """GET /notifications/stream should include X-Accel-Buffering: no."""
    uid, token = user
    with client.get(f'/notifications/stream?token={token}') as resp:
        assert resp.status_code == 200
        assert resp.headers.get('X-Accel-Buffering') == 'no'


# ── SSE stream authentication ─────────────────────────────────────────────────

def test_sse_stream_missing_token_returns_401(client):
    """GET /notifications/stream with no token should return 401."""
    resp = client.get('/notifications/stream')
    assert resp.status_code == 401


def test_sse_stream_invalid_token_returns_401(client):
    """GET /notifications/stream with a garbage token should return 401."""
    resp = client.get('/notifications/stream?token=not.a.valid.token')
    assert resp.status_code == 401


def test_sse_stream_expired_token_returns_401(client, app):
    """GET /notifications/stream with an expired token should return 401."""
    from app.extensions import bcrypt
    hashed = bcrypt.generate_password_hash("TestPass1!").decode("utf-8")
    u = User(
        nom="Expired User",
        email="expired@test.com",
        password=hashed,
        role="Utilisateur",
        statut="actif",
        quota=1.0,
    )
    db.session.add(u)
    db.session.commit()
    uid = u.id

    expired_token = pyjwt.encode(
        {
            'user_id': uid,
            'role': 'Utilisateur',
            'email': 'expired@test.com',
            'exp': datetime.utcnow() - timedelta(hours=1),  # already expired
        },
        os.getenv('SECRET_KEY', 'devsecret'),
        algorithm='HS256',
    )
    resp = client.get(f'/notifications/stream?token={expired_token}')
    assert resp.status_code == 401


# ── push_notification delivers into the stream ────────────────────────────────

def test_push_notification_event_appears_in_stream(app, client, user):
    """
    After connecting to the stream, push_notification should put an event
    on the registered queue which the generator yields.
    """
    uid, token = user
    from app.services.sse_manager import _registry, _lock, push_notification

    # Open the stream (this registers a queue for uid)
    with client.get(
        f'/notifications/stream?token={token}',
        headers={'Accept': 'text/event-stream'},
    ) as resp:
        assert resp.status_code == 200

        # Verify a queue was registered for this user
        with _lock:
            assert uid in _registry
            assert len(_registry[uid]) == 1

        # Push a notification
        payload = {
            'id': 1,
            'type': 'upload',
            'message': 'Test event',
            'lien': '/files/1',
            'lu': False,
            'date_creation': '2025-01-01T00:00:00',
        }
        push_notification(uid, payload)

        # Read the streamed data
        data = resp.get_data(as_text=True)
        assert 'event: notification' in data
        assert 'Test event' in data


# ── REST endpoint non-regression ─────────────────────────────────────────────

def test_get_notifications_returns_200(app, client, user):
    """GET /notifications should still return 200 with a valid JWT header."""
    uid, token = user
    resp = client.get(
        '/notifications',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)


def test_get_notifications_non_lues_returns_200(app, client, user):
    """GET /notifications/non-lues should still return 200."""
    uid, token = user
    resp = client.get(
        '/notifications/non-lues',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'count' in data


def test_put_notification_lu_returns_200(app, client, user):
    """PUT /notifications/<id>/lu should mark the notification as read and return 200."""
    uid, token = user
    notif = Notification(
        user_id=uid,
        type='upload',
        message='Test',
        lien=None,
        lu=False,
    )
    db.session.add(notif)
    db.session.commit()
    notif_id = notif.id

    resp = client.put(
        f'/notifications/{notif_id}/lu',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert resp.status_code == 200

    updated = db.session.get(Notification, notif_id)
    assert updated.lu is True


def test_put_notifications_tout_lu_returns_200(app, client, user):
    """PUT /notifications/tout-lu should mark all unread notifications as read."""
    uid, token = user
    for i in range(3):
        db.session.add(Notification(
            user_id=uid,
            type='upload',
            message=f'Notif {i}',
            lien=None,
            lu=False,
        ))
    db.session.commit()

    resp = client.put(
        '/notifications/tout-lu',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert resp.status_code == 200

    unread = Notification.query.filter_by(user_id=uid, lu=False).count()
    assert unread == 0
