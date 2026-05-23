export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  let normalized = dateStr;
  if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
    normalized = dateStr + 'Z';
  }
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return dateStr;
  const diffSec = Math.floor((Date.now() - date) / 1000);

  // Horloge déréglée ou date future → afficher la date exacte
  if (diffSec < 0) {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (diffSec < 60) return "À l'instant";
  if (diffSec < 3600) { const m = Math.floor(diffSec / 60); return `Il y a ${m} minute${m > 1 ? 's' : ''}`; }
  if (diffSec < 86400) { const h = Math.floor(diffSec / 3600); return `Il y a ${h} heure${h > 1 ? 's' : ''}`; }
  if (diffSec < 2592000) { const j = Math.floor(diffSec / 86400); return `Il y a ${j} jour${j > 1 ? 's' : ''}`; }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

