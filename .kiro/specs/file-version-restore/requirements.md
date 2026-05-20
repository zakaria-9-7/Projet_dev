# Requirements Document

## Introduction

This document captures the requirements for hardening and extending the file version restore feature in Transferly. The existing backend endpoint (`POST /files/<id>/versions/<num>/restore`) and frontend page (`FileVersions.jsx`) are already in place. This feature addresses four identified gaps in the current implementation and adds per-version preview and download capabilities.

**Gaps addressed:**
1. `auteur_id` is not set on the archive `VersionFichier` row created during restore
2. The restore endpoint does not acquire the per-file lock, creating a race condition with concurrent `PUT /files/<id>` calls
3. `FileVersions.jsx` fetches the file name by scanning the full `GET /files/` list, which is inefficient and fails for shared files
4. The "Restaurer" button is visible to users who only have `lecture` permission (no `ecriture`)

**New capabilities:**
- Per-version preview: `GET /files/<id>/versions/<num>/preview`
- Per-version download: `GET /files/<id>/versions/<num>/download`
- The versions list response includes the caller's ACL flags (`can_restore`, `can_preview`, `can_download`) so the frontend can show/hide buttons correctly

---

## Glossary

- **RestoreHandler**: The Flask route handler for `POST /files/<fichier_id>/versions/<numero_version>/restore` in `app/routes/version.py`
- **VersionFichier**: The SQLAlchemy model representing a single archived version of a file (`app/models/version.py`)
- **Fichier**: The SQLAlchemy model representing a file record (`app/models/fichier.py`)
- **ACL**: The access-control list model (`app/models/acl.py`); each row grants named permissions (`lecture`, `ecriture`, `download`, etc.) to a user on a specific file
- **FileLock**: The per-file `threading.Lock` managed by `get_file_lock(fichier_id)` in `app/routes/files.py`
- **VersionsBlueprint**: The Flask blueprint `versions_bp` registered at `/files/<fichier_id>/versions`
- **FileVersions**: The React page component at `src/pages/FileVersions.jsx`
- **VersionRow**: The React sub-component inside `FileVersions` that renders a single version entry
- **FilePreviewModal**: The existing React modal component at `src/components/FilePreviewModal.jsx`
- **AdminGlobal**: A user with the `AdminGlobal` role, who bypasses all ACL checks by design

---

## Requirements

### Requirement 1: Restore Handler — auteur_id and File Lock

**User Story:** As a file owner, I want every restore operation to be correctly attributed and race-condition-free, so that the audit trail is accurate and concurrent edits do not corrupt the file.

#### Acceptance Criteria

1. WHEN a restore is triggered, THE RestoreHandler SHALL set `auteur_id` to `g.user['id']` on the newly created archive `VersionFichier` row.
2. WHEN a restore is triggered, THE RestoreHandler SHALL acquire the `FileLock` for the target `fichier_id` before performing any disk or database mutation.
3. WHILE the `FileLock` for a `fichier_id` is held by another operation, THE RestoreHandler SHALL return HTTP 423 with `{"error": "Fichier en cours de modification par un autre utilisateur"}`.
4. WHEN the restore completes (success or failure), THE RestoreHandler SHALL release the `FileLock`.

---

### Requirement 2: GET /files/<id> Endpoint

**User Story:** As a frontend developer, I want a single-file metadata endpoint, so that `FileVersions.jsx` can fetch the file name efficiently without loading the entire file list.

#### Acceptance Criteria

1. THE VersionsBlueprint SHALL expose `GET /files/<fichier_id>` that returns the metadata for a single file.
2. WHEN a user with `lecture` permission requests `GET /files/<fichier_id>`, THE System SHALL return HTTP 200 with `{"id": int, "nom": str, "taille": float, "date_creation": str}`.
3. WHEN a user without any ACL on the file requests `GET /files/<fichier_id>`, THE System SHALL return HTTP 403.
4. WHEN `GET /files/<fichier_id>` is called for a non-existent file, THE System SHALL return HTTP 404 with `{"error": "Fichier introuvable"}`.
5. WHEN an unauthenticated request is made to `GET /files/<fichier_id>`, THE System SHALL return HTTP 401.

---

### Requirement 3: Version Preview Endpoint

**User Story:** As a user with read access, I want to preview the content of any archived version directly in the browser, so that I can inspect past states without downloading or restoring.

#### Acceptance Criteria

