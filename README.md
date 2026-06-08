# Wings - Plateforme Collaborative Sécurisée de Partage de Fichiers

## 📖 Description

**Wings** est une plateforme web collaborative permettant le partage sécurisé de fichiers au sein d’un environnement académique ou professionnel.

La plateforme offre :

* Authentification multi-facteurs (MFA) avec OTP par email
* Gestion des utilisateurs et des rôles
* Contrôle d’accès avancé via ACL (Access Control Lists)
* Chiffrement des fichiers avec AES/Fernet
* Gestion des espaces collaboratifs
* Versionnement automatique des fichiers avec empreintes SHA-256
* Notifications temps réel via Server-Sent Events (SSE)
* Gestion des quotas utilisateurs
* Journalisation complète des actions
* Éditeur de fichiers texte intégré

L'architecture repose sur un frontend React et un backend Flask sécurisés par JWT et déployables sur deux machines virtuelles distinctes (DMZ / Zone Interne).

---

## 🏗️ Architecture Technique

### Frontend

* React.js
* Vite
* Tailwind CSS
* EventSource (SSE)

### Backend

* Python 3
* Flask
* SQLAlchemy
* SQLite
* Flask-Mail
* Flask-Bcrypt
* PyJWT
* PyOTP
* Cryptography (Fernet)

### Sécurité

* JWT (HS256)
* MFA OTP par email
* Bcrypt pour les mots de passe
* Chiffrement AES/Fernet
* ACL à 6 permissions
* Validation sécurisée des fichiers

---

# 🚀 Installation

## Prérequis

### Backend

* Python 3.10+
* pip
* virtualenv

### Frontend

* Node.js 18+
* npm

---

## 1. Cloner le projet

```bash
git clone https://github.com/zakaria-9-7/Projet_dev.git

cd Projet_dev
```

---

## 2. Installation du Backend

```bash
cd transferly-backend
```

Créer un environnement virtuel :

```bash
python -m venv venv
```

Activation :

### Linux / macOS

```bash
source venv/bin/activate
```

### Windows

```bash
venv\Scripts\activate
```

Installer les dépendances :

```bash
pip install -r requirements.txt
```

---

## 3. Installation du Frontend

```bash
cd ../transferly-frontend
```

Installer les dépendances :

```bash
npm install
```

---

# ⚙️ Configuration

Créer un fichier `.env` dans le backend :

```env
SECRET_KEY=your_secret_key

JWT_SECRET_KEY=your_jwt_secret

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin123!

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True

MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_DEFAULT_SENDER=your_email@gmail.com
```

---

## Génération de la clé Fernet

La clé de chiffrement est automatiquement créée au premier démarrage.

Un fichier :

```text
.key
```

sera généré à la racine du backend.

Sous Linux :

```bash
chmod 600 .key
```

---

# ▶️ Exécution

## Démarrer le Backend

Depuis :

```bash
transferly-backend
```

Lancer :

```bash
python run.py
```

ou :

```bash
flask run
```

Serveur :

```text
http://localhost:5000
```

---

## Démarrer le Frontend

Depuis :

```bash
transferly-frontend
```

Lancer :

```bash
npm run dev
```

Application :

```text
http://localhost:5173
```

---

# 🧪 Tests

Exécuter tous les tests :

```bash
pytest
```

Exécuter avec couverture :

```bash
pytest --cov=app
```

---

# 📂 Structure du Projet

```text
Projet_dev/

├── transferly-backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware.py
│   │   ├── decorators.py
│   │   ├── acl_engine.py
│   │   └── crypto.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   ├── run.py
│   └── .env
│
├── transferly-frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── api/
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# 🔐 Permissions ACL

Chaque ressource peut recevoir les permissions suivantes :

| Permission  | Description            |
| ----------- | ---------------------- |
| lecture     | Consulter un fichier   |
| ecriture    | Modifier un fichier    |
| upload      | Ajouter des fichiers   |
| download    | Télécharger un fichier |
| suppression | Supprimer un fichier   |
| partage     | Partager un fichier    |

---

# 👥 Rôles

### AdminGlobal

* Gestion complète du système
* Gestion des utilisateurs
* Gestion des quotas
* Consultation des logs

### AdminEspace

* Gestion des espaces collaboratifs
* Gestion des ACL
* Gestion des membres

### Utilisateur

* Upload / Download
* Partage de fichiers
* Consultation des versions

---

# 📡 API Principales

```http
POST /register
POST /login
POST /mfa/verify

GET  /files
POST /files

GET  /files/{id}/download

PUT  /acl/{id}

GET  /notifications/stream
```

---

# 📜 Licence

Projet académique réalisé à l'Institut National des Postes et Télécommunications (INPT) dans le cadre du mini-projet ICCN INE1 (2025-2026).

---

# 👨‍💻 Équipe

* Salma Douramane
* Imane Elouahi
* Nizar El Amrani
* Zakaria Tahri
* Jean-Arthur AWI Détine
