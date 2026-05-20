# Requirements Document

## Introduction

Transferly currently delivers notifications by polling: the frontend calls `GET /notifications/non-lues` every 30 seconds. This means users can wait up to 30 seconds before seeing a new notification badge, and every active tab generates constant HTTP traffic even when nothing has changed.

This feature replaces polling with a persistent, real-time push channel so that notifications appear in the UI within one second of being created on the server. The existing notification model, REST endpoints, and `notifier.py` service are preserved; only the delivery mechanism changes.

The chosen transport is **Server-Sent Events (SSE)**, a unidirectional HTTP/1.1 streaming protocol that is natively supported by browsers, works through standard CORS and JWT middleware, and requires no additional infrastructure (no WebSocket upgrade, no message broker).

---

## Glossary

- **SSE_Stream**: The server-side component that maintains a persistent HTTP connection and pushes `text/event-stream` frames to a connected client.
- **SSE_Client**: The browser-side `EventSource` object that receives frames from the SSE_Stream.
- **NotificationBell**: The existing React component (`NotificationBell.jsx`) that displays the unread badge and dropdown.
- **Notifier**: The existing Python service (`notifier.py`) that creates `Notification` rows in the database.
- **NotificationContext**: A new React context that owns the SSE connection lifecycle and exposes notification state to the component tree.
- **Notification**: An existing database record with fields `id`, `user_id`, `type`, `message`, `lien`, `lu`, `date_creation`.
- **Unread_Count**: The number of `Notification` rows for the authenticated user where `lu = False`.
- **JWT**: The JSON Web Token carried in the `Authorization: Bearer <token>` header, used to authenticate all API requests.

---

## Requirements

### Requirement 1: SSE Connection Endpoint

**User Story:** As an authenticated user, I want the browser to open a persistent connection to the server so that the server can push notifications to me without polling.

#### Acceptance Criteria

1. THE SSE_Stream SHALL expose a `GET /notifications/stream` endpoint that returns a `Content-Type: text/event-stream` response.
2. WHEN a client connects to `/notifications/stream`, THE SSE_Stream SHALL authenticate the request using the JWT supplied in the `Authorization: Bearer` header.
3. IF the JWT is absent or invalid on a connection attempt, THEN THE SSE_Stream SHALL respond with HTTP 401 and close the connection.
4. WHILE a client is connected, THE SSE_Stream SHALL send a keep-alive comment (`: keep-alive`) at most every 30 seconds to prevent proxy and browser timeouts.
5. THE SSE_Stream SHALL support at least one concurrent connection per authenticated user.
6. WHEN a client disconnects, THE SSE_Stream SHALL release all server-side resources associated with that connection within 5 seconds.

---

### Requirement 2: Real-Time Notification Delivery

**User Story:** As an authenticated user, I want new notifications to appear in my browser within one second of being created, so that I can act on them promptly.

#### Acceptance Criteria

1. WHEN the Notifier creates a `Notification` row for a `user_id`, THE SSE_Stream SHALL push an SSE event of type `notification` to all active connections for that `user_id` within 1 second.
2. THE SSE event payload SHALL be a JSON object containing `id`, `type`, `message`, `lien`, `lu`, and `date_creation` fields matching the `Notification` row.
3. WHEN the SSE_Client receives a `notification` event, THE NotificationBell SHALL increment the Unread_Count badge by 1 without issuing a polling request.
4. WHEN the SSE_Client receives a `notification` event, THE NotificationBell SHALL prepend the new notification to the dropdown list without a full reload.
5. IF the SSE connection is lost, THEN THE SSE_Client SHALL attempt to reconnect using the browser's built-in `EventSource` retry mechanism with a back-off interval no greater than 5 seconds.

---

### Requirement 3: Connection Lifecycle Management

**User Story:** As a platform operator, I want SSE connections to be managed safely so that idle or stale connections do not exhaust server resources.

#### Acceptance Criteria

1. THE SSE_Stream SHALL maintain an in-memory registry that maps each `user_id` to its set of active response queues.
2. WHEN a client disconnects (normal close or network error), THE SSE_Stream SHALL remove the corresponding queue from the registry.
3. WHILE the registry contains a queue for a `user_id`, THE SSE_Stream SHALL deliver all events destined for that `user_id` to every queue in the set.
4. IF a push to a queue raises an exception (e.g., broken pipe), THEN THE SSE_Stream SHALL remove that queue from the registry and continue delivering to remaining queues for that `user_id`.
5. THE SSE_Stream SHALL not persist connection state to the database; the registry SHALL be in-memory only.

---

### Requirement 4: Frontend SSE Integration

**User Story:** As a developer, I want a single, shared SSE connection managed by a React context so that all components receive real-time updates without duplicating connection logic.

#### Acceptance Criteria

1. THE NotificationContext SHALL open exactly one `EventSource` connection per authenticated browser session.
2. WHEN the user logs out or the JWT is removed from storage, THE NotificationContext SHALL close the `EventSource` connection immediately.
3. WHEN the user logs in and a JWT is stored, THE NotificationContext SHALL open the `EventSource` connection within 500 milliseconds.
4. THE NotificationContext SHALL expose `notifications` (array), `unreadCount` (integer), `markAsRead(id)`, and `markAllAsRead()` functions to consuming components.
5. THE NotificationBell SHALL consume state and actions from NotificationContext instead of managing its own polling interval.
6. WHEN the application tab becomes visible after being hidden, THE NotificationContext SHALL verify the `EventSource` connection is open and reopen it if it is closed.

---

### Requirement 5: Backward Compatibility with REST Endpoints

**User Story:** As a developer, I want the existing REST notification endpoints to remain fully functional so that clients that cannot use SSE (e.g., mobile apps, scripts) continue to work.

#### Acceptance Criteria

1. THE SSE_Stream SHALL not remove or modify the existing `GET /notifications`, `GET /notifications/non-lues`, `PUT /notifications/<id>/lu`, or `PUT /notifications/tout-lu` endpoints.
2. WHEN a client calls `PUT /notifications/<id>/lu`, THE SSE_Stream SHALL mark the notification as read in the database and return HTTP 200.
3. WHEN a client calls `PUT /notifications/tout-lu`, THE SSE_Stream SHALL mark all unread notifications for the authenticated user as read and return HTTP 200.
4. THE NotificationContext SHALL use the REST `PUT` endpoints to persist read-state changes, and SHALL update local state optimistically without waiting for an SSE event.

---

### Requirement 6: Security

**User Story:** As a security-conscious operator, I want SSE connections to be authenticated and scoped per user so that one user cannot receive another user's notifications.

#### Acceptance Criteria

1. THE SSE_Stream SHALL only push events to the queue registered for the `user_id` that matches the `user_id` in the notification row.
2. THE SSE_Stream SHALL re-validate the JWT on every new connection attempt; a token that was valid at connection time but later expires SHALL not grant access to future connections.
3. IF a notification is created for a `user_id` that has no active SSE connection, THEN THE SSE_Stream SHALL silently discard the push attempt without error.
4. THE SSE_Stream SHALL set `Cache-Control: no-cache` and `X-Accel-Buffering: no` headers on every stream response to prevent proxy caching and buffering.
