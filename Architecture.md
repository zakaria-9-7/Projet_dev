# Transferly — Architecture du projet
> Groupe 4 · INPT 2025/2026 · Mini-projet ICCN INE1

**Légende**
- `[YOUR TASK]` — fichier de votre tâche JWT
- `[EXISTS]` — déjà dans le projet
- `[CREATE]` — à créer avant de commencer
- `[GENERATED]` — généré automatiquement

---

## VM 1 — Frontend · Zone DMZ
> React.js · Nginx · Zone exposée

```
transferly-frontend/
│
├── src/
│   ├── pages/                        [EXISTS]  ← Login, Dashboard, Files…
│   ├── components/                   [EXISTS]  ← UI components React
│   ├── utils/
│   │   └── acl.js                    [EXISTS]  ← masque les ressources interdites
│   └── api/
│       ├── auth.js                   [EXISTS]  ← stocke + envoie le JWT dans chaque requête
│       └── files.js                  [EXISTS]  ← fetch / axios vers le backend
│
└── .env                              [CREATE]  ← REACT_APP_API_URL=http://vm2-ip:5000
```

---

## VM 2 — Backend · Zone interne
> Flask · Python · SQLite · Zone sécurisée (jamais exposée directement)

```
transferly-backend/
│
├── app/
│   │
│   ├── __init__.py                   [EXISTS]   ← app factory · enregistre les blueprints
│   │
│   ├── middleware.py                 [YOUR TASK] ← @before_request · decode JWT · g.user
│   ├── decorators.py                 [YOUR TASK] ← @require_role('AdminGlobal' / 'AdminEspace')
│   │                                              ← renvoie 401 (no token) ou 403 (wrong role)
│   │
│   ├── routes/
│   │   ├── auth.py                   [EXISTS]   ← /login · /register · /mfa · émet le JWT
│   │   ├── files.py                  [EXISTS]   ← upload · download · versions
│   │   │                                          utilisera @require_role
│   │   ├── admin_global.py           [EXISTS]   ← gestion users · quotas · logs
│   │   │                                          @require_role('AdminGlobal')
│   │   ├── admin_espace.py           [EXISTS]   ← ACL · invitations · espace
│   │   │                                          @require_role('AdminEspace')
│   │   └── acl.py                    [EXISTS]   ← moteur ACL · 6 permissions
│   │
│   ├── models/
│   │   ├── user.py                   [EXISTS]   ← id · email · role · motDePasseHash
│   │   ├── file.py                   [EXISTS]   ← nom · taille · dateCreation · owner
│   │   ├── acl.py                    [EXISTS]   ← lecture · écriture · upload · download…
│   │   ├── log.py                    [EXISTS]   ← action · userId · horodatage · statut
│   │   └── version.py                [EXISTS]   ← numeroVersion · date · auteur · SHA-256
│   │
│   └── services/
│       ├── crypto.py                 [EXISTS]   ← chiffrement AES · Fernet
│       ├── mfa.py                    [EXISTS]   ← génération OTP (PyOTP)
│       └── logger.py                 [EXISTS]   ← journalisation horodatée de toutes les actions
│
├── run.py                            [EXISTS]   ← point d'entrée Flask
│
├── .env                              [CREATE]   ← SECRET_KEY · FERNET_KEY · DATABASE_URL
├── requirements.txt                  [CREATE]   ← flask · pyjwt · bcrypt · pyotp · cryptography
├── .gitignore                        [CREATE]   ← .env · __pycache__/ · *.db · uploads/
│
├── transferly.db                     [GENERATED] ← base SQLite · créée automatiquement
└── uploads/                          [GENERATED] ← fichiers chiffrés AES · organisés par user
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
