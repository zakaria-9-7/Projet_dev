"""
SSE Manager — in-memory registry and push function for Server-Sent Events.

Maintains a mapping of user_id → set of queue.Queue objects, one per active
SSE connection for that user. Thread-safe via a module-level Lock.
"""

import json
import queue
import threading

# Internal registry: user_id → set of Queue objects
_registry: dict[int, set[queue.Queue]] = {}
_lock = threading.Lock()


def register_queue(user_id: int) -> queue.Queue:
    """
    Create a new Queue, add it to the registry for user_id, and return it.
    Thread-safe.
    """
    q: queue.Queue = queue.Queue()
    with _lock:
        if user_id not in _registry:
            _registry[user_id] = set()
        _registry[user_id].add(q)
    return q


def unregister_queue(user_id: int, q: queue.Queue) -> None:
    """
    Remove q from the registry for user_id.
    Removes the key entirely if the set becomes empty.
    No-op if user_id or q is not present.
    Thread-safe.
    """
    with _lock:
        queues = _registry.get(user_id)
        if queues is None:
            return
        queues.discard(q)
        if not queues:
            del _registry[user_id]


def format_sse_event(payload: dict) -> str:
    """
    Serialize payload to an SSE event string in the wire format:

        retry: 5000

        event: notification
        data: <json_string>

    The retry directive is always included for simplicity.
    """
    data = json.dumps(payload, ensure_ascii=False)
    return f"retry: 5000\n\nevent: notification\ndata: {data}\n\n"


def push_notification(user_id: int, payload: dict) -> None:
    """
    Serialize payload to an SSE event string and put it on every queue
    registered for user_id.

    - Silently discards if no queues exist for user_id.
    - If a queue raises on put_nowait(), that queue is unregistered and the
      exception is swallowed; delivery continues to the remaining queues.
    - Never raises.
    """
    event = format_sse_event(payload)

    # Take a snapshot of the current queues so we don't hold the lock
    # while calling put_nowait (which could block or raise).
    with _lock:
        queues = set(_registry.get(user_id, set()))

    for q in queues:
        try:
            q.put_nowait(event)
        except Exception:
            unregister_queue(user_id, q)