1. THE VersionsBlueprint SHALL expose `GET /files/<fichier_id>/versions/<numero_version>/preview`.
2. WHEN a user with `lecture` permission requests the preview endpoint for a valid version, THE System SHALL decrypt the archived `.enc` binary for that version and return HTTP 200 with the plaintext content and the appropriate MIME type.
3. WHEN a user without `lecture` permission requests the preview endpoint, THE System SHALL return HTTP 403.
4. WHEN the preview endpoint is called for a non-existent version number, THE System SHALL return HTTP 404 with `{"error": "Version introuvable"}`.
5. WHEN the preview endpoint is called for a version whose `.enc` binary is absent from disk, THE System SHALL return HTTP 404 with `{"error": "Binaire de la version absente du disque"}`.
6. WHEN an unauthenticated request is made to the preview endpoint, THE System SHALL return HTTP 401.

---

### Requirement 4: Version Download Endpoint

**User Story:** As a user with download access, I want to download the content of any archived version as a file attachment, so that I can retrieve past states of a file.

#### Acceptance Criteria

1. THE VersionsBlueprint SHALL expose `GET /files/<fichier_id>/versions/<numero_version>/download`.
2. WHEN a user with `download` permission requests the download endpoint for a valid version, THE System SHALL decrypt the archived `.enc` binary for that version and return HTTP 200 with the plaintext content as a file attachment using the original file name.
3. WHEN a user without `download` permission requests the download endpoint, THE System SHALL return HTTP 403.
4. WHEN the download endpoint is called for a non-existent version number, THE System SHALL return HTTP 404 with `{"error": "Version introuvable"}`.
5. WHEN the download endpoint is called for a version whose `.enc` binary is absent from disk, THE System SHALL return HTTP 404 with `{"error": "Binaire de la version absente du disque"}`.
6. WHEN an unauthenticated request is made to the download endpoint, THE System SHALL return HTTP 401.

---

### Requirement 5: ACL Flags in Versions List Response

**User Story:** As a frontend developer, I want the versions list response to include the caller's effective permissions, so that `FileVersions.jsx` can show or hide action buttons without making additional ACL requests.

#### Acceptance Criteria

1. WHEN `GET /files/<fichier_id>/versions/` is called by an authenticated user, THE VersionsBlueprint SHALL include a top-level `permissions` object in the response with boolean fields `can_restore`, `can_preview`, and `can_download`.
2. WHEN the caller has `ecriture` permission on the file, THE System SHALL set `can_restore` to `true` in the response.
3. WHEN the caller lacks `ecriture` permission on the file, THE System SHALL set `can_restore` to `false` in the response.
4. WHEN the caller has `lecture` permission on the file, THE System SHALL set `can_preview` to `true` in the response.
5. WHEN the caller has `download` permission on the file, THE System SHALL set `can_download` to `true` in the response.
6. WHERE the caller is an `AdminGlobal`, THE System SHALL set `can_restore`, `can_preview`, and `can_download` all to `true`.

---

### Requirement 6: Frontend — File Name Fetch

**User Story:** As a user browsing version history, I want the page to load the file name correctly even for shared files, so that the header always shows the right file name.

#### Acceptance Criteria

1. WHEN `FileVersions` mounts with a valid `fileId` query parameter, THE FileVersions SHALL fetch the file name by calling `GET /files/<fileId>` (single-file endpoint) instead of `GET /files/`.
2. IF the `GET /files/<fileId>` call returns an error, THEN THE FileVersions SHALL display a fallback name of `"Document sans nom"` and continue rendering the version list.

---

### Requirement 7: Frontend — Permission-Gated Action Buttons

**User Story:** As a user with read-only access, I want the interface to hide actions I am not allowed to perform, so that I am not presented with buttons that will fail with a 403 error.

#### Acceptance Criteria

1. WHEN the versions list response includes `permissions.can_restore = false`, THE VersionRow SHALL not render the "Restaurer" button for any version row.
2. WHEN the versions list response includes `permissions.can_restore = true`, THE VersionRow SHALL render the "Restaurer" button for all non-current version rows.
3. WHEN the versions list response includes `permissions.can_preview = true`, THE VersionRow SHALL render a "Prévisualiser" button for each version row.
4. WHEN the versions list response includes `permissions.can_download = true`, THE VersionRow SHALL render a "Télécharger" button for each version row.

---

### Requirement 8: Frontend — Version Preview and Download Actions

**User Story:** As a user, I want to preview or download any specific version of a file directly from the version history page, so that I can inspect or retrieve past content without restoring it.

#### Acceptance Criteria

1. WHEN a user clicks the "Prévisualiser" button on a `VersionRow`, THE FileVersions SHALL open `FilePreviewModal` with the content fetched from `GET /files/<id>/versions/<num>/preview`.
2. WHEN a user clicks the "Télécharger" button on a `VersionRow`, THE FileVersions SHALL trigger a file download using `GET /files/<id>/versions/<num>/download`.
3. WHEN the preview request fails, THE FileVersions SHALL display an error toast with the server error message.
4. WHEN the download request fails, THE FileVersions SHALL display an error toast with the server error message.
