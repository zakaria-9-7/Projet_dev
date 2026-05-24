import { useState, useEffect } from 'react';
import { Activity, Search, Filter, Download } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatAction } from '../utils/formatAction';
import { formatRelativeTime } from '../utils/formatTime';

function normalizeLog(l) {
  return {
    id:          l.id,
    utilisateur: l.user_email ?? '—',
    action:      formatAction(l.action ?? ''),
    fichier:     l.fichier_nom || l.details || '—',
    horodatage:  l.date ? formatRelativeTime(l.date) : '—',
    statut:      l.statut === 'succes',
  };
}

const ACTION_BADGE = {
  'Téléversement':  { background: 'rgba(79,139,255,0.1)',    color: 'var(--wings-blue)',      border: '0.5px solid rgba(79,139,255,0.2)' },
  'Partage':        { background: 'rgba(142,108,184,0.15)',  color: '#b07cce',                border: '0.5px solid rgba(142,108,184,0.25)' },
  'Connexion':      { background: 'rgba(255,255,255,0.05)',  color: 'var(--wings-text-muted)', border: '0.5px solid var(--wings-border)' },
  'Téléchargement': { background: 'rgba(255,193,7,0.12)',    color: 'var(--wings-gold)',      border: '0.5px solid rgba(255,193,7,0.25)' },
  'Suppression':    { background: 'rgba(229,115,115,0.1)',   color: '#e57373',                border: '0.5px solid rgba(229,115,115,0.25)' },
};

export default function Logs() {
  const [logs, setLogs]     = useState([]);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tous');

  useEffect(() => {
    API.get('/logs/?limit=200')
      .then(r => setLogs((r.data ?? []).map(normalizeLog)))
      .catch(() => setError('Impossible de charger les journaux.'));
  }, []);

  const actions = ['Tous', ...new Set(logs.map(l => l.action))];

  const exportCSV = () => {
    const header = ['Utilisateur', 'Action', 'Fichier/Ressource', 'Horodatage', 'Statut'];
    const rows = visible.map(l => [
      l.utilisateur, l.action, l.fichier, l.horodatage, l.statut ? 'Succès' : 'Échec',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'logs_transferly.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const visible = logs.filter(l => {
    const matchSearch = l.utilisateur.toLowerCase().includes(search.toLowerCase())
      || l.action.toLowerCase().includes(search.toLowerCase())
      || l.fichier.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Tous' || l.action === filter;
    return matchSearch && matchFilter;
  });

  const colHeaderStyle = {
    fontFamily: 'monospace',
    fontSize: '10px',
    letterSpacing: '2px',
    color: 'var(--wings-text-muted)',
    opacity: 0.6,
    textTransform: 'uppercase',
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
              Journaux d'activité
            </h1>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
              Toutes les actions sur la plateforme
            </p>
          </div>
          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px',
              background: 'var(--wings-surface)',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 999, color: 'var(--wings-text-muted)',
              fontSize: 13, cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Download size={13} />
            Exporter
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: 'rgba(229,115,115,0.08)',
            border: '0.5px solid rgba(229,115,115,0.3)',
            color: '#e57373',
          }}>
            {error}
          </div>
        )}

        {/* Filtres */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
            <Search size={14} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--wings-text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur, action, fichier…"
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                background: 'var(--wings-surface)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 12,
                color: 'var(--wings-text)',
                fontSize: 13, outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Filter size={13} style={{ color: 'var(--wings-text-muted)', flexShrink: 0 }} />
            {actions.map(a => (
              <button
                key={a}
                onClick={() => setFilter(a)}
                style={{
                  padding: '6px 12px',
                  background: filter === a ? 'var(--wings-blue)' : 'var(--wings-surface)',
                  border: `0.5px solid ${filter === a ? 'var(--wings-blue)' : 'var(--wings-border)'}`,
                  borderRadius: 999,
                  color: filter === a ? '#fff' : 'var(--wings-text-muted)',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        <div>
          {/* En-tête colonnes */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
            <span style={{ ...colHeaderStyle, flex: 1 }}>Utilisateur</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 140px' }}>Action</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 200px' }}>Fichier</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 130px' }}>Horodatage</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 90px', textAlign: 'right' }}>Statut</span>
          </div>

          {/* Lignes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {visible.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                Aucun journal ne correspond à votre recherche
              </div>
            ) : visible.map(log => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--wings-surface)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 10, padding: '12px 20px',
              }}>
                {/* UTILISATEUR */}
                <div style={{ flex: 1, color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {log.utilisateur}
                </div>

                {/* ACTION */}
                <div style={{ flex: '0 0 140px' }}>
                  <span style={{
                    ...(ACTION_BADGE[log.action] ?? { background: 'rgba(255,255,255,0.04)', color: 'var(--wings-text-muted)', border: '0.5px solid var(--wings-border)' }),
                    fontFamily: 'monospace', fontSize: 10,
                    borderRadius: 6, padding: '3px 8px',
                    display: 'inline-block', letterSpacing: '0.5px',
                  }}>
                    {log.action}
                  </span>
                </div>

                {/* FICHIER */}
                <div style={{ flex: '0 0 200px', color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {log.fichier}
                </div>

                {/* HORODATAGE */}
                <div style={{ flex: '0 0 130px', color: 'var(--wings-text-muted)', fontSize: 12 }}>
                  {log.horodatage}
                </div>

                {/* STATUT */}
                <div style={{ flex: '0 0 90px', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: log.statut ? '#5dd39e' : '#e57373',
                  }} />
                  <span style={{ fontSize: 12, color: log.statut ? '#5dd39e' : '#e57373' }}>
                    {log.statut ? 'Succès' : 'Échec'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {visible.length > 0 && (
            <div style={{ padding: '10px 4px', marginTop: 6, fontSize: 12, color: 'var(--wings-text-muted)' }}>
              {visible.length} entrée{visible.length !== 1 ? 's' : ''} affichée{visible.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
