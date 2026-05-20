# Implementation Plan: realtime-notifications

## Overview

Replace the 30-second polling loop with a Server-Sent Events (SSE) push channel. The backend gains a new `sse_manager.py` service and a `/notifications/stream` route; `notifier.py` is updated to call `push_notification` after each DB commit. The frontend gains a `NotificationContext` that owns the single `EventSource` connection, and `NotificationBell` is refactored to consume that context instead of running its own interval.

## Tasks

- [x] 1. Create `app/services/sse_manager.py` — in-memory registry and push function
  - Create `transferly-backend/app/services/sse_manager.py` with a module-level `_registry: dict[int, set[queue.Queue]]` and a `threading.Lock`.
  - Implement `register_queue(user_id: int) -> queue.Queue`: creates a new `queue.Queue`, adds it to `_registry[user_id]`, returns it.
  - Implement `unregister_queue(user_id: int, q: queue.Queue) -> None`: removes `q` from `_registry[user_id]`; removes the key if the set becomes empty; no-op if not present.
  - Implement `push_notification(user_id: int, payload: dict) -> None`: serializes `payload` to an SSE event string (`event: notification\ndata: <json>\n\n`), iterates over every queue in `_registry.get(user_id, set())`, calls `q.put_nowait(event)` inside a try/except that calls `unregister_queue` on failure; never raises.
  - Add a `format_sse_event(payload: dict) -> str` helper that produces the wire format including the `retry: 5000` hint on first call (or always — keep it simple).
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.3_

- [ ] 2. Write property-based and unit tests for `sse_manager.py`
  - [x] 2.1 Write unit tests for `sse_manager.py` in `transferly-backend/tests/test_sse_manager.py`
    - Test `register_queue` adds the queue to the registry.
    - Test `unregister_queue` removes the queue; key is deleted when set is empty.
    - Test `push_notification` with no registered queues does nothing and does not raise.
    - Test `push_notification` with one queue delivers exactly one item.
    - Test `push_notification` with multiple queues for the same user delivers to all.
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 2.2 Write property test — Property 4: Registry round-trip
    - Use `hypothesis` with `st.integers(min_value=1)` for `user_id`.
    - After `register_queue(user_id)`, assert the returned queue is in the registry for that user.
    - After `unregister_queue(user_id, q)`, assert the queue is no longer in the registry.
    - **Property 4: Registry round-trip (connect / disconnect)**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.3 Write property test — Property 2: Notification delivery fan-out
    - Use `hypothesis` with `st.integers(min_value=1)` for `user_id` and `st.integers(min_value=1, max_value=10)` for queue count.
    - Register N queues, call `push_notification`, assert every queue has exactly one item.
    - **Property 2: Notification delivery fan-out**
    - **Validates: Requirements 2.1, 3.3**

  - [ ]* 2.4 Write property test — Property 5: Fault-tolerant fan-out
    - Use `hypothesis` to generate a random mix of healthy queues and mock queues whose `put_nowait` raises `Full`.
    - Call `push_notification`, assert healthy queues received the event and failing queues were removed from the registry.
    - **Property 5: Fault-tolerant fan-out**
    - **Validates: Requirements 3.4, 6.3**

  - [ ]* 2.5 Write property test — Property 6: User isolation
    - Use `hypothesis` with two distinct `user_id` values (A ≠ B), each with 1–5 queues.
    - Call `push_notification(A, payload)`, assert all of A's queues received the event and none of B's queues received anything.
    - **Property 6: User isolation**
    - **Validates: Requirements 6.1**

- [x] 3. Checkpoint — Ensure all `test_sse_manager.py` tests pass
  - Run `pytest tests/test_sse_manager.py` from `transferly-backend/`. Ensure all tests pass, ask the user if questions arise.

- [x] 4. Modify `app/services/notifier.py` — hook `push_notification` into `creer_notification`
  - Add `from app.services.sse_manager import push_notification` at the top of `notifier.py`.
  - In `creer_notification`, after `db.session.commit()` succeeds, call `push_notification` with the six required fields (`id`, `type`, `message`, `lien`, `lu`, `date_creation.isoformat()`).
  - Wrap the `push_notification` call in its own try/except so that any SSE-layer error never prevents the function from returning normally.
  - `notifier_plusieurs` requires no changes (it delegates to `creer_notification`).
  - _Requirements: 2.1, 2.2_

