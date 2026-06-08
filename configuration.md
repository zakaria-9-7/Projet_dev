# Documentation de Déploiement - Projet Wings

**Description :** Procédure de configuration de l'architecture Three-Tier (DMZ & Zone Interne) pour l'application Wings.

---

## 1. Architecture Réseau Globale

Le projet repose sur une isolation stricte entre l'interface utilisateur et le moteur de l'application :
* **VM1 - DMZ :** Héberge le frontend (React) et le Reverse Proxy (Nginx). Connectée à Internet et au réseau interne.
  * IP publique (NAT) : attribuée automatiquement par VirtualBox
  * IP interne (réseau privé) : `192.168.50.1`
* **VM2 - Zone Interne :** Héberge l'API (Flask) et la base de données. Isolée d'Internet, accessible uniquement par la VM1.
  * IP interne (réseau privé) : `192.168.50.2`

```
[Utilisateur / Navigateur]
         │
         │ HTTP (port 80)
         ▼
[ VM1 - DMZ - 192.168.50.1 ]
   Nginx  (Reverse Proxy)
     │ /api/* → proxy_pass
     │ réseau interne isolé
     ▼
[ VM2 - Zone Interne - 192.168.50.2 ]
   Flask API (port 5000)
   SQLite Database
```

---

## 1.5. Prérequis : Configuration des Cartes Réseau VirtualBox

Avant de lancer les commandes réseau dans les VMs, il faut configurer les adaptateurs réseau correctement dans **VirtualBox**.

### Pour VM1 (Frontend / DMZ) — 2 cartes réseau

Dans VirtualBox → Paramètres de VM1 → Réseau :

| Adaptateur | Mode | Rôle |
|---|---|---|
| Adaptateur 1 | **NAT** | Accès Internet (pour `git clone`, `npm install`, etc.) |
| Adaptateur 2 | **Réseau Interne** — nom : `wings-net` | Communication privée avec VM2 |

### Pour VM2 (Backend / Zone Interne) — 1 carte réseau

Dans VirtualBox → Paramètres de VM2 → Réseau :

| Adaptateur | Mode | Rôle |
|---|---|---|
| Adaptateur 1 | **Réseau Interne** — nom : `wings-net` | Communication privée avec VM1 uniquement |

> **Important :** Le nom du réseau interne (`wings-net`) doit être **identique** sur les deux VMs pour qu'elles puissent se voir.

---

## 2. Configuration de la VM2 : (Backend)

Cette machine agit comme le moteur sécurisé de l'application.

### 2.1. Configuration du réseau interne isolé
```bash
# Supprimer l'ancienne connexion Internet (si elle existe)
sudo nmcli connection delete "Internet"


# Créer la connexion statique pour la Zone Interne (IP : 192.168.50.2)
sudo nmcli connection add type ethernet con-name "ZoneInterne" ifname eth0 ipv4.method manual ipv4.addresses 192.168.50.2/24

# Activer la connexion
sudo nmcli connection up "ZoneInterne"
```
### 2.2. Déploiement du pare-feu (IPtables)
```bash
# Passer en mode super-administrateur
sudo -i

# Créer le dossier de sauvegarde
mkdir -p /etc/iptables

# Vider les anciennes règles
iptables -F

# Autoriser la machine à se parler à elle-même
iptables -A INPUT -i lo -j ACCEPT

# Autoriser les connexions déjà établies
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Autoriser UNIQUEMENT la VM1 (DMZ) à contacter l'API Flask sur le port 5000
iptables -A INPUT -p tcp -s 192.168.50.1 --dport 5000 -j ACCEPT

# Autoriser le Ping depuis la VM1 pour les tests de connectivité
iptables -A INPUT -p icmp -s 192.168.50.1 -j ACCEPT

# Bloquer TOUT le reste par défaut
iptables -P INPUT DROP

# Sauvegarder les règles pour le prochain redémarrage
iptables-save > /etc/iptables/rules.v4

# Quitter le mode root
exit
```
### 2.3. Configuration du fichier .env (Backend)

Le fichier `.env` n'est pas versionné dans Git (pour des raisons de sécurité). Il faut le créer manuellement sur VM2 :

```bash
cd ~/Projet_dev/transferly-backend
nano .env
```

Contenu à coller dans le fichier :

```env
SECRET_KEY=une_cle_secrete_longue_et_aleatoire
JWT_SECRET_KEY=une_autre_cle_jwt_longue
SQLALCHEMY_DATABASE_URL=sqlite:///transferly.db

# URL publique de la VM1 (pour CORS et les liens dans les emails)
FRONTEND_URL=http://192.168.50.1

# Configuration SMTP Gmail (App Password)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=465
MAIL_USE_TLS=False
MAIL_USE_SSL=True
MAIL_USERNAME=wings.admin11@gmail.com
MAIL_PASSWORD=votre_app_password_gmail
MAIL_DEFAULT_SENDER=Wings Admin <wings.admin11@gmail.com>

# Compte Super Administrateur (créé automatiquement au premier lancement)
ADMIN_EMAIL=votre.email.admin@example.com
ADMIN_PASSWORD=VotreMotDePasseAdmin!
ADMIN_NOM=Super Admin
```

### 2.4. Migration de la base de données

Avant le premier lancement, il faut créer et mettre à jour le schéma de la base de données :

```bash
cd ~/Projet_dev/transferly-backend
source venv/bin/activate

# Créer toutes les tables et ajouter les colonnes manquantes
python3 migrate.py

# Ajouter la colonne must_reset_password (si ce n'est pas déjà fait)
python3 migrate_must_reset.py
```

### 2.5. Lancement de l'API avec Gunicorn (Production)

