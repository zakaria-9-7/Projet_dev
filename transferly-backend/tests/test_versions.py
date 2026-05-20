"""
Tests pour le versionnement des fichiers.
Routes couvertes :
  GET  /files/<id>/versions/                         (lecture)
  POST /files/<id>/versions/<num>/restore            (ecriture)
  PUT  /files/<id>                                   (ecriture — cree la version)

Mecanisme de verrouillage concurrent teste via
app.routes.files.get_file_lock (threading.Lock par fichier_id).
"""

import io
import os
import jwt
import pytest
from datetime import datetime, timedelta

from app import create_app
from app.extensions import db as _db, bcrypt


# ══════════════════════════════════════════════════════════════════
# FIXTURES
# ══════════════════════════════════════════════════════════════════

@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "test-secret-key")
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture(scope="session")
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    yield
    with app.app_context():
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()
    # Clean up any disk files created during the test
    import shutil
    uploads_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    if os.path.exists(uploads_dir):
        for entry in os.scandir(uploads_dir):
            if entry.is_dir() and entry.name.startswith('user_'):
                shutil.rmtree(entry.path, ignore_errors=True)


# ── Helpers ──────────────────────────────────────────────────────

def _make_token(user_id, role="Utilisateur"):
    secret = os.environ.get("SECRET_KEY", "test-secret-key")
    return jwt.encode(
        {"user_id": user_id, "role": role,
         "exp": datetime.utcnow() + timedelta(hours=2)},
        secret, algorithm="HS256",
    )


def _create_user(app, nom, email, role="Utilisateur", quota=10.0):
    with app.app_context():
        from app.models.user import User
        hashed = bcrypt.generate_password_hash("MotDePasse1!").decode("utf-8")
        user = User(nom=nom, email=email, password=hashed,
                    role=role, quota=quota, quota_utilise=0.0, statut="actif")
        _db.session.add(user)
        _db.session.commit()
        uid = user.id
    return uid, _make_token(uid, role)


def _h(token):
    return {"Authorization": f"Bearer {token}"}


def _upload(client, token, content=b"Version initiale", filename="doc.txt"):
    """POST /files/ — cree le fichier et la version 1."""
    return client.post(
        "/files/",
        headers=_h(token),
        data={"file": (io.BytesIO(content), filename)},
        content_type="multipart/form-data",
    )


def _update(client, token, fichier_id, content=b"Contenu mis a jour"):
    """PUT /files/<id> — remplace le contenu et cree une nouvelle version."""
    return client.put(
        f"/files/{fichier_id}",
        headers=_h(token),
        data={"file": (io.BytesIO(content), "doc.txt")},
        content_type="multipart/form-data",
    )


def _fid(resp):
    return (resp.get_json() or {}).get("id")


def _versions(client, token, fichier_id):
    """GET /files/<id>/versions/"""
    return client.get(f"/files/{fichier_id}/versions/", headers=_h(token))


def _restore(client, token, fichier_id, numero_version):
    """POST /files/<id>/versions/<num>/restore"""
    return client.post(
        f"/files/{fichier_id}/versions/{numero_version}/restore",
        headers=_h(token),
    )


def _download(client, token, fichier_id):
    return client.get(f"/files/{fichier_id}/download", headers=_h(token))


# ══════════════════════════════════════════════════════════════════
# CREATION DE VERSIONS
# ══════════════════════════════════════════════════════════════════

class TestCreationVersion:

    def test_upload_cree_version_1(self, app, client):
        """L'upload initial cree automatiquement la version 1."""
        _, token = _create_user(app, "Alice", "alice@v.com")
        r = _upload(client, token)
        assert r.status_code == 201
        fid = _fid(r)

        with app.app_context():
            from app.models.version import VersionFichier
            v1 = VersionFichier.query.filter_by(
                fichier_id=fid, numero_version=1
            ).first()
            assert v1 is not None
            assert v1.description == "Version initiale"

    def test_update_cree_nouvelle_version(self, app, client):
        """PUT /files/<id> incremente le numero de version."""
        _, token = _create_user(app, "Bob", "bob@v.com")
        r = _upload(client, token, content=b"Contenu A")
        assert r.status_code == 201
        fid = _fid(r)

        res = _update(client, token, fid, content=b"Contenu B")
        assert res.status_code == 200
        data = res.get_json()
        assert data["numero_version"] == 2

    def test_update_multiple_incremente_correctement(self, app, client):
        """Deux mises a jour successives creent les versions 2 et 3."""
        _, token = _create_user(app, "Carol", "carol@v.com")
        r = _upload(client, token, content=b"v1")
        fid = _fid(r)

        r2 = _update(client, token, fid, content=b"v2")
        r3 = _update(client, token, fid, content=b"v3")

        assert r2.get_json()["numero_version"] == 2
        assert r3.get_json()["numero_version"] == 3

        with app.app_context():
            from app.models.version import VersionFichier
            count = VersionFichier.query.filter_by(fichier_id=fid).count()
            assert count == 3


