"""
Tests pour les routes fichiers — GET /files/, POST /files/,
GET /files/<id>/download, DELETE /files/<id>
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


# ── Helpers ──────────────────────────────────────────────────────

def _make_token(user_id, role="Utilisateur"):
    secret = os.environ.get("SECRET_KEY", "test-secret-key")
    return jwt.encode(
        {"user_id": user_id, "role": role,
         "exp": datetime.utcnow() + timedelta(hours=2)},
        secret, algorithm="HS256",
    )


def _create_user(app, nom, email, role="Utilisateur", quota=2.0):
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


def _upload(client, token, content=b"Contenu test", filename="document.txt"):
    return client.post(
        "/files/",
        headers=_h(token),
        data={"file": (io.BytesIO(content), filename)},
        content_type="multipart/form-data",
    )


def _fid(resp):
    return (resp.get_json() or {}).get("id")


# ══════════════════════════════════════════════════════════════════
# TESTS UPLOAD
# ══════════════════════════════════════════════════════════════════

class TestUpload:

    def test_upload_fichier_valide_201(self, app, client):
        """Upload d'un fichier avec extension autorisée → 201 + id renvoyé."""
        _, token = _create_user(app, "Alice", "alice@test.com")
        res = _upload(client, token, content=b"Rapport trimestriel", filename="rapport.pdf")
        assert res.status_code == 201
        data = res.get_json()
        assert "id" in data
        assert data["nom"] == "rapport.pdf"

    def test_upload_extension_exe_refuse(self, app, client):
        """Extension .exe non autorisée → 415."""
        _, token = _create_user(app, "Bob", "bob@test.com")
        res = _upload(client, token, content=b"MZ\x90\x00", filename="virus.exe")
        assert res.status_code == 415

    def test_upload_extension_sh_refuse(self, app, client):
        """Extension .sh non autorisée → 415."""
        _, token = _create_user(app, "Carol", "carol@test.com")
        res = _upload(client, token, content=b"#!/bin/bash\nrm -rf /", filename="hack.sh")
        assert res.status_code == 415

    def test_upload_sans_token_refuse(self, client):
        """Upload sans JWT → 401."""
        res = client.post(
            "/files/",
            data={"file": (io.BytesIO(b"test"), "doc.txt")},
            content_type="multipart/form-data",
        )
        assert res.status_code == 401

    def test_upload_quota_depasse_413(self, app, client):
        """Upload dépassant le quota utilisateur → 413.

        quota = 0.000001 GB ≈ 1 Ko.
        Fichier = 10 000 octets ≈ 9,77 Ko → dépasse le quota.
        """
        _, token = _create_user(app, "Dave", "dave@test.com", quota=0.000001)
        res = _upload(client, token, content=b"X" * 10_000, filename="gros.txt")
        assert res.status_code == 413

    def test_upload_cree_fichier_en_base(self, app, client):
        """Après upload, le fichier est présent en base de données."""
        _, token = _create_user(app, "Eve", "eve@test.com")
        res = _upload(client, token, content=b"Donnees", filename="data.csv")
        assert res.status_code == 201
        fid = _fid(res)
        with app.app_context():
            from app.models.fichier import Fichier
            assert _db.session.get(Fichier, fid) is not None


# ══════════════════════════════════════════════════════════════════
# TESTS LISTING
# ══════════════════════════════════════════════════════════════════

class TestListing:

    def test_listing_renvoie_200_et_liste(self, app, client):
        """GET /files/ → 200 avec la clé 'files' et folder_id inclus."""
        _, token = _create_user(app, "Frank", "frank@test.com")
        _upload(client, token, content=b"Fichier 1", filename="f1.txt")
        _upload(client, token, content=b"Fichier 2", filename="f2.txt")

        res = client.get("/files/", headers=_h(token))
        assert res.status_code == 200
        data = res.get_json()
        assert "files" in data
        assert len(data["files"]) == 2
        # folder_id doit être présent dans chaque entrée (fix bug précédent)
        assert all("folder_id" in f for f in data["files"])

    def test_listing_sans_token_refuse(self, client):
        """GET /files/ sans JWT → 401."""
        res = client.get("/files/")
        assert res.status_code == 401

    def test_listing_liste_vide_si_aucun_fichier(self, app, client):
        """Nouvel utilisateur sans fichiers → liste vide."""
        _, token = _create_user(app, "Grace", "grace@test.com")
        res = client.get("/files/", headers=_h(token))
        assert res.status_code == 200
        assert res.get_json()["files"] == []

    def test_listing_ne_renvoie_pas_fichiers_autres_utilisateurs(self, app, client):
        """Les fichiers d'un autre utilisateur ne doivent pas apparaître."""
        _, token_a = _create_user(app, "Heidi", "heidi@test.com")
        _, token_b = _create_user(app, "Ivan",  "ivan@test.com")
        _upload(client, token_a, content=b"Secret de Heidi", filename="heidi.txt")

        res = client.get("/files/", headers=_h(token_b))
        assert res.status_code == 200
        assert res.get_json()["files"] == []


