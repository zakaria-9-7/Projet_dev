markdown# Transferly — Architecture du projet
> Groupe 4 · INPT 2025/2026 · Mini-projet ICCN INE1

---

## VM 1 — Frontend · Zone DMZ
> React.js · Nginx · Zone exposée
transferly-frontend/
│
├── src/
│   ├── pages/
│   │   ├── Login.jsx                  ← SD-06 · page connexion
│   │   ├── Register.jsx               ← SD-06 · page inscription
│   │   ├── OTP.jsx                    ← SD-06 · saisie code OTP
│   │   ├── Dashboard.jsx              ← SD-07 · quota + fichiers récents
│   │   ├── MyFiles.jsx                ← NE-05 · explorateur arborescence
│   │   ├── FileVersions.jsx           ← NE-06 · historique des versions
│   │   ├── AdminEspace.jsx            ← IE-06 · gestion permissions ACL
│   │   └── AdminGlobal.jsx            ← JA-06 · gestion utilisateurs
│   │
│   ├── components/
│   │   └── UploadZone.jsx             ← ZT-05 · drag & drop + progression
│   │
│   ├── utils/
│   │   └── acl.js                     ← masque les ressources non autorisées
│   │
│   └── api/
│       ├── auth.js                    ← stocke + envoie le JWT à chaque requête
│       └── files.js                   ← fetch / axios vers le backend
│
└── .env                               ← REACT_APP_API_URL=http://vm2-ip:5000

---

## VM 2 — Backend · Zone interne
> Flask · Python · SQLite · Zone sécurisée (jamais exposée directement)
transferly-backend/
│
├── app/
│   │
│   ├── init.py                    ← app factory · blueprints · branche le middleware
│   │
│   ├── middleware.py                  ← JA-03 · @before_request · decode JWT · injecte g.user
│   ├── decorators.py                  ← JA-03 · @require_role('AdminGlobal'/'AdminEspace') · 401/403
│   │
│   ├── routes/
│   │   ├── auth.py                    ← SD-03 · /register /login · SD-04 · /auth/verify-otp → JWT HttpOnly · /logout
│   │   ├── files.py                   ← IE-03 · upload · IE-04 · download · IE-05 · partage · JA-04 · filtrage ACL
│   │   ├── folders.py                 ← NE-03 · POST/PUT/DELETE /folders/
│   │   ├── versions.py                ← NE-01 · versionnement · NE-02 · GET versions · POST restauration
│   │   ├── admin_global.py            ← JA-01 · GET/POST/PUT/DELETE /admin/users · @require_role('AdminGlobal')
│   │   ├── admin_espace.py            ← JA-02 · /admin/espaces · quotas · @require_role('AdminEspace')
│   │   ├── acl.py                     ← IE-01 · moteur ACL · IE-02 · CRUD ACL · @require_permission · 6 permissions
│   │   └── logs.py                    ← ZT-02 · GET /logs/ · filtres · export CSV/JSON
│   │
│   ├── models/                        ← SD-01 · tous les modèles SQLAlchemy
│   │   ├── user.py                    ← id · email · role · motDePasseHash · quota
│   │   ├── file.py                    ← nom · taille · dateCreation · owner · chiffré
│   │   ├── folder.py                  ← id · nom · parent · espace
│   │   ├── acl.py                     ← lecture · écriture · upload · download · suppression · partage
│   │   ├── log.py                     ← action · userId · horodatage · statut · ressource
│   │   ├── version.py                 ← numeroVersion · date · auteur · taille · SHA-256
│   │   ├── espace.py                  ← id · nom · adminEspace
│   │   ├── otp.py                     ← code · dateExpiration · userId
│   │   └── quota.py                   ← userId · alloué · consommé
│   │
│   └── services/
│       ├── crypto.py                  ← SD-05 · chiffrement AES · Fernet · encrypt_file() · decrypt_file()
│       ├── mfa.py                     ← SD-03 · génération OTP (PyOTP) · envoi email
│       ├── logger.py                  ← ZT-01 · journalisation horodatée · toutes les actions
│       └── quota.py                   ← ZT-03 · calcul espace consommé · vérification avant upload
│
├── run.py                             ← point d'entrée Flask · appelle create_app()
│
├── .env                               ← SECRET_KEY · FERNET_KEY · DATABASE_URL ⚠️ ne jamais commit
├── requirements.txt                   ← flask · pyjwt · bcrypt · pyotp · cryptography · python-dotenv · flask-sqlalchemy
├── .gitignore                         ← .env · pycache/ · *.pyc · *.db · uploads/ · .key
│
├── transferly.db                      ← créée automatiquement par flask init-db
└── uploads/                           ← fichiers chiffrés AES · organisés par user_{id}/

