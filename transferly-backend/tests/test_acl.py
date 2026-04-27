"""
IE-08 — Tests pytest corrigés
Adapté au middleware de Salma :
- Token JWT standard (pas flask-jwt-extended)
- Payload contient user_id et role
- Secret = SECRET_KEY
- g.user (pas g.current_user)
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

def _make_token(user_id, role):
    """
    Génère un token JWT avec la même clé et le même format
    qu'utilise le middleware de Salma.
    SECRET_KEY est lue depuis l'environnement.
    """
    secret = os.environ.get("SECRET_KEY", "test-secret-key")
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=2)
    }
    return jwt.encode(payload, secret, algorithm="HS256")
def _create_user(app, nom, email, role="Utilisateur", quota=2.0):
    """
    Crée un user en base et retourne (user_id, token).
    Le token est généré directement sans passer par /auth/login.
    """
    with app.app_context():
        from app.models.user import User
        hashed = bcrypt.generate_password_hash("MotDePasse1!").decode("utf-8")
        user = User(
            nom=nom, email=email, password=hashed,
            role=role, quota=quota, quota_utilise=0.0, statut="actif"
        )
        _db.session.add(user)
        _db.session.commit()
        uid = user.id

    token = _make_token(uid, role)
    return uid, token


def _h(token):
    """Headers Authorization avec le token JWT."""
    return {"Authorization": f"Bearer {token}"}


def _upload(client, token, content=b"Contenu test", filename="test.txt"):
    """Upload un fichier via l'endpoint."""
    return client.post(
        "/files/upload",
        headers=_h(token),
        data={"file": (io.BytesIO(content), filename)},
        content_type="multipart/form-data"
    )


def _get_fid(resp):
    """
    Extrait l'id du fichier depuis la réponse upload.
    Essaie toutes les clés possibles.
    """
    data = resp.get_json() or {}
    for key in ["fichier", "file", "data", "result"]:
        if key in data and isinstance(data[key], dict):
            return data[key].get("id")
    return data.get("id")


# ══════════════════════════════════════════════════════════════════
# TESTS MOTEUR ACL (IE-01)
# ══════════════════════════════════════════════════════════════════

class TestMoteurACL:

    def test_sans_token_renvoie_401(self, client):
        resp = client.get("/files/1/download")
        assert resp.status_code == 401

    def test_utilisateur_sans_acl_recoit_403(self, app, client):
        _, t_proprio = _create_user(app, "Proprio", "proprio@test.com")
        _, t_intrus  = _create_user(app, "Intrus",  "intrus@test.com")

        r = _upload(client, t_proprio)
        assert r.status_code == 201, f"Upload échoué : {r.get_json()}"
        fid = _get_fid(r)
        assert fid is not None

        resp = client.get(f"/files/{fid}/download", headers=_h(t_intrus))
        assert resp.status_code == 403

    def test_proprietaire_peut_telecharger(self, app, client):
        _, token = _create_user(app, "Owner", "owner@test.com")

        r = _upload(client, token, content=b"Mon fichier")
        assert r.status_code == 201, f"Upload échoué : {r.get_json()}"
        fid = _get_fid(r)

        resp = client.get(f"/files/{fid}/download", headers=_h(token))
        assert resp.status_code == 200

    def test_admin_global_acces_tous_fichiers(self, app, client):
        _, t_user  = _create_user(app, "User",  "user@test.com")
        _, t_admin = _create_user(app, "Admin", "admin@test.com",
                                  role="AdminGlobal")

        r = _upload(client, t_user)
        fid = _get_fid(r)

        resp = client.get(f"/files/{fid}/download", headers=_h(t_admin))
        assert resp.status_code == 200


# ══════════════════════════════════════════════════════════════════
# TESTS CRUD ACL (IE-02)
# ══════════════════════════════════════════════════════════════════