# ══════════════════════════════════════════════════════════════════
# TESTS TÉLÉCHARGEMENT
# ══════════════════════════════════════════════════════════════════

class TestDownload:

    def test_download_proprietaire_200(self, app, client):
        """Le propriétaire peut télécharger son propre fichier."""
        _, token = _create_user(app, "Judy", "judy@test.com")
        contenu = b"Contenu confidentiel"
        r = _upload(client, token, content=contenu, filename="secret.txt")
        fid = _fid(r)

        res = client.get(f"/files/{fid}/download", headers=_h(token))
        assert res.status_code == 200
        assert res.data == contenu

    def test_download_fichier_inexistant_404(self, app, client):
        """Un AdminGlobal accédant à un fichier inexistant → 404.

        require_permission laisse passer AdminGlobal, donc la route
        atteint la vérification en base et renvoie 404.
        """
        _, token_admin = _create_user(app, "KAdmin", "kadmin@test.com",
                                      role="AdminGlobal")
        res = client.get("/files/99999/download", headers=_h(token_admin))
        assert res.status_code == 404

    def test_download_non_partage_403(self, app, client):
        """Un utilisateur sans ACL sur un fichier → 403."""
        _, token_owner  = _create_user(app, "Lara",   "lara@test.com")
        _, token_intrus = _create_user(app, "Mallory", "mallory@test.com")

        r = _upload(client, token_owner, content=b"Fichier prive")
        fid = _fid(r)

        res = client.get(f"/files/{fid}/download", headers=_h(token_intrus))
        assert res.status_code == 403

    def test_download_sans_token_401(self, client):
        """Download sans JWT → 401."""
        res = client.get("/files/1/download")
        assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════
# TESTS SUPPRESSION
# ══════════════════════════════════════════════════════════════════

class TestDelete:

    def test_delete_par_proprietaire_200(self, app, client):
        """Le propriétaire peut supprimer son propre fichier → 200."""
        _, token = _create_user(app, "Niobe", "niobe@test.com")
        r = _upload(client, token, content=b"A supprimer", filename="bye.txt")
        assert r.status_code == 201
        fid = _fid(r)

        res = client.delete(f"/files/{fid}", headers=_h(token))
        assert res.status_code == 200

    def test_delete_supprime_le_fichier_en_base(self, app, client):
        """Après suppression, le fichier n'existe plus en base."""
        _, token = _create_user(app, "Oscar", "oscar@test.com")
        r = _upload(client, token, content=b"Ephemere", filename="ephemere.txt")
        fid = _fid(r)

        client.delete(f"/files/{fid}", headers=_h(token))

        with app.app_context():
            from app.models.fichier import Fichier
            assert _db.session.get(Fichier, fid) is None

    def test_delete_autre_utilisateur_403(self, app, client):
        """Un utilisateur sans droit de suppression → 403."""
        _, token_owner  = _create_user(app, "Peggy",  "peggy@test.com")
        _, token_intrus = _create_user(app, "Quentin", "quentin@test.com")

        r = _upload(client, token_owner, content=b"Fichier protege")
        fid = _fid(r)

        res = client.delete(f"/files/{fid}", headers=_h(token_intrus))
        assert res.status_code == 403

    def test_delete_sans_token_401(self, client):
        """DELETE sans JWT → 401."""
        res = client.delete("/files/1")
        assert res.status_code == 401
