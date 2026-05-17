export function formatAction(action) {
  if (!action) return '';
  const a = action.toLowerCase();
  if (a.startsWith('update_acl')) return 'Modification des accès';
  if (a.startsWith('create_acl')) return 'Partage de fichier';
  if (a.startsWith('delete_acl')) return 'Retrait d\'accès';
  if (a === 'upload') return 'Téléversement de fichier';
  if (a === 'download') return 'Téléchargement de fichier';
  if (a === 'connexion' || a === 'login') return 'Connexion';
  if (a === 'logout' || a === 'deconnexion') return 'Déconnexion';
  if (a.startsWith('delete_file') || a === 'delete') return 'Suppression de fichier';
  if (a.startsWith('create_espace')) return 'Création d\'espace';
  if (a.startsWith('delete_espace')) return 'Suppression d\'espace';
  if (a.startsWith('join_espace')) return 'A rejoint un espace';
  if (a.startsWith('create_invitation')) return 'Invitation envoyée';
  if (a.startsWith('register')) return 'Création de compte';
  return action.replace(/_/g, ' ').replace(/:/g, ' ').charAt(0).toUpperCase() + action.replace(/_/g, ' ').replace(/:/g, ' ').slice(1);
}