---

## Communication inter-VMs
Client (navigateur)
│
│  HTTPS
▼
┌─────────────────────────────┐
│  VM 1 — Frontend (DMZ)      │
│  React + Nginx              │
│  Filtre ACL visuel          │
└─────────────┬───────────────┘
│
│  HTTPS · JWT HttpOnly · API REST · VLAN privé
▼
┌─────────────────────────────┐
│  VM 2 — Backend (interne)   │
│  Flask · SQLite · uploads/  │
│  ACL · Crypto · Logs        │
└─────────────────────────────┘

---

## Rôles et permissions

| Rôle | Décorateur | Périmètre |
|---|---|---|
| `AdminGlobal` | `@require_role('AdminGlobal')` | Accès complet · users · quotas · tous les logs · tous les espaces |
| `AdminEspace` | `@require_role('AdminEspace')` | Son espace uniquement · ACL · logs de son espace · invitations |
| `Utilisateur` | *(token valide suffit)* | Ses fichiers · selon permissions ACL accordées |

---

## Répartition des tâches

| ID | Développeur | Fichiers concernés |
|---|---|---|
| SD-01 | Salma | `models/` · `app/__init__.py` · `flask init-db` |
| SD-03 | Salma | `routes/auth.py` · `services/mfa.py` |
| SD-04 | Salma | `routes/auth.py` · génération JWT HttpOnly |
| SD-05 | Salma | `services/crypto.py` |
| SD-06 | Salma | `pages/Login.jsx` · `Register.jsx` · `OTP.jsx` |
| SD-07 | Salma | `pages/Dashboard.jsx` |
| IE-01 | Imane | `routes/acl.py` · `@require_permission` |
| IE-02 | Imane | `routes/acl.py` · CRUD ACL AdminEspace |
| IE-03 | Imane | `routes/files.py` · upload |
| IE-04 | Imane | `routes/files.py` · download |
| IE-05 | Imane | `routes/files.py` · partage |
| IE-06 | Imane | `pages/AdminEspace.jsx` |
| NE-01 | Nizar | versionnement automatique |
| NE-02 | Nizar | `routes/versions.py` |
| NE-03 | Nizar | `routes/folders.py` · PUT/DELETE fichiers |
| NE-04 | Nizar | verrouillage concurrent threading |
| NE-05 | Nizar | `pages/MyFiles.jsx` |
| NE-06 | Nizar | `pages/FileVersions.jsx` |
| ZT-01 | Zakaria | `services/logger.py` |
| ZT-02 | Zakaria | `routes/logs.py` |
| ZT-03 | Zakaria | `services/quota.py` |
| ZT-05 | Zakaria | `components/UploadZone.jsx` |
| JA-01 | Jean-Arthur | `routes/admin_global.py` |
| JA-02 | Jean-Arthur | `routes/admin_espace.py` |
| JA-03 | Jean-Arthur | `middleware.py` · `decorators.py` · `app/__init__.py` ✅ |
| JA-04 | Jean-Arthur | `routes/files.py` · filtrage ACL visuel |

---

> ⚠️ **Coordination critique** : le JWT sera stocké dans un cookie HttpOnly (SD-04).
> Le `middleware.py` devra lire le token via `request.cookies.get('access_token')` et non depuis le header `Authorization`. À confirmer avec Salma.
