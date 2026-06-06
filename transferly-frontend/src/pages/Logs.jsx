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
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  
  // Nouveaux états de filtrage & pagination
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate,      setStartDate]      = useState('');
  const [endDate,        setEndDate]        = useState('');
  const [page,           setPage]           = useState(1);
  const LIMIT = 50;

  const fetchLogs = () => {
    setLoading(true);
    const params = {
      limit:      LIMIT,
      offset:     (page - 1) * LIMIT,
      action:     selectedAction || undefined,
      statut:     selectedStatus || undefined,
      start_date: startDate || undefined,
      end_date:   endDate || undefined,
    };

    API.get('/logs/', { params })
      .then(r => setLogs((r.data ?? []).map(l => ({ ...normalizeLog(l), original_statut: l.statut }))))
      .catch(() => setError('Impossible de charger les journaux.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [page, selectedAction, selectedStatus, startDate, endDate]);

  const exportCSV = () => {
    const params = {
      action:     selectedAction || undefined,
      statut:     selectedStatus || undefined,
      start_date: startDate || undefined,
      end_date:   endDate || undefined,
      export:     'csv'
    };
    
    API.get('/logs/', { params, responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url; a.download = `logs_export_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('Erreur lors de l\'export CSV'));
  };

  const visible = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.utilisateur.toLowerCase().includes(q)
      || l.action.toLowerCase().includes(q)
      || l.fichier.toLowerCase().includes(q);
  });

  const colHeaderStyle = {
    fontFamily: 'monospace',
    fontSize: '10px',
    letterSpacing: '2px',
    color: 'var(--wings-text-muted)',
    opacity: 0.6,
    textTransform: 'uppercase',
  };

  const selectStyle = {
    padding: '8px 12px',
    background: 'var(--wings-surface)',
    border: '0.5px solid var(--wings-border)',
    borderRadius: 10,
    color: 'var(--wings-text)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    minWidth: 140,
  };

  const inputDateStyle = {
    ...selectStyle,
    minWidth: 'auto',
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 6 }}>
              Journaux d'activité
            </h1>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 14, margin: 0 }}>
              Audit global des actions et événements de sécurité
            </p>
          </div>
          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px',
              background: 'var(--wings-surface)',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 999, color: 'var(--wings-text)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--wings-gold)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--wings-border)'}
          >
            <Download size={14} />
            Exporter CSV
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, fontSize: 13,
            background: 'rgba(229,115,115,0.08)',
            border: '0.5px solid rgba(229,115,115,0.3)',
            color: '#e57373',
          }}>
            {error}
          </div>
        )}

        {/* BARRE DE FILTRES MULTI-CRITÈRES */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
          padding: 20, background: 'var(--wings-surface)', border: '0.5px solid var(--wings-border)',
          borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Recherche libre */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 200px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--wings-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Recherche</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--wings-text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Utilisateur, fichier..."
                style={{ ...selectStyle, width: '100%', paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* Action */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--wings-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Action</label>
            <select
              value={selectedAction}
              onChange={e => { setSelectedAction(e.target.value); setPage(1); }}
              style={selectStyle}
            >
              <option value="">Toutes les actions</option>
              <option value="connexion">Connexions</option>
              <option value="connexion_echouee">Échecs de connexion</option>
              <option value="deconnexion">Déconnexions</option>
              <option value="upload">Téléversements</option>
              <option value="download">Téléchargements</option>
              <option value="modification">Modifications</option>
              <option value="suppression">Suppressions</option>
              <option value="blocage_securite">Blocages sécurité</option>
            </select>
          </div>

          {/* Statut */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--wings-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Statut</label>
            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
              style={selectStyle}
            >
              <option value="">Tous les statuts</option>
              <option value="succes">Succès</option>
              <option value="echec">Échec</option>
              <option value="bloque">Bloqué</option>
            </select>
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--wings-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Période</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} style={inputDateStyle} />
              <span style={{ color: 'var(--wings-text-muted)', fontSize: 12 }}>au</span>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} style={inputDateStyle} />
            </div>
          </div>
          
          {(selectedAction || selectedStatus || startDate || endDate || search) && (
             <button 
               onClick={() => { setSelectedAction(''); setSelectedStatus(''); setStartDate(''); setEndDate(''); setSearch(''); setPage(1); }}
               style={{ background: 'none', border: 'none', color: 'var(--wings-blue)', fontSize: 12, cursor: 'pointer', paddingBottom: 10, paddingLeft: 4 }}
             >
               Effacer
             </button>
          )}
        </div>

        {/* Liste */}
        <div style={{ background: 'var(--wings-surface)', border: '0.5px solid var(--wings-border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          {/* En-tête colonnes */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', background: 'rgba(0,0,0,0.02)', borderBottom: '0.5px solid var(--wings-border)' }}>
            <span style={{ ...colHeaderStyle, flex: 1 }}>Utilisateur</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 160px' }}>Action</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 200px' }}>Fichier / Détails</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 140px' }}>Date</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 100px', textAlign: 'right' }}>Statut</span>
          </div>

          {/* Lignes */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 14 }}>Chargement des journaux…</div>
            ) : visible.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 14, fontStyle: 'italic' }}>
                Aucun journal ne correspond à vos critères
              </div>
            ) : visible.map((log, idx) => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center',
                padding: '14px 24px',
                borderBottom: idx === visible.length - 1 ? 'none' : '0.5px solid var(--wings-border)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,139,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {log.utilisateur}
                </div>

                <div style={{ flex: '0 0 160px' }}>
                  <span style={{
                    ...(ACTION_BADGE[log.action] ?? { background: 'rgba(0,0,0,0.05)', color: 'var(--wings-text-muted)', border: '1px solid var(--wings-border)' }),
                    fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
                    borderRadius: 6, padding: '3px 8px',
                    display: 'inline-block', letterSpacing: '0.5px', textTransform: 'uppercase'
                  }}>
                    {log.action}
                  </span>
                </div>

                <div style={{ flex: '0 0 200px', color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {log.fichier}
                </div>

                <div style={{ flex: '0 0 140px', color: 'var(--wings-text-muted)', fontSize: 12 }}>
                  {log.horodatage}
                </div>

                <div style={{ flex: '0 0 100px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: log.statut ? '#5dd39e' : (logs.find(x => x.id === log.id)?.original_statut === 'bloque' ? '#ff9800' : '#e57373'),
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: log.statut ? '#5dd39e' : (logs.find(x => x.id === log.id)?.original_statut === 'bloque' ? '#ff9800' : '#e57373') }}>
                    {log.statut ? 'Succès' : (logs.find(x => x.id === log.id)?.original_statut === 'bloque' ? 'Bloqué' : 'Échec')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PAGINATION */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 10 }}>
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--wings-surface)', border: '0.5px solid var(--wings-border)',
              color: page === 1 ? 'var(--wings-text-muted)' : 'var(--wings-text)',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1, transition: 'all 0.15s'
            }}
          >
            Précédent
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--wings-text-muted)', fontFamily: 'monospace' }}>
            PAGE {page}
          </span>
          <button
            disabled={logs.length < LIMIT || loading}
            onClick={() => setPage(p => p + 1)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--wings-surface)', border: '0.5px solid var(--wings-border)',
              color: logs.length < LIMIT ? 'var(--wings-text-muted)' : 'var(--wings-text)',
              cursor: logs.length < LIMIT ? 'not-allowed' : 'pointer',
              opacity: logs.length < LIMIT ? 0.5 : 1, transition: 'all 0.15s'
            }}
          >
            Suivant
          </button>
        </div>

        {!loading && (
           <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--wings-text-muted)' }}>
             Affichage de {visible.length} entrée{visible.length !== 1 ? 's' : ''} sur cette page
           </div>
        )}
      </div>
    </AppLayout>
  );
}
