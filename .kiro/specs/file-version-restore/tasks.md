# Tasks: File Version Restore

## Task List

- [x] 1 Backend — Fix restore handler (auteur_id + file lock)
  - [x] 1.1 Set auteur_id on the archive VersionFichier row in restore_version
  - [x] 1.2 Acquire the per-file FileLock in restore_version before any disk/DB mutation
  - [x] 1.3 Release the FileLock in a finally block in restore_version

- [x] 2 Backend — Add GET /files/<fichier_id> single-file endpoint
  - [x] 2.1 Add route GET /files/<fichier_id> to files_bp in app/routes/files.py
  - [x] 2.2 Protect the route with require_permission('lecture')
  - [x] 2.3 Return 200 with {id, nom, taille, date_creation} or 404 if not found

- [x] 3 Backend — Add ACL permission flags to GET /files/<fichier_id>/versions/ response
  - [x] 3.1 Compute can_restore, can_preview, can_download from the caller's ACL (or True for AdminGlobal)
  - [x] 3.2 Include a top-level permissions object in the JSON response alongside the versions array

- [x] 4 Backend — Add version preview endpoint
  - [x] 4.1 Add route GET /files/<fichier_id>/versions/<numero_version>/preview to versions_bp
  - [x] 4.2 Protect the route with require_permission('lecture')
  - [x] 4.3 Look up the VersionFichier row; return 404 if not found or binary missing on disk
  - [x] 4.4 Decrypt the archived .enc binary and return it with the correct MIME type (reuse mime_map from files.py)

- [x] 5 Backend — Add version download endpoint
  - [x] 5.1 Add route GET /files/<fichier_id>/versions/<numero_version>/download to versions_bp
  - [x] 5.2 Protect the route with require_permission('download')
  - [x] 5.3 Look up the VersionFichier row; return 404 if not found or binary missing on disk
  - [x] 5.4 Decrypt the archived .enc binary and return it as an attachment using the Fichier.nom filename

- [x] 6 Backend — Tests for new and fixed endpoints
  - [x] 6.1 Add test: restore sets auteur_id on the new archive version row (Property 4)
  - [x] 6.2 Add test: restore returns 423 when FileLock is held (Property 6 / Requirement 1.3)
  - [x] 6.3 Add test: restore of a version with missing binary returns 404
  - [x] 6.4 Add test: GET /files/<id> returns 200 with correct nom for owner (Requirement 2.2)
  - [x] 6.5 Add test: GET /files/<id> returns 403 for user without ACL (Requirement 2.3)
  - [x] 6.6 Add test: GET /files/<id> returns 404 for non-existent file (Requirement 2.4)
  - [x] 6.7 Add test: GET /files/<id>/versions/ response includes permissions object with correct flags (Property 10)
  - [x] 6.8 Add test: GET /files/<id>/versions/<num>/preview returns 200 with decrypted content for lecture user (Property 8)
  - [x] 6.9 Add test: GET /files/<id>/versions/<num>/preview returns 403 without lecture permission (Requirement 3.3)
  - [x] 6.10 Add test: GET /files/<id>/versions/<num>/preview returns 404 for unknown version (Requirement 3.4)
  - [x] 6.11 Add test: GET /files/<id>/versions/<num>/download returns 200 with correct content as attachment for download user (Property 9)
  - [x] 6.12 Add test: GET /files/<id>/versions/<num>/download returns 403 without download permission (Requirement 4.3)
  - [x] 6.13 Add test: GET /files/<id>/versions/<num>/download returns 404 for unknown version (Requirement 4.4)

- [x] 7 Frontend — Fix file name fetch in FileVersions.jsx
  - [x] 7.1 Replace the GET /files/ call with GET /files/<fileId> in the useEffect of FileVersions
  - [x] 7.2 Export a getFile(id) helper from api/auth.js that calls GET /files/<id>
  - [x] 7.3 Handle errors from GET /files/<fileId> gracefully (fall back to "Document sans nom")

- [x] 8 Frontend — Permission-gated action buttons in FileVersions.jsx
  - [x] 8.1 Store the permissions object from the GET /files/<id>/versions/ response in component state
  - [x] 8.2 Hide the "Restaurer" button in VersionRow when permissions.can_restore is false
  - [x] 8.3 Show the "Prévisualiser" button in VersionRow when permissions.can_preview is true
  - [x] 8.4 Show the "Télécharger" button in VersionRow when permissions.can_download is true

- [x] 9 Frontend — Version preview and download actions in FileVersions.jsx
  - [x] 9.1 Export getVersionPreview(fileId, num) and getVersionDownload(fileId, num) helpers in api/auth.js
  - [x] 9.2 Add previewTarget state to FileVersions; set it when the "Prévisualiser" button is clicked
  - [x] 9.3 Render FilePreviewModal when previewTarget is set, passing a version-specific file object with id and nom so the modal fetches from /files/<id>/versions/<num>/preview
  - [x] 9.4 Implement handleVersionDownload in FileVersions that calls GET /files/<id>/versions/<num>/download and triggers a browser download (reuse the blob + anchor pattern from existing download logic)
  - [x] 9.5 Show an error toast when preview or download fails
