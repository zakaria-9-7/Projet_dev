# Transferly — Architecture du projet
> Groupe 4 · INPT 2025/2026 · Mini-projet ICCN INE1



---

## VM 1 — Frontend · Zone DMZ
> React.js · Nginx · Zone exposée

```
transferly-frontend/
│
├── src/
│   ├── pages/                          ← Login, Dashboard, Files…
│   ├── components/                    ← UI components React
│   ├── utils/
│   │   └── acl.js                      ← masque les ressources interdites
│   └── api/
│       ├── auth.js                     ← stocke + envoie le JWT dans chaque requête
│       └── files.js                   ← fetch / axios vers le backend
│
└── .env                               ← REACT_APP_API_URL=http://vm2-ip:5000
```

---

## VM 2 — Backend · Zone interne
> Flask · Python · SQLite · Zone sécurisée (jamais exposée directement)

```
transferly-backend/
│
├── app/
│   │
│   ├── __init__.py                     ← app factory · enregistre les blueprints
│   │
│   ├── middleware.py                  ← @before_request · decode JWT · g.user
│   ├── decorators.py                  ← @require_role('AdminGlobal' / 'AdminEspace')
│   │                                              ← renvoie 401 (no token) ou 403 (wrong role)
│   │
│   ├── routes/
│   │   ├── auth.py                      ← /login · /register · /mfa · émet le JWT
│   │   ├── files.py                     ← upload · download · versions
│   │   │                                          utilisera @require_role
│   │   ├── admin_global.py              ← gestion users · quotas · logs
│   │   │                                          @require_role('AdminGlobal')
│   │   ├── admin_espace.py              ← ACL · invitations · espace
│   │   │                                          @require_role('AdminEspace')
│   │   └── acl.py                      ← moteur ACL · 6 permissions
│   │
│   ├── models/
│   │   ├── user.py                      ← id · email · role · motDePasseHash
│   │   ├── file.py                      ← nom · taille · dateCreation · owner
│   │   ├── acl.py                      ← lecture · écriture · upload · download…
│   │   ├── log.py                      ← action · userId · horodatage · statut
│   │   └── version.py                   ← numeroVersion · date · auteur · SHA-256
│   │
│   └── services/
│       ├── crypto.py                   ← chiffrement AES · Fernet
│       ├── mfa.py                      ← génération OTP (PyOTP)
│       └── logger.py                   ← journalisation horodatée de toutes les actions
│
├── run.py                               ← point d'entrée Flask
│
├── .env                                 ← SECRET_KEY · FERNET_KEY · DATABASE_URL
├── requirements.txt                    ← flask · pyjwt · bcrypt · pyotp · cryptography
├── .gitignore                           ← .env · __pycache__/ · *.db · uploads/
│
├── transferly.db                      ← base SQLite · créée automatiquement
└── uploads/                           ← fichiers chiffrés AES · organisés par user
```

---

## Communication inter-VMs

```
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
              │  HTTPS · JWT · API REST · VLAN privé
              ▼
┌─────────────────────────────┐
│  VM 2 — Backend (interne)   │
│  Flask · SQLite · uploads/  │
│  ACL · Crypto · Logs        │
└─────────────────────────────┘
```

---

## Rôles et permissions

| Rôle | Décorateur | Périmètre |
|---|---|---|
| `AdminGlobal` | `@require_role('AdminGlobal')` | Accès complet · users · quotas · tous les logs |
| `AdminEspace` | `@require_role('AdminEspace')` | Son espace uniquement · ACL · logs de son espace |
| `Utilisateur` | *(token valide suffit)* | Ses fichiers · selon ACL accordées |

---

## Fichiers à créer en priorité

> ⚠️ `middleware.py` et `decorators.py` sont un **bloquant** pour l'équipe.
> Toutes les routes protégées dépendent de votre travail.

### `.env`
```
SECRET_KEY=your-long-random-secret
FERNET_KEY=your-fernet-key
DATABASE_URL=sqlite:///transferly.db
```

### `requirements.txt`
```
flask
pyjwt
bcrypt
pyotp
cryptography
python-dotenv
```

### `.gitignore`
```
.env
__pycache__/
*.pyc
*.db
uploads/
```

---

## Ordre d'implémentation recommandé

1. Créer `.env`, `requirements.txt`, `.gitignore`
2. `pip install -r requirements.txt`
3. Écrire **`middleware.py`** — le `@before_request`
4. Écrire **`decorators.py`** — le `@require_role`
5. Tester avec un token généré manuellement (`test_token.py`)
6. Appliquer `@require_role` sur les routes existantes