# ══════════════════════════════════════════════════════════════════
# LISTING DES VERSIONS
# ══════════════════════════════════════════════════════════════════

class TestListingVersions:

    def test_listing_renvoie_200_et_liste(self, app, client):
        """GET /files/<id>/versions/ renvoie 200 et les champs attendus."""
        _, token = _create_user(app, "Dave", "dave@v.com")
        r = _upload(client, token)
        fid = _fid(r)

        res = _versions(client, token, fid)
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, dict)
        assert "versions" in data
        assert "permissions" in data
        versions_list = data["versions"]
        assert len(versions_list) == 1
        assert versions_list[0]["numero_version"] == 1
        assert "date_modification" in versions_list[0]
        assert "description" in versions_list[0]

    def test_listing_ordre_decroissant(self, app, client):
        """Les versions sont renvoyees du plus recent au plus ancien."""
        _, token = _create_user(app, "Eve", "eve@v.com")
        r = _upload(client, token, content=b"v1")
        fid = _fid(r)
        _update(client, token, fid, content=b"v2")
        _update(client, token, fid, content=b"v3")

        res = _versions(client, token, fid)
        assert res.status_code == 200
        nums = [v["numero_version"] for v in res.get_json()["versions"]]
        assert nums == sorted(nums, reverse=True)

    def test_listing_fichier_inexistant_404(self, app, client):
        """AdminGlobal accedant a un fichier inexistant → 404.

        require_permission laisse passer AdminGlobal avant la verif base.
        """
        _, token_admin = _create_user(app, "Admin1", "admin1@v.com",
                                      role="AdminGlobal")
        res = _versions(client, token_admin, 99999)
        assert res.status_code == 404

    def test_listing_sans_acl_403(self, app, client):
        """Utilisateur sans ACL sur le fichier → 403."""
        _, token_owner  = _create_user(app, "Frank",  "frank@v.com")
        _, token_intrus = _create_user(app, "Mallory", "mallory@v.com")

        r = _upload(client, token_owner)
        fid = _fid(r)

        res = _versions(client, token_intrus, fid)
        assert res.status_code == 403

    def test_listing_sans_token_401(self, client):
        """Pas de JWT → 401."""
        res = client.get("/files/1/versions/")
        assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════
# RESTAURATION DE VERSION
# ══════════════════════════════════════════════════════════════════

class TestRestaurationVersion:

    def test_restauration_version_valide_200(self, app, client):
        """Restaurer la version archivee ramene l'ancien contenu.

        Apres upload(A) + update(B) :
          - v2.chemin pointe sur le binaire de A (archive lors de l'update)
        Restaurer v2 ecrit A dans le fichier courant.
        Telecharger doit renvoyer A.
        """
        contenu_A = b"Contenu original version A"
        contenu_B = b"Contenu mis a jour version B"

        _, token = _create_user(app, "Grace", "grace@v.com")
        r = _upload(client, token, content=contenu_A)
        assert r.status_code == 201
        fid = _fid(r)

        res_update = _update(client, token, fid, content=contenu_B)
        assert res_update.status_code == 200
        # v2 a ete creee avec l'ancien binaire (A)
        assert res_update.get_json()["numero_version"] == 2

        # Restaurer v2 (dont chemin = binaire chiffre de A)
        res_restore = _restore(client, token, fid, 2)
        assert res_restore.status_code == 200
        assert "restaur" in res_restore.get_json()["message"].lower()

        # Le fichier courant doit a nouveau contenir A
        dl = _download(client, token, fid)
        assert dl.status_code == 200
        assert dl.data == contenu_A

    def test_restauration_archive_letat_courant(self, app, client):
        """Apres restauration, une nouvelle entree de version est creee."""
        _, token = _create_user(app, "Heidi", "heidi@v.com")
        r = _upload(client, token, content=b"A")
        fid = _fid(r)
        _update(client, token, fid, content=b"B")

        with app.app_context():
            from app.models.version import VersionFichier
            count_avant = VersionFichier.query.filter_by(fichier_id=fid).count()

        _restore(client, token, fid, 2)

        with app.app_context():
            from app.models.version import VersionFichier
            count_apres = VersionFichier.query.filter_by(fichier_id=fid).count()

        assert count_apres == count_avant + 1

    def test_restauration_version_inexistante_404(self, app, client):
        """Numero de version inexistant → 404."""
        _, token = _create_user(app, "Ivan", "ivan@v.com")
        r = _upload(client, token)
        fid = _fid(r)

        res = _restore(client, token, fid, 999)
        assert res.status_code == 404

    def test_restauration_sans_acl_ecriture_403(self, app, client):
        """Utilisateur sans permission ecriture ne peut pas restaurer."""
        _, token_owner  = _create_user(app, "Judy",    "judy@v.com")
        _, token_intrus = _create_user(app, "Oscar",   "oscar@v.com")

        r = _upload(client, token_owner, content=b"Contenu")
        fid = _fid(r)

        res = _restore(client, token_intrus, fid, 1)
        assert res.status_code == 403

    def test_restauration_sans_token_401(self, client):
        """Pas de JWT → 401."""
        res = client.post("/files/1/versions/1/restore")
        assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════
