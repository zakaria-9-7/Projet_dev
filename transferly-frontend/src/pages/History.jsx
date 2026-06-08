import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { History as HistoryIcon, FileText, Search, X, ChevronDown } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';

const LIMIT = 50;

const SCOPES = [
  { key: 'all',     label: 'Tous' },
  { key: 'mine',    label: 'Mes fichiers' },
  { key: 'espaces', label: 'Espaces' },
];

export default function History() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const fileId         = searchParams.get('fileId');

  const [items,       setItems]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);
  const [scope,       setScope]       = useState('all');
  const [search,      setSearch]      = useState('');
  const [offset,      setOffset]      = useState(0);

  // Reset + refetch whenever scope changes
  useEffect(() => {
    if (fileId) return;
    setItems([]);
    setOffset(0);
    setSearch('');
    setError(null);
    setLoading(true);
    API.get('/history', { params: { scope, limit: LIMIT, offset: 0 } })
      .then(res => {
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .catch(err => setError(err.response?.data?.error || "Erreur de chargement de l'historique"))
      .finally(() => setLoading(false));
  }, [scope, fileId]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter(it => (it.fichier_nom || '').toLowerCase().includes(q)) : items;
  }, [items, search]);

  // Backward-compat: /versions?fileId=<id> redirects to /file-versions?fileId=<id>
  if (fileId) return <Navigate to={`/file-versions?fileId=${fileId}`} replace />;

  const handleLoadMore = () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    setLoadingMore(true);
    API.get('/history', { params: { scope, limit: LIMIT, offset: newOffset } })
      .then(res => {
        setItems(prev => [...prev, ...(res.data.items || [])]);
        setTotal(res.data.total || 0);
      })
      .catch(err => setError(err.response?.data?.error || "Erreur de chargement de l'historique"))
      .finally(() => setLoadingMore(false));
  };

  return (
    <AppLayout>

      {/* ── Filtres ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        flexWrap: 'wrap', marginBottom: 20,
      }}>
        {/* Scope tabs */}
        <div style={{
          display: 'flex',
          border: '0.5px solid var(--wings-border)',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {SCOPES.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              style={{
                padding: '8px 18px',
                fontSize: 11, fontWeight: 700,
                fontFamily: 'monospace',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                background: scope === s.key ? 'var(--wings-gold)' : 'var(--wings-surface)',
                color: scope === s.key ? '#000' : 'var(--wings-text-muted)',
                border: 'none',
                borderLeft: i > 0 ? '0.5px solid var(--wings-border)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Recherche client-side sur fichier_nom */}
        <div style={{ position: 'relative' }}>
          <Search style={{
            position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
            width: 13, height: 13, color: 'var(--wings-text-muted)',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par nom de fichier..."
            style={{
              paddingLeft: 28,
              paddingRight: search ? 26 : 10,
              paddingTop: 7, paddingBottom: 7,
              background: 'var(--wings-surface)',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 10,
              color: 'var(--wings-text)',
              fontSize: 12, outline: 'none',
              width: 230,
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--wings-blue)';
              e.target.style.boxShadow = '0 0 0 3px rgba(79,139,255,0.1)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--wings-border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: 'var(--wings-text-muted)', display: 'flex',
              }}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>

        {/* Compteur */}
        {!loading && !error && (
          <span style={{ fontSize: 12, color: 'var(--wings-text-muted)', marginLeft: 'auto' }}>
            {total} version{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Contenu ── */}
      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 240, color: 'var(--wings-text-muted)', fontSize: 13,
        }}>
          Chargement…
        </div>

      ) : error ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: 240, gap: 8,
        }}>
          <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
          <button
            onClick={() => { setLoading(true); setError(null); API.get('/history', { params: { scope, limit: LIMIT, offset: 0 } }).then(res => { setItems(res.data.items || []); setTotal(res.data.total || 0); }).catch(e => setError(e.response?.data?.error || "Erreur de chargement de l'historique")).finally(() => setLoading(false)); }}
            style={{ fontSize: 12, color: 'var(--wings-blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Réessayer
          </button>
        </div>

      ) : filteredItems.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: 240, gap: 10,
          color: 'var(--wings-text-muted)',
        }}>
          <HistoryIcon style={{ width: 40, height: 40, opacity: 0.3 }} />
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
            {search
              ? `Aucun résultat pour « ${search} »`
              : 'Aucun historique pour le moment'}
          </p>
        </div>

      ) : (
        <div style={{
          background: 'var(--wings-surface)',
          border: '0.5px solid var(--wings-border)',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          {filteredItems.map((item, i) => (
            <HistoryRow
              key={item.id}
              item={item}
              last={i === filteredItems.length - 1}
              onClick={() => navigate(`/file-versions?fileId=${item.fichier_id}`)}
            />
          ))}
        </div>
      )}

      {/* ── Charger plus ── */}
      {!loading && !error && items.length < total && filteredItems.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 22px',
              background: 'var(--wings-surface)',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 999,
              color: loadingMore ? 'var(--wings-text-muted)' : 'var(--wings-text)',
              fontSize: 13, fontWeight: 500,
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              opacity: loadingMore ? 0.6 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.background = 'rgba(79,139,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--wings-surface)'; }}
          >
            <ChevronDown style={{ width: 14, height: 14 }} />
            {loadingMore ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      )}

    </AppLayout>
  );
}

// ── Row ──────────────────────────────────────────────────────────
function HistoryRow({ item, last, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 20px',
        borderBottom: last ? 'none' : '0.5px solid var(--wings-border)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,193,7,0.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Icône fichier */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: 'rgba(79,139,255,0.05)',
        border: '0.5px solid var(--wings-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FileText style={{ width: 14, height: 14, color: 'var(--wings-blue)', opacity: 0.8 }} />
      </div>

      {/* Infos principales */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {/* Nom fichier */}
          <span style={{
            fontSize: 13, fontWeight: 500, color: 'var(--wings-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 260,
          }}>
            {item.fichier_nom}
          </span>

          {/* Badge version */}
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '2px 8px',
            fontFamily: 'monospace',
            background: 'var(--wings-gold)',
            color: '#000',
            borderRadius: 6, flexShrink: 0,
          }}>
            V{item.numero_version}
          </span>

          {/* Badge espace (fichier pas perso) */}
          {!item.is_mine && item.espace_nom && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 8px',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              background: 'rgba(79,139,255,0.08)',
              color: 'var(--wings-blue-pale)',
              border: '0.5px solid rgba(79,139,255,0.2)',
              borderRadius: 6, flexShrink: 0,
            }}>
              {item.espace_nom}
            </span>
          )}
        </div>

        {/* Description */}
        <p style={{
          fontSize: 12, color: 'var(--wings-text-muted)',
          margin: '2px 0 0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.description || '—'}
        </p>
      </div>

      {/* Auteur */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--wings-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0,
        }}>
          {(item.auteur_email || '?')[0].toUpperCase()}
        </div>
        <span style={{
          fontSize: 12, color: 'var(--wings-text-muted)',
          maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.auteur_email || '—'}
        </span>
      </div>

      {/* Date */}
      <div style={{
        flexShrink: 0, textAlign: 'right',
        fontSize: 12, color: 'var(--wings-text-muted)',
        minWidth: 100,
      }}>
        {formatRelativeTime(item.date_modification)}
      </div>
    </div>
  );
}