- [ ] 5. Write tests for the modified `notifier.py`
  - [x] 5.1 Write unit tests in `transferly-backend/tests/test_notifier.py`
    - Mock `push_notification` and `db.session`; verify `push_notification` is called with the correct payload after a successful commit.
    - Verify `push_notification` is NOT called when the DB commit raises (rollback path).
    - Verify that an exception raised inside `push_notification` does not propagate out of `creer_notification`.
    - _Requirements: 2.1, 2.2_

  - [ ]* 5.2 Write property test — Property 1: SSE event payload completeness
    - Use `hypothesis` with `st.text()` for `type_notif` and `message`, `st.one_of(st.none(), st.text())` for `lien`.
    - Mock the DB commit and capture the payload passed to `push_notification`.
    - Assert all six fields (`id`, `type`, `message`, `lien`, `lu`, `date_creation`) are present and match the `Notification` object.
    - **Property 1: SSE event payload completeness**
    - **Validates: Requirements 2.2**

- [x] 6. Add `/notifications/stream` SSE route to `app/routes/notifications.py`
  - Import `register_queue`, `unregister_queue` from `app.services.sse_manager`.
  - Add `from flask import Response, stream_with_context` to the imports.
  - Implement `sse_stream()` under `GET /notifications/stream`:
    - Read `g.user` (already set by middleware); return 401 if absent.
    - Call `register_queue(user_id)` to get a queue `q`.
    - Define a generator that sends `retry: 5000\n\n` once, then loops: calls `q.get(timeout=30)` inside a try/except `queue.Empty` that yields `: keep-alive\n\n` on timeout, and yields the event string on success. A `finally` block calls `unregister_queue(user_id, q)`.
    - Return `Response(stream_with_context(generator()), mimetype='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no', 'Connection': 'keep-alive'})`.
  - Add `import queue` at the top of the file.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.4_

