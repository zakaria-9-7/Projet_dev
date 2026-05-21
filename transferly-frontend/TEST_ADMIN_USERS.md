# Tests manuels — Création de comptes par l'AdminGlobal

## Pré-requis

- Backend Flask en cours d'exécution sur `http://127.0.0.1:5000`
- Frontend Vite en cours d'exécution sur `http://localhost:5173`
- Un compte AdminGlobal valide (par défaut : `admin@transferly.local` / `TransferlyAdmin2026!`)

---

## Scénario 1 — Connexion AdminGlobal + vérification du lien sidebar

1. Aller sur `http://localhost:5173/login`
2. Se connecter avec les identifiants AdminGlobal
3. Valider le code OTP reçu par email
4. **Vérifier** : la sidebar contient bien le lien **"Gestion des utilisateurs"** (visible uniquement pour AdminGlobal)
5. **Vérifier** : un utilisateur Utilisateur ou AdminEspace ne voit PAS ce lien

---

## Scénario 2 — Création d'un utilisateur + affichage du mot de passe temporaire

1. En tant qu'AdminGlobal, cliquer sur **"Gestion des utilisateurs"** dans la sidebar → route `/admin-users`
2. Cliquer sur le bouton **"+ Créer un utilisateur"** (en haut à droite)
3. Remplir le formulaire :
   - Nom complet : `Test Utilisateur`
   - Email : `test.user@exemple.com`
   - Rôle : `Utilisateur`
4. Cliquer sur **"Créer"**
5. **Vérifier** :
   - La modal passe en mode succès (✅ "Compte créé avec succès")
   - L'email est affiché
   - Le **mot de passe temporaire** est affiché dans un encart doré
   - Un message indique si l'email d'invitation a été envoyé ou non
   - Le message "Ce mot de passe ne sera plus affiché après fermeture" est présent
6. **Vérifier** : tenter de créer un second compte avec le même email → message d'erreur rouge "Cet email est déjà utilisé" (sans fermer la modal)
7. **Vérifier** : tenter de créer avec un rôle invalide (ex: via devtools) → erreur 400

---

## Scénario 3 — Copie du mot de passe temporaire

1. Dans l'écran de succès de la modal (suite du scénario 2)
2. Cliquer sur le bouton **"Copier"** à côté du mot de passe
3. **Vérifier** : le bouton affiche brièvement "✓ Copié"
4. Coller dans un éditeur de texte (`Ctrl+V`) → le mot de passe temporaire apparaît correctement
5. Cliquer sur **"Fermer"**
6. **Vérifier** : la ligne apparaît dans le tableau **"Comptes créés dans cette session"** avec le statut "Mot de passe à changer"
7. Rafraîchir la page → **vérifier** que la liste de session est vide (liste locale uniquement)

---

## Scénario 4 — Déconnexion + reconnexion avec le nouveau compte → redirection forcée

1. Noter le mot de passe temporaire (copié à l'étape 3)
2. Se déconnecter (bouton "Déconnexion" dans la sidebar)
3. Se connecter avec `test.user@exemple.com` + le mot de passe temporaire
4. Valider le code OTP
5. **Vérifier** :
   - La page `/force-reset-password` s'affiche automatiquement
   - Une bannière orange indique : "Sécurité requise. Votre mot de passe doit être changé avant de pouvoir accéder à la plateforme."
   - Le champ "Mot de passe temporaire actuel" est pré-rempli
6. **Vérifier le garde-fou** : tenter de naviguer manuellement vers `http://localhost:5173/dashboard` → la redirection revient sur `/force-reset-password`
7. **Vérifier le garde-fou** : tenter de naviguer vers `http://localhost:5173/files` → même résultat

---

## Scénario 5 — Reset du mot de passe + accès normal

1. Sur la page `/force-reset-password` :
   - Vérifier/corriger le mot de passe temporaire dans le premier champ
   - Saisir un nouveau mot de passe : `NouveauMdp1!`
   - Confirmer : `NouveauMdp1!`
2. Cliquer sur **"Changer mon mot de passe"**
3. **Vérifier** : écran de succès vert apparaît ("Mot de passe modifié !")
4. Cliquer sur **"Accéder au tableau de bord"**
5. **Vérifier** : le tableau de bord s'affiche normalement, sans redirection forcée
6. Tester la navigation vers `/files`, `/shared` → tout fonctionne normalement

---

## Scénario 6 — Deuxième connexion après reset → plus de redirection

1. Se déconnecter
2. Se connecter avec `test.user@exemple.com` + `NouveauMdp1!`
3. Valider le code OTP
4. **Vérifier** :
   - L'utilisateur est redirigé directement vers `/dashboard` (pas vers `/force-reset-password`)
   - Le localStorage ne contient plus de clé `must_reset_password`
   - La navigation est libre

---

## Cas limites à vérifier

| Cas | Comportement attendu |
|-----|---------------------|
| Création sans nom | Formulaire HTML bloque (champ requis) |
| Création sans email | Formulaire HTML bloque (champ requis) |
| Email invalide | Formulaire HTML bloque (type="email") |
| Utilisateur standard sur `/admin-users` | Page accessible mais bouton visible (protection côté backend uniquement sur POST) |
| Utilisateur non authentifié sur `/admin-users` | Redirigé vers `/login` |
| Force reset : nouveau mdp identique au temp | Message d'erreur "Le nouveau mot de passe doit être différent du mot de passe temporaire" |
| Force reset : confirmation différente | Message d'erreur "Les deux nouveaux mots de passe ne correspondent pas" |
| Force reset : mot de passe actuel incorrect | Erreur backend "Mot de passe actuel incorrect" |