# VERROUILLAGE CONCURRENT
# ══════════════════════════════════════════════════════════════════

class TestVerrouConcurrent:

    def test_update_bloque_si_verrou_tenu_423(self, app, client):
        """Si le verrou du fichier est deja tenu, PUT renvoie 423.

        Simule un autre thread qui detient le verrou en l'acquierant
        directement depuis le module files — sans threads reels.
        """
        _, token = _create_user(app, "Kara", "kara@v.com")
        r = _upload(client, token, content=b"Fichier cible")
        assert r.status_code == 201
        fid = _fid(r)

        from app.routes.files import get_file_lock
        lock = get_file_lock(fid)
        lock.acquire()
        try:
            res = _update(client, token, fid, content=b"Tentative concurrente")
            assert res.status_code == 423
        finally:
            lock.release()

    def test_update_possible_apres_liberation_verrou(self, app, client):
        """Le verrou libere, une nouvelle mise a jour reussit (200)."""
        _, token = _create_user(app, "Lena", "lena@v.com")
        r = _upload(client, token, content=b"Base")
        fid = _fid(r)

        from app.routes.files import get_file_lock
        lock = get_file_lock(fid)

        # Acquiert puis relache immediatement
        lock.acquire()
        lock.release()

        res = _update(client, token, fid, content=b"Apres liberation")
        assert res.status_code == 200


# ── New helpers ───────────────────────────────────────────────────

def _get_file(client, token, fichier_id):
    return client.get(f"/files/{fichier_id}", headers=_h(token))


def _preview_version(client, token, fichier_id, numero_version):
    return client.get(f"/files/{fichier_id}/versions/{numero_version}/preview", headers=_h(token))


def _download_version(client, token, fichier_id, numero_version):
    return client.get(f"/files/{fichier_id}/versions/{numero_version}/download", headers=_h(token))


# ══════════════════════════════════════════════════════════════════
# 6.1–6.3  RESTAURATION — auteur_id, verrou, binaire manquant
# ══════════════════════════════════════════════════════════════════