- [ ] 7. Write integration tests for the SSE stream endpoint
  - [x] 7.1 Write integration tests in `transferly-backend/tests/test_sse_stream.py`
    - Test that `GET /notifications/stream` with a valid JWT returns `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `X-Accel-Buffering: no` headers.
    - Test that `GET /notifications/stream` with a missing or invalid JWT returns HTTP 401.
    - Test that calling `push_notification(user_id, payload)` after connecting causes the event to appear in the stream response.
    - Test that existing REST endpoints (`GET /notifications`, `GET /notifications/non-lues`, `PUT /notifications/<id>/lu`, `PUT /notifications/tout-lu`) still return expected status codes (non-regression).
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 6.4_

  - [ ]* 7.2 Write property test — Property 7: Mark-all-read completeness
    - Use `hypothesis` with `st.lists(st.booleans(), min_size=1)` to generate a random list of `lu` values for notifications belonging to a test user.
    - Insert those notifications via the test client's app context, call `PUT /notifications/tout-lu`, then query the DB and assert every notification for that user has `lu = True`.
    - **Property 7: Mark-all-read completeness**
    - **Validates: Requirements 5.3**

- [~] 8. Checkpoint — Ensure all backend tests pass
  - Run `pytest` from `transferly-backend/`. Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create `src/context/NotificationContext.jsx`
  - Create `transferly-frontend/src/context/NotificationContext.jsx`.
  - Define `NotificationContext` with `React.createContext`.
  - Implement `NotificationProvider` component:
    - State: `notifications` (array, max 30, most-recent-first), `unreadCount` (integer).
    - On mount: if `localStorage.getItem('token')` exists, open an `EventSource` pointing to `${VITE_API_URL}/notifications/stream?token=<jwt>` (or use the `Authorization` header approach via a custom fetch — use query-param since `EventSource` does not support custom headers natively).
    - `onmessage` handler: parse `event.data` as JSON, prepend to `notifications` (cap at 30), increment `unreadCount`.
    - `onerror` handler: log silently; the browser retries automatically.
    - On `visibilitychange` to `visible`: if `eventSource.readyState === EventSource.CLOSED`, reopen the connection.
    - Expose `markAsRead(id)`: calls `PUT /notifications/<id>/lu` via `API`, updates local state optimistically (set `lu = true` on matching item, decrement `unreadCount`).
    - Expose `markAllAsRead()`: calls `PUT /notifications/tout-lu` via `API`, sets all local `lu = true`, sets `unreadCount = 0`.
    - On unmount (or when token is removed): close the `EventSource`.
    - Load initial notifications list via `GET /notifications` when the connection opens.
  - Export `useNotifications` convenience hook: `() => useContext(NotificationContext)`.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 10. Modify `src/components/NotificationBell.jsx` — consume NotificationContext
  - Remove the `useState` declarations for `notifs` and `count`.
  - Remove the `useEffect` that sets up `loadCount` and `setInterval`.
  - Remove the `loadCount` and `loadNotifs` functions.
  - Import `useNotifications` from `../context/NotificationContext`.
  - Destructure `{ notifications, unreadCount, markAsRead, markAllAsRead }` from `useNotifications()`.
  - Replace all references to `notifs` with `notifications`, `count` with `unreadCount`.
  - Replace the `handleNotifClick` read-marking logic with a call to `markAsRead(notif.id)`.
  - Replace the `handleToutLu` body with a call to `markAllAsRead()`.
  - Keep all JSX rendering logic (badge, dropdown, icons) unchanged.
  - _Requirements: 4.4, 4.5, 2.3, 2.4_

- [x] 11. Modify `src/App.jsx` — wrap router with `NotificationProvider`
  - Import `{ NotificationProvider }` from `./context/NotificationContext`.
  - Wrap the `<BrowserRouter>` (or its contents) with `<NotificationProvider>` so the context is available to all routes.
  - No other changes to routing or page components.
  - _Requirements: 4.1_

- [ ] 12. Write frontend tests for NotificationContext and NotificationBell
  - [ ]* 12.1 Install Vitest and React Testing Library dev dependencies
    - Add `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom` to `devDependencies` in `transferly-frontend/package.json`.
    - Update `vite.config.js` to add a `test` block: `{ environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js' }`.
    - Create `transferly-frontend/src/test/setup.js` that imports `@testing-library/jest-dom`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 12.2 Write unit tests for `NotificationContext` in `src/context/NotificationContext.test.jsx`
    - Mock `EventSource` globally; verify exactly one instance is created per authenticated session.
    - Verify `EventSource` is closed when the token is removed from `localStorage`.
    - Verify `visibilitychange` to `visible` reopens a `CLOSED` `EventSource`.
    - Verify that receiving a `message` event increments `unreadCount` and prepends to `notifications`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [ ]* 12.3 Write unit tests for `NotificationBell` in `src/components/NotificationBell.test.jsx`
    - Verify no `setInterval` is called when the component renders.
    - Verify the unread badge renders with the value from context.
    - Verify clicking a notification calls `markAsRead` from context.
    - Verify clicking "Tout marquer comme lu" calls `markAllAsRead` from context.
    - _Requirements: 4.5, 2.3, 2.4_

  - [ ]* 12.4 Write property test — Property 3: Frontend state update on received event
    - Use Vitest with a simple loop over randomly generated inputs (or `fast-check` if available).
    - Extract the state-reducer logic from `NotificationContext` into a pure function `applyNotificationEvent(state, event)`.
    - For random `(notifications[], unreadCount, newNotification)` inputs, assert `result.unreadCount === unreadCount + 1` and `result.notifications[0] === newNotification`.
    - **Property 3: Frontend state update on received event**
    - **Validates: Requirements 2.3, 2.4**

- [~] 13. Final checkpoint — Ensure all tests pass
  - Run `pytest` from `transferly-backend/` and `vitest --run` from `transferly-frontend/`. Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints (tasks 3, 8, 13) ensure incremental validation at natural boundaries.
- Property tests validate universal correctness properties defined in the design document.
- Unit tests validate specific examples and edge cases.
- The `EventSource` in `NotificationContext` must pass the JWT as a query parameter (`?token=<jwt>`) because the browser's native `EventSource` API does not support custom request headers. The backend SSE route must accept the token from either the `Authorization` header (middleware default) or the `token` query parameter.
- `hypothesis` must be added to `transferly-backend/requirements.txt` before running property tests.
