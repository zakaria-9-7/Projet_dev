# Documentation de Déploiement - Projet Wings

**Description :** Procédure de configuration de l'architecture Three-Tier (DMZ & Zone Interne) pour l'application Wings.

---

## 1. Architecture Réseau Globale

Le projet repose sur une isolation stricte entre l'interface utilisateur et le moteur de l'application :
* **VM1 - DMZ :** Héberge le frontend (React) et le Reverse Proxy (Nginx). Connectée à Internet et au réseau interne.
* **VM2 - Zone Interne :** Héberge l'API (Flask) et la base de données. Isolée d'Internet, accessible uniquement par la VM1.

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
### 2.3.Lancement de l'API Flask
```bash
# Aller dans le dossier du backend
cd ~/Projet_dev/transferly-backend

# Créer l'environnement virtuel 
python3 -m venv venv

# Activer l'environnement
source venv/bin/activate

# Installer les dépendances Python
pip install -r requirements.txt

# Lancer le serveur (configuré pour écouter sur 0.0.0.0:5000)
python3 run.py
```

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
git clone [https://github.com/zakaria-9-7/Projet_dev.git](https://github.com/zakaria-9-7/Projet_dev.git)

# Aller dans le dossier frontend
cd Projet_dev/transferly-frontend/

# Installer les dépendances Node
npm install

# Compiler le projet pour la production
npm run build

# Créer le dossier pour le serveur web et copier les fichiers compilés
sudo mkdir -p /var/www/html/transferly
sudo cp -r dist/* /var/www/html/transferly/

# Donner les droits d'accès à Nginx
sudo chown -R www-data:www-data /var/www/html/transferly

```
### 3.3. Configuration du Reverse Proxy Nginx
```bash
# Ouvrir le fichier de configuration Nginx
sudo nano /etc/nginx/sites-available/default

Contenu à appliquer dans le fichier :

server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html/transferly;
    index index.html index.htm;

    server_name _;

    # Servir l'application React
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Relayer les requêtes API vers le backend isolé
    location /api/ {
        proxy_pass [http://192.168.50.2:5000/](http://192.168.50.2:5000/);
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Vérifier la syntaxe et appliquer la configuration
sudo nginx -t
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