class TestCRUDACL:

    def test_utilisateur_standard_ne_peut_pas_gerer_acl(self, app, client):
        _, token = _create_user(app, "Std", "std@test.com")
        resp = client.post("/acl/",
                           json={"user_id": 99, "fichier_id": 1},
                           headers=_h(token))
        assert resp.status_code == 403

    def test_admin_espace_cree_regle_acl(self, app, client):
        _,        token_ae = _create_user(app, "AE", "ae@test.com",
                                          role="AdminEspace")
        target_id, _       = _create_user(app, "Target", "target@test.com")

        r = _upload(client, token_ae)
        assert r.status_code == 201, f"Upload échoué : {r.get_json()}"
        fid = _get_fid(r)

        resp = client.post("/acl/", json={
            "user_id": target_id, "fichier_id": fid,
            "lecture": True, "download": True,
            "ecriture": False, "suppression": False,
            "upload": False, "partage": False,
        }, headers=_h(token_ae))

        assert resp.status_code == 201
        data = resp.get_json()
        assert data["permissions"]["lecture"]  is True
        assert data["permissions"]["ecriture"] is False

    def test_put_acl_modifie_permissions(self, app, client):
        _, token_ae   = _create_user(app, "AE2", "ae2@test.com",
                                     role="AdminEspace")
        target_id, _  = _create_user(app, "T2", "t2@test.com")

        r = _upload(client, token_ae)
        fid = _get_fid(r)

        create = client.post("/acl/", json={
            "user_id": target_id, "fichier_id": fid,
            "lecture": True, "download": False,
        }, headers=_h(token_ae))
        acl_id = create.get_json()["id"]

        resp = client.put(f"/acl/{acl_id}",
                          json={"download": True, "ecriture": True},
                          headers=_h(token_ae))
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["permissions"]["download"] is True
        assert data["permissions"]["ecriture"] is True
        assert data["permissions"]["lecture"]  is True

    def test_delete_acl_revoque_acces(self, app, client):
        _, token_ae          = _create_user(app, "AE3", "ae3@test.com",
                                            role="AdminEspace")
        target_id, token_target = _create_user(app, "T3", "t3@test.com")

        r = _upload(client, token_ae)
        fid = _get_fid(r)

        create = client.post("/acl/", json={
            "user_id": target_id, "fichier_id": fid,
            "lecture": True, "download": True,
        }, headers=_h(token_ae))
        acl_id = create.get_json()["id"]

        assert client.get(f"/files/{fid}/download",
                          headers=_h(token_target)).status_code == 200

        client.delete(f"/acl/{acl_id}", headers=_h(token_ae))

        assert client.get(f"/files/{fid}/download",
                          headers=_h(token_target)).status_code == 403


# ══════════════════════════════════════════════════════════════════
# TESTS UPLOAD (IE-03)
# ══════════════════════════════════════════════════════════════════

class TestUpload:

    def test_upload_stocke_fichier_chiffre(self, app, client):
        _, token = _create_user(app, "UplUser", "upl@test.com")

        contenu = b"Contenu tres secret"
        resp = _upload(client, token, content=contenu, filename="secret.txt")
        assert resp.status_code == 201, f"Upload échoué : {resp.get_json()}"
        fid = _get_fid(resp)

        with app.app_context():
            from app.models.fichier import Fichier
            f = _db.session.get(Fichier, fid)
            chemin = f.chemin

        assert os.path.exists(chemin)
        with open(chemin, "rb") as f:
            disk = f.read()
        assert contenu not in disk

    def test_upload_refuse_extension_exe(self, app, client):
        _, token = _create_user(app, "Ext", "ext@test.com")
        resp = _upload(client, token,
                       content=b"MZ\x90\x00", filename="virus.exe")
        assert resp.status_code == 415

    def test_upload_refuse_extension_sh(self, app, client):
        _, token = _create_user(app, "Sh", "sh@test.com")
        resp = _upload(client, token,
                       content=b"#!/bin/bash", filename="hack.sh")
        assert resp.status_code == 415

    def test_upload_refuse_quota_depasse(self, app, client):
        uid, token = _create_user(app, "Quota", "quota@test.com")

        with app.app_context():
            from app.models.user import User
            u = _db.session.get(User, uid)
            u.quota = 0.000001
            u.quota_utilise = 0.0
            _db.session.commit()

        resp = _upload(client, token, content=b"X" * 10_000)
        assert resp.status_code == 507

    def test_upload_sans_fichier_renvoie_400(self, app, client):
        _, token = _create_user(app, "NoFile", "nofile@test.com")
        resp = client.post("/files/upload", headers=_h(token),
                           data={}, content_type="multipart/form-data")
        assert resp.status_code == 400

    def test_upload_cree_version_initiale(self, app, client):
        _, token = _create_user(app, "VUser", "v@test.com")
        resp = _upload(client, token, content=b"v1 content")
        assert resp.status_code == 201
        fid = _get_fid(resp)

        with app.app_context():
            from app.models.version import VersionFichier
            v1 = VersionFichier.query.filter_by(
                fichier_id=fid, numero_version=1
            ).first()
            assert v1 is not None


