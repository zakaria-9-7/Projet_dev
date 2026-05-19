"""
Unit tests for app.services.sse_manager

Covers:
  - register_queue   (Requirement 3.1)
  - unregister_queue (Requirement 3.2)
  - push_notification (Requirement 3.3)
"""

import queue
import pytest

from app.services.sse_manager import (
    register_queue,
    unregister_queue,
    push_notification,
    _registry,
    _lock,
)


# ── Fixture ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clear_registry():
    """Reset the module-level registry before every test to avoid state leakage."""
    with _lock:
        _registry.clear()
    yield
    with _lock:
        _registry.clear()


# ── register_queue ────────────────────────────────────────────────────────────

def test_register_queue_adds_queue_to_registry():
    """register_queue should add the returned queue to _registry[user_id]."""
    q = register_queue(user_id=1)
    assert 1 in _registry
    assert q in _registry[1]


def test_register_queue_returns_queue_instance():
    """register_queue should return a queue.Queue object."""
    q = register_queue(user_id=42)
    assert isinstance(q, queue.Queue)


def test_register_queue_multiple_queues_same_user():
    """Registering twice for the same user should result in two queues in the set."""
    q1 = register_queue(user_id=5)
    q2 = register_queue(user_id=5)
    assert q1 is not q2
    assert len(_registry[5]) == 2


def test_register_queue_different_users_are_independent():
    """Queues for different users should be stored under separate keys."""
    q1 = register_queue(user_id=10)
    q2 = register_queue(user_id=20)
    assert 10 in _registry and q1 in _registry[10]
    assert 20 in _registry and q2 in _registry[20]


# ── unregister_queue ──────────────────────────────────────────────────────────

def test_unregister_queue_removes_queue():
    """unregister_queue should remove the queue from the registry."""
    q = register_queue(user_id=1)
    unregister_queue(user_id=1, q=q)
    # Key should be gone because the set is now empty
    assert 1 not in _registry


def test_unregister_queue_deletes_key_when_set_empty():
    """The user_id key must be deleted when its queue set becomes empty."""
    q = register_queue(user_id=7)
    unregister_queue(user_id=7, q=q)
    assert 7 not in _registry


def test_unregister_queue_keeps_key_when_other_queues_remain():
    """Removing one queue should not remove the key if other queues still exist."""
    q1 = register_queue(user_id=3)
    q2 = register_queue(user_id=3)
    unregister_queue(user_id=3, q=q1)
    assert 3 in _registry
    assert q2 in _registry[3]
    assert q1 not in _registry[3]


def test_unregister_queue_noop_for_unknown_user():
    """unregister_queue should not raise when user_id is not in the registry."""
    q = queue.Queue()
    unregister_queue(user_id=999, q=q)  # must not raise


def test_unregister_queue_noop_for_unknown_queue():
    """unregister_queue should not raise when the queue is not registered."""
    register_queue(user_id=2)
    unrelated_q = queue.Queue()
    unregister_queue(user_id=2, q=unrelated_q)  # must not raise
    assert 2 in _registry  # original queue still there


# ── push_notification ─────────────────────────────────────────────────────────

def test_push_notification_no_queues_does_not_raise():
    """push_notification with no registered queues should silently do nothing."""
    push_notification(user_id=99, payload={"type": "test"})  # must not raise


def test_push_notification_delivers_to_one_queue():
    """push_notification should put exactly one item on a single registered queue."""
    q = register_queue(user_id=1)
    push_notification(user_id=1, payload={"type": "upload", "file": "doc.pdf"})
    assert q.qsize() == 1


def test_push_notification_item_is_sse_formatted_string():
    """The item placed on the queue should be an SSE-formatted string."""
    q = register_queue(user_id=1)
    push_notification(user_id=1, payload={"type": "upload"})
    item = q.get_nowait()
    assert isinstance(item, str)
    assert "event: notification" in item
    assert "data:" in item


def test_push_notification_delivers_to_all_queues_for_user():
    """push_notification should deliver to every queue registered for the user."""
    q1 = register_queue(user_id=4)
    q2 = register_queue(user_id=4)
    q3 = register_queue(user_id=4)
    push_notification(user_id=4, payload={"type": "share"})
    assert q1.qsize() == 1
    assert q2.qsize() == 1
    assert q3.qsize() == 1


def test_push_notification_does_not_deliver_to_other_users():
    """push_notification for user A should not put items on user B's queues."""
    qa = register_queue(user_id=1)
    qb = register_queue(user_id=2)
    push_notification(user_id=1, payload={"type": "test"})
    assert qa.qsize() == 1
    assert qb.qsize() == 0


def test_push_notification_payload_is_serialized_in_item():
    """The SSE item should contain the JSON-serialized payload."""
    import json
    payload = {"type": "delete", "file_id": 42}
    q = register_queue(user_id=1)
    push_notification(user_id=1, payload=payload)
    item = q.get_nowait()
    assert json.dumps(payload) in item
