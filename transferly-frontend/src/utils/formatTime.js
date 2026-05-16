export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';

  // Le backend renvoie des dates UTC sans suffixe 'Z'.
  // On force l'interprétation en UTC en ajoutant 'Z' si absent.
  let normalized = dateStr;
  if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
    normalized = dateStr + 'Z';
  }

  const date = new Date(normalized);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return "à l'instant";
  if (diffSec < 60) return "à l'instant";
  if (diffSec < 3600) {
    const min = Math.floor(diffSec / 60);
    return `Il y a ${min} minute${min > 1 ? 's' : ''}`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `Il y a ${h} heure${h > 1 ? 's' : ''}`;
  }
  if (diffSec < 2592000) {
    const j = Math.floor(diffSec / 86400);
    return `Il y a ${j} jour${j > 1 ? 's' : ''}`;
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