# ══════════════════════════════════════════════════════════════════
# TESTS DOWNLOAD (IE-04)
# ══════════════════════════════════════════════════════════════════

class TestDownload:

    def test_download_dechiffre_correctement(self, app, client):
        _, token = _create_user(app, "DlUser", "dl@test.com")

        contenu = b"Donnee confidentielle"
        r = _upload(client, token, content=contenu, filename="verif.txt")
        assert r.status_code == 201
        fid = _get_fid(r)

        resp = client.get(f"/files/{fid}/download", headers=_h(token))
        assert resp.status_code == 200
        assert resp.data == contenu

    def test_download_fichier_inexistant(self, app, client):
        _, token = _create_user(app, "DlUser2", "dl2@test.com")
        resp = client.get("/files/99999/download", headers=_h(token))
        assert resp.status_code in (403, 404)


# ══════════════════════════════════════════════════════════════════
# TESTS PARTAGE (IE-05)
# ══════════════════════════════════════════════════════════════════

class TestPartage:

    def test_partage_cree_regle_acl(self, app, client):
        _,         token_owner = _create_user(app, "Owner2", "owner2@test.com")
        target_id, _           = _create_user(app, "Cible2", "cible2@test.com")

        r = _upload(client, token_owner)
        fid = _get_fid(r)

        resp = client.post(f"/files/{fid}/share", json={
            "target_user_id": target_id,
            "permissions": {"lecture": True, "download": True}
        }, headers=_h(token_owner))
        assert resp.status_code == 200

        with app.app_context():
            from app.models.acl import ACL
            acl = ACL.query.filter_by(
                user_id=target_id, fichier_id=fid
            ).first()
            assert acl is not None
            assert acl.lecture  is True
            assert acl.download is True

    def test_apres_partage_cible_peut_telecharger(self, app, client):
        _,         token_owner = _create_user(app, "Owner3", "owner3@test.com")
        target_id, token_cible = _create_user(app, "Cible3", "cible3@test.com")

        contenu = b"Fichier partage"
        r = _upload(client, token_owner, content=contenu)
        fid = _get_fid(r)

        client.post(f"/files/{fid}/share", json={
            "target_user_id": target_id,
            "permissions": {"lecture": True, "download": True}
        }, headers=_h(token_owner))

        dl = client.get(f"/files/{fid}/download", headers=_h(token_cible))
        assert dl.status_code == 200
        assert dl.data == contenu

    def test_partage_avec_soi_meme_interdit(self, app, client):
        user_id, token = _create_user(app, "Solo", "solo@test.com")
        r = _upload(client, token)
        fid = _get_fid(r)

        resp = client.post(f"/files/{fid}/share", json={
            "target_user_id": user_id,
            "permissions": {"lecture": True}
        }, headers=_h(token))
        assert resp.status_code == 400