class TestRestoreAuteurId:

    def test_restore_sets_auteur_id_on_archive_version(self, app, client):
        """6.1 — Après upload(A)+update(B), restore v2 crée une entrée archive
        dont auteur_id est l'id de l'utilisateur qui restaure.

        Validates: Requirements 1.1 / Property 4
        """
        uid, token = _create_user(app, "RestoreAuteur1", "ra1@v.com")
        r = _upload(client, token, content=b"Contenu A")
        assert r.status_code == 201
        fid = _fid(r)

        res_update = _update(client, token, fid, content=b"Contenu B")
        assert res_update.status_code == 200

        res_restore = _restore(client, token, fid, 2)
        assert res_restore.status_code == 200

        with app.app_context():
            from app.models.version import VersionFichier
            # La version archivée la plus récente est celle créée par restore
            latest = (
                VersionFichier.query
                .filter_by(fichier_id=fid)
                .order_by(VersionFichier.numero_version.desc())
                .first()
            )
            assert latest is not None
            assert latest.auteur_id == uid

    def test_restore_returns_423_when_lock_held(self, app, client):
        """6.2 — Si le verrou du fichier est déjà tenu, POST restore → 423.

        Validates: Requirements 1.3 / Property 6
        """
        _, token = _create_user(app, "RestoreLock1", "rl1@v.com")
        r = _upload(client, token, content=b"Contenu A")
        assert r.status_code == 201
        fid = _fid(r)

        _update(client, token, fid, content=b"Contenu B")

        from app.routes.files import get_file_lock
        lock = get_file_lock(fid)
        lock.acquire()
        try:
            res = _restore(client, token, fid, 2)
            assert res.status_code == 423
        finally:
            lock.release()

    def test_restore_missing_binary_returns_404(self, app, client):
        """6.3 — Restaurer une version dont le .enc est absent du disque → 404.

        Validates: Requirements 1.2
        """
        _, token = _create_user(app, "RestoreMissing1", "rm1@v.com")
        r = _upload(client, token, content=b"Contenu A")
        assert r.status_code == 201
        fid = _fid(r)

        _update(client, token, fid, content=b"Contenu B")

        # Supprime le binaire de la version archivée (v2)
        with app.app_context():
            from app.models.version import VersionFichier
            v = VersionFichier.query.filter_by(
                fichier_id=fid, numero_version=2
            ).first()
            assert v is not None
            if v.chemin and os.path.exists(v.chemin):
                os.remove(v.chemin)

        res = _restore(client, token, fid, 2)
        assert res.status_code == 404


# ══════════════════════════════════════════════════════════════════
# 6.4–6.6  GET /files/<id>  — endpoint fichier unique
# ══════════════════════════════════════════════════════════════════

class TestGetFileSingleEndpoint:

    def test_get_file_200_for_owner(self, app, client):
        """6.4 — GET /files/<id> renvoie 200 avec les champs attendus pour le propriétaire.

        Validates: Requirement 2.2
        """
        _, token = _create_user(app, "GetFile1", "gf1@v.com")
        r = _upload(client, token, content=b"Contenu rapport", filename="rapport.txt")
        assert r.status_code == 201
        fid = _fid(r)

        res = _get_file(client, token, fid)
        assert res.status_code == 200
        data = res.get_json()
        assert data["nom"] == "rapport.txt"
        assert "id" in data
        assert "taille" in data
        assert "date_creation" in data

    def test_get_file_403_for_user_without_acl(self, app, client):
        """6.5 — GET /files/<id> renvoie 403 pour un utilisateur sans ACL.

        Validates: Requirement 2.3
        """
        _, token_owner   = _create_user(app, "GetFile2Owner", "gf2o@v.com")
        _, token_intrus  = _create_user(app, "GetFile2Intrus", "gf2i@v.com")

        r = _upload(client, token_owner, content=b"Contenu secret")
        assert r.status_code == 201
        fid = _fid(r)

        res = _get_file(client, token_intrus, fid)
        assert res.status_code == 403

    def test_get_file_404_for_nonexistent_file(self, app, client):
        """6.6 — GET /files/99999 renvoie 404 (AdminGlobal passe le check ACL).

        Validates: Requirement 2.4
        """
        _, token_admin = _create_user(app, "GetFile3Admin", "gf3a@v.com",
                                      role="AdminGlobal")
        res = _get_file(client, token_admin, 99999)
        assert res.status_code == 404


# ══════════════════════════════════════════════════════════════════
# 6.7  GET /files/<id>/versions/ — flags de permissions
# ══════════════════════════════════════════════════════════════════

class TestVersionsPermissionsFlags:

    def test_permissions_flags_correct(self, app, client):
        """6.7 — La réponse de GET /files/<id>/versions/ inclut un objet
        permissions avec les bons flags selon le rôle/ACL de l'appelant.

        Validates: Property 10
        """
        # Propriétaire — toutes les permissions
        uid_owner, token_owner = _create_user(app, "PermOwner", "perm_owner@v.com")
        r = _upload(client, token_owner, content=b"Contenu perm")
        assert r.status_code == 201
        fid = _fid(r)

        res_owner = _versions(client, token_owner, fid)
        assert res_owner.status_code == 200
        perms_owner = res_owner.get_json()["permissions"]
        assert perms_owner["can_restore"]  is True
        assert perms_owner["can_preview"]  is True
        assert perms_owner["can_download"] is True

        # Lecteur seul — lecture=True, ecriture=False, download=False
        uid_reader, token_reader = _create_user(app, "PermReader", "perm_reader@v.com")
        with app.app_context():
            from app.models.acl import ACL
            from app.extensions import db as _db
            acl = ACL(
                user_id=uid_reader,
                fichier_id=fid,
                lecture=True,
                ecriture=False,
                download=False,
                upload=False,
                suppression=False,
                partage=False,
            )
            _db.session.add(acl)
            _db.session.commit()

        res_reader = _versions(client, token_reader, fid)
        assert res_reader.status_code == 200
        perms_reader = res_reader.get_json()["permissions"]
        assert perms_reader["can_restore"]  is False
        assert perms_reader["can_preview"]  is True
        assert perms_reader["can_download"] is False

        # AdminGlobal — toutes les permissions
        _, token_admin = _create_user(app, "PermAdmin", "perm_admin@v.com",
                                      role="AdminGlobal")
        res_admin = _versions(client, token_admin, fid)
        assert res_admin.status_code == 200
        perms_admin = res_admin.get_json()["permissions"]
        assert perms_admin["can_restore"]  is True
        assert perms_admin["can_preview"]  is True
        assert perms_admin["can_download"] is True


