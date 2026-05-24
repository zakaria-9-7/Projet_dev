import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { colorFromName } from '../utils/colorFromName';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const diff = (Date.now() - d) / 1000;
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MyEspaces() {
  const navigate = useNavigate();
  const [espaces,     setEspaces]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newName,     setNewName]     = useState('');
  const [creating,    setCreating]    = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/espaces/all-mine');
      setEspaces(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await API.post('/espaces', { nom: newName.trim() });
      if (res.data.role_updated && res.data.role_updated !== localStorage.getItem('role')) {
        try {
          const refreshRes = await API.post('/auth/refresh');
          localStorage.setItem('token', refreshRes.data.token);
          localStorage.setItem('role', refreshRes.data.role);
          if (refreshRes.data.nom)   localStorage.setItem('nom', refreshRes.data.nom);
          if (refreshRes.data.email) localStorage.setItem('email', refreshRes.data.email);
          showToast('Espace créé ! Vous êtes maintenant Admin Espace.');
          setTimeout(() => window.location.reload(), 1500);
          return;
        } catch {
          showToast('Reconnexion nécessaire...', 'error');
          setTimeout(() => { localStorage.clear(); window.location.href = '/login'; }, 2000);
          return;
        }
      }
      showToast('Espace créé');
      setNewName('');
      setShowCreate(false);
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur création', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 8,
          background: toast.type === 'error' ? '#c0392b' : '#2e7d32',
          color: '#fff', fontWeight: 600, fontSize: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 24px' }}>
        {/* Titre */}
        <p style={{
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: 'var(--wings-text-muted)',
          marginBottom: '20px',
          letterSpacing: '0.5px',
        }}>
          Mes Espaces
        </p>

        {loading ? (
          <p style={{ color: 'var(--wings-text-muted)', fontSize: '13px' }}>Chargement…</p>
        ) : error ? (
          <p style={{ color: 'var(--wings-gold)', fontSize: '13px' }}>{error}</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '14px',
          }}>
            {/* Card Nouvel espace */}
            <NewEspaceCard onClick={() => setShowCreate(true)} />

            {/* Cards espaces */}
            {espaces.map(e => (
              <EspaceCard
                key={e.id}
                espace={e}
                onClick={() => navigate(`/espace/${e.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modale création */}
      {showCreate && (
        <div
          onClick={() => { setShowCreate(false); setNewName(''); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '440px',
              background: 'var(--wings-surface)',
              border: '0.5px solid var(--wings-border)',
              borderRadius: '16px',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{
                fontFamily: 'Georgia, serif',
                fontSize: '20px',
                fontWeight: 400,
                color: 'var(--wings-text)',
                margin: 0,
              }}>
                Nouvel espace
              </h2>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wings-text-muted)', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--wings-text-muted)', marginBottom: '20px' }}>
              Vous deviendrez Admin de cet espace et pourrez y inviter d'autres utilisateurs.
            </p>

            <input
              type="text"
              placeholder="Nom de l'espace…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '0.5px solid var(--wings-border)',
                borderRadius: '8px',
                background: 'var(--wings-bg)',
                color: 'var(--wings-text)',
                fontSize: '13px',
                marginBottom: '16px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                style={{
                  padding: '8px 20px',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--wings-text-muted)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: !newName.trim() || creating ? 'rgba(79,139,255,0.3)' : 'var(--wings-blue)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: !newName.trim() || creating ? 'not-allowed' : 'pointer',
                }}
              >
                {creating ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

/* ── Card Nouvel espace ─── */
function NewEspaceCard({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minHeight: '200px',
        border: `1px dashed ${hovered ? 'rgba(255,193,7,0.6)' : 'rgba(255,193,7,0.4)'}`,
        borderRadius: '14px',
        background: hovered ? 'rgba(255,193,7,0.08)' : 'rgba(255,193,7,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        padding: '24px',
      }}
    >
      <div style={{
        width: 44, height: 44,
        borderRadius: '50%',
        background: 'rgba(255,193,7,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px',
        color: 'var(--wings-gold)',
        lineHeight: 1,
      }}>
        +
      </div>
      <div style={{
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: 'var(--wings-gold)',
        marginTop: '12px',
      }}>
        Nouvel espace
      </div>
      <div style={{
        fontSize: '11px',
        color: 'var(--wings-text-muted)',
        marginTop: '4px',
        textAlign: 'center',
      }}>
        Crée un espace pour ton équipe
      </div>
    </div>
  );
}

/* ── Card Espace ─── */
function EspaceCard({ espace, onClick }) {
  const [hovered, setHovered] = useState(false);
  const { accent, faint } = colorFromName(espace.nom);
  const initiale = (espace.nom || '?')[0].toUpperCase();
  const isAdmin = espace.role === 'admin';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '14px',
        padding: '20px',
        border: `0.5px solid ${hovered ? accent : faint}`,
        background: hovered ? 'rgba(79,139,255,0.04)' : `rgba(79,139,255,0.02)`,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* Bandeau accent en haut */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '2px',
        background: accent,
        opacity: 0.6,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44,
          borderRadius: '12px',
          background: accent,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          fontSize: '20px',
          boxShadow: `0 0 16px ${faint}`,
          flexShrink: 0,
        }}>
          {initiale}
        </div>

        {/* Badge rôle */}
        {isAdmin ? (
          <span style={{
            fontFamily: 'monospace',
            fontSize: '8px',
            letterSpacing: '1px',
            padding: '3px 7px',
            borderRadius: '4px',
            background: 'rgba(255,193,7,0.18)',
            color: 'var(--wings-gold)',
            border: '0.5px solid var(--wings-gold)',
          }}>
            ADMIN
          </span>
        ) : (
          <span style={{
            fontFamily: 'monospace',
            fontSize: '8px',
            letterSpacing: '1px',
            padding: '3px 7px',
            borderRadius: '4px',
            background: 'rgba(168,180,212,0.1)',
            color: 'var(--wings-text-muted)',
            border: '0.5px solid rgba(168,180,212,0.2)',
          }}>
            MEMBRE
          </span>
        )}
      </div>

      {/* Nom */}
      <div style={{
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        color: 'var(--wings-text)',
        fontWeight: 400,
        marginBottom: '14px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {espace.nom}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--wings-text-muted)' }}>
          <Users size={12} style={{ color: accent, opacity: 0.7, flexShrink: 0 }} />
          {espace.nb_membres ?? '—'} membres
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--wings-text-muted)' }}>
          <FileText size={12} style={{ color: accent, opacity: 0.7, flexShrink: 0 }} />
          {espace.nb_fichiers ?? '—'} fichiers
        </span>
      </div>

      {/* Footer */}
      <div style={{
        paddingTop: '10px',
        borderTop: '0.5px solid rgba(168,180,212,0.08)',
      }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '10px',
          color: 'var(--wings-text-muted)',
        }}>
          {formatDate(espace.date_creation || espace.date_activite) || 'Actif'}
        </span>
      </div>
    </div>
  );
}