Pour la production, on utilise **Gunicorn** à la place du serveur de développement Flask. Gunicorn est plus stable et supporte les connexions longues (SSE pour les notifications en temps réel).

```bash
# Aller dans le dossier du backend
cd ~/Projet_dev/transferly-backend

# Créer l'environnement virtuel 
python3 -m venv venv

# Activer l'environnement
source venv/bin/activate

# Installer les dépendances Python (inclut Gunicorn)
pip install -r requirements.txt
pip install gunicorn

# Lancer avec Gunicorn (--threads 2 est nécessaire pour les connexions SSE)
gunicorn --workers 2 --threads 2 --bind 0.0.0.0:5000 run:app
```

> **Pourquoi `--threads 2` ?** L'application utilise les Server-Sent Events (SSE) pour les notifications en temps réel. Ces connexions restent ouvertes longtemps. Sans threads, un seul worker pourrait être bloqué par une connexion SSE ouverte et ne plus répondre aux autres requêtes.

## 3. Configuration de la VM1 : (Frontend & DMZ)
### 3.1. Configuration du pont réseau vers la Zone Interne

```bash
# Identifier le nom de la 2ème carte réseau (ex: enp0s8 ou eth1)
ip -br a

# Créer la connexion vers la Zone Interne (IP : 192.168.50.1)
sudo nmcli connection add type ethernet con-name "DMZ_Interne" ifname enp0s8 ipv4.method manual ipv4.addresses 192.168.50.1/24

# Activer la connexion
sudo nmcli connection up "DMZ_Interne"

# Tester la communication avec le backend
ping -c 4 192.168.50.2

```
### 3.2. Installation des prérequis et compilation
```bash
# Installer les outils nécessaires
sudo apt update
sudo apt install git nodejs npm nginx -y

# Cloner le projet
git clone https://github.com/zakaria-9-7/Projet_dev.git

# Aller dans le dossier frontend
cd Projet_dev/transferly-frontend/

# Installer les dépendances Node
npm install
```

### 3.3. Configuration de l'URL de l'API (Avant la compilation !)

Avant de compiler le frontend, il faut lui indiquer où se trouve l'API. Créer le fichier `.env` dans `transferly-frontend/` :

```bash
nano .env
```

Contenu :

```env
# Nginx intercepte les requêtes /api/ et les redirige vers le backend
# Ne pas mettre l'IP du backend ici : Nginx s'en charge
VITE_API_URL=http://192.168.50.1/api
```

> **Important :** Si ce fichier n'est pas créé avant `npm run build`, le frontend compilé continuera d'appeler `localhost:5000` et rien ne fonctionnera sur les VMs.

```bash
# Compiler le projet pour la production
npm run build

# Créer le dossier pour le serveur web et copier les fichiers compilés
sudo mkdir -p /var/www/html/transferly
sudo cp -r dist/* /var/www/html/transferly/

# Donner les droits d'accès à Nginx
sudo chown -R www-data:www-data /var/www/html/transferly
```
### 3.4. Configuration du Reverse Proxy Nginx

```bash
# Créer un fichier de configuration dédié pour l'application
sudo nano /etc/nginx/sites-available/wings
```

Contenu complet à coller dans le fichier :

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html/transferly;
    index index.html index.htm;

    server_name _;

    # --- 1. Servir l'application React ---
    location / {
        # Indispensable pour React Router : toujours retourner index.html
        try_files $uri $uri/ /index.html;
    }

    # --- 2. Relayer les requêtes API standard vers le backend ---
    location /api/ {
        proxy_pass http://192.168.50.2:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- 3. CRITIQUE : Gestion spéciale des Server-Sent Events (SSE) ---
    # Sans ce bloc, les notifications en temps réel seront bloquées par Nginx
    location /api/notifications/stream {
        proxy_pass http://192.168.50.2:5000/notifications/stream;

        # Désactiver le buffering : les événements doivent arriver instantanément
        proxy_buffering off;
        proxy_cache off;

        # Paramètres nécessaires pour maintenir la connexion SSE ouverte
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        chunked_transfer_encoding off;

        # Eviter que Nginx ferme la connexion longue durée (SSE reste ouvert)
        proxy_read_timeout 24h;
        proxy_send_timeout 24h;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Activer le site et désactiver la config par défaut
sudo ln -s /etc/nginx/sites-available/wings /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Vérifier la syntaxe (doit afficher "syntax is ok" et "test is successful")
sudo nginx -t

# Appliquer la configuration
sudo systemctl restart nginx
```

## 4. Procédures de Mise à Jour (Synchronisation Git)
### 4.1. Mise à jour du Frontend (VM1)

```bash
cd ~/Projet_dev/transferly-frontend
git stash
git pull origin main
npm install
npm run build
sudo cp -r dist/* /var/www/html/transferly/
```
### 4.2. Mise à jour du Backend (VM2)
```bash
# Comme la machine est isolée, il faut temporairement rétablir l'accès Internet.

# 1. Rétablir Internet (Après avoir passé la carte en NAT dans VirtualBox)
sudo nmcli connection add type ethernet con-name "Internet" ifname eth0 ipv4.method auto
sudo nmcli connection up "Internet"

# 2. Mettre à jour le code
cd ~/Projet_dev
git pull origin main

# 3. Mettre à jour les dépendances Python
cd transferly-backend
source venv/bin/activate
pip install -r requirements.txt

# 4. Re-verrouiller la machine (Après avoir remis la carte en Réseau Interne dans VirtualBox)
sudo nmcli connection up "ZoneInterne"

# 5. Relancer le serveur
cd ~/Projet_dev/transferly-backend
source venv/bin/activate
python3 run.py
```