# ══════════════════════════════════════════════════════════════════
# 6.8–6.10  GET /files/<id>/versions/<num>/preview
# ══════════════════════════════════════════════════════════════════

class TestVersionPreview:

    def test_preview_200_returns_decrypted_content(self, app, client):
        """6.8 — Preview de la v1 renvoie 200 et le contenu déchiffré.

        Validates: Property 8
        """
        contenu = b"Contenu preview v1"
        _, token = _create_user(app, "Preview1", "preview1@v.com")
        r = _upload(client, token, content=contenu, filename="doc.txt")
        assert r.status_code == 201
        fid = _fid(r)

        res = _preview_version(client, token, fid, 1)
        assert res.status_code == 200
        assert res.data == contenu

    def test_preview_403_without_lecture_permission(self, app, client):
        """6.9 — Preview sans ACL lecture → 403.

        Validates: Requirement 3.3
        """
        _, token_owner  = _create_user(app, "Preview2Owner",  "preview2o@v.com")
        _, token_intrus = _create_user(app, "Preview2Intrus", "preview2i@v.com")

        r = _upload(client, token_owner, content=b"Contenu secret")
        assert r.status_code == 201
        fid = _fid(r)

        res = _preview_version(client, token_intrus, fid, 1)
        assert res.status_code == 403

    def test_preview_404_for_unknown_version(self, app, client):
        """6.10 — Preview d'un numéro de version inexistant → 404.

        Validates: Requirement 3.4
        """
        _, token = _create_user(app, "Preview3", "preview3@v.com")
        r = _upload(client, token, content=b"Contenu")
        assert r.status_code == 201
        fid = _fid(r)

        res = _preview_version(client, token, fid, 999)
        assert res.status_code == 404


# ══════════════════════════════════════════════════════════════════
# 6.11–6.13  GET /files/<id>/versions/<num>/download
# ══════════════════════════════════════════════════════════════════

class TestVersionDownload:

    def test_download_200_returns_content_as_attachment(self, app, client):
        """6.11 — Download de la v1 renvoie 200, le contenu déchiffré,
        et un header Content-Disposition avec 'attachment'.

        Validates: Property 9
        """
        contenu = b"Contenu download v1"
        _, token = _create_user(app, "Download1", "download1@v.com")
        r = _upload(client, token, content=contenu, filename="doc.txt")
        assert r.status_code == 201
        fid = _fid(r)

        res = _download_version(client, token, fid, 1)
        assert res.status_code == 200
        assert res.data == contenu
        content_disposition = res.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition

    def test_download_403_without_download_permission(self, app, client):
        """6.12 — Download sans ACL download → 403.

        Validates: Requirement 4.3
        """
        _, token_owner  = _create_user(app, "Download2Owner",  "download2o@v.com")
        _, token_intrus = _create_user(app, "Download2Intrus", "download2i@v.com")

        r = _upload(client, token_owner, content=b"Contenu secret")
        assert r.status_code == 201
        fid = _fid(r)

        res = _download_version(client, token_intrus, fid, 1)
        assert res.status_code == 403

    def test_download_404_for_unknown_version(self, app, client):
        """6.13 — Download d'un numéro de version inexistant → 404.

        Validates: Requirement 4.4
        """
        _, token = _create_user(app, "Download3", "download3@v.com")
        r = _upload(client, token, content=b"Contenu")
        assert r.status_code == 201
        fid = _fid(r)

        res = _download_version(client, token, fid, 999)
        assert res.status_code == 404
