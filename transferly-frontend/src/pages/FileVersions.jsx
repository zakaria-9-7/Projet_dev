// frontend/src/pages/FileVersions.jsx
// NE-06 — Historique des versions d'un fichier
// Design system Transferly (blanc/bleu, sidebar, cards)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import api from '../api/files';

// ─── Icons (subset) ──────────────────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor' }) => {
  const icons = {
    back: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
    folder: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill={color === '#3b82f6' ? '#dbeafe' : 'none'} /></svg>,
    versions: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    shared: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    info: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  };
  return icons[name] || null;
};

// ─── Sidebar ─────────────────────────────────────────────────
function Sidebar({ activePage = 'versions' }) {
  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { id: 'myfiles', label: 'Mes Fichiers', icon: 'folder' },
    { id: 'shared', label: 'Partagés avec moi', icon: 'shared' },
    { id: 'versions', label: 'Versions', icon: 'versions' },
  ];

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: '#fff', borderRight: '1px solid #e8e8ed',
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0f0f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', letterSpacing: '-0.02em' }}>Transferly</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {navItems.map(item => {
          const active = activePage === item.id;
          return (
            <button key={item.id} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: active ? '#eff6ff' : 'transparent',
              color: active ? '#2563eb' : '#64748b',
              fontWeight: active ? 600 : 400, fontSize: 14,
              marginBottom: 2, textAlign: 'left',
            }}>
              <Icon name={item.icon} size={16} color={active ? '#2563eb' : '#94a3b8'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid #f0f0f5' }}>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', color: '#64748b', fontSize: 14, textAlign: 'left', marginBottom: 2,
        }}>
          <Icon name="settings" size={16} color="#94a3b8" /> Paramètres
        </button>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', color: '#ef4444', fontSize: 14, textAlign: 'left',
        }}>
          <Icon name="logout" size={16} color="#ef4444" /> Déconnexion
        </button>
      </div>
    </aside>
  );
}

// ─── Topbar ──────────────────────────────────────────────────
function Topbar() {
  return (
    <div style={{
      height: 60, display: 'flex', alignItems: 'center',
      padding: '0 28px', borderBottom: '1px solid #e8e8ed',
      background: '#fff', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Transferly</span>
      </div>
      <div style={{
        flex: 1, maxWidth: 440,
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f8f9fc', border: '1px solid #e8e8ed',
        borderRadius: 10, padding: '0 14px', height: 38,
      }}>
        <Icon name="search" size={15} color="#94a3b8" />
        <input
          placeholder="Rechercher des fichiers..."
          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5, color: '#1a1a2e', flex: 1 }}
        />
      </div>
      <div style={{ flex: 1 }} />
      <button style={{
        width: 36, height: 36, borderRadius: 8, border: '1px solid #e8e8ed',
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative',
      }}>
        <Icon name="bell" size={16} color="#64748b" />
        <span style={{
          position: 'absolute', top: 7, right: 7, width: 7, height: 7,
          background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff',
        }} />
      </button>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: 13,
      }}>
        U
      </div>
    </div>
  );
}

// ─── Restore Confirmation Modal ───────────────────────────────
function RestoreModal({ version, onConfirm, onCancel, loading }) {
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)',
        backdropFilter: 'blur(4px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '32px',
          width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Icon name="versions" size={22} color="#ea580c" />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>
            Restaurer la version {version.numeroVersion} ?
          </h3>
          <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
            La version courante sera archivée et la <strong>v{version.numeroVersion}</strong> deviendra la version active du fichier.
            Cette action est réversible.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '9px 20px', borderRadius: 9, border: '1.5px solid #e2e8f0',
                background: '#fff', color: '#475569', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
              }}>
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                padding: '9px 20px', borderRadius: 9, border: 'none',
                background: loading ? '#93c5fd' : '#2563eb',
                color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              {loading ? 'Restauration...' : 'Confirmer la restauration'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Version Row ──────────────────────────────────────────────
function VersionRow({ v, onRestoreClick, isLatest }) {
  const [hov, setHov] = useState(false);
  const initials = v.auteur.split(' ').map(w => w[0]).slice(0, 2).join('');
  const avatarColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
  const avatarColor = avatarColors[v.auteur.charCodeAt(0) % avatarColors.length];

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 1fr 90px 160px',
        gap: 16, padding: '16px 24px',
        background: v.estCourante ? '#f0f9ff' : (hov ? '#fafbfd' : '#fff'),
        borderBottom: '1px solid #f1f5f9',
        alignItems: 'center', transition: 'background .12s',
      }}>

      {/* Version badge */}
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 20,
          background: v.estCourante ? '#dbeafe' : '#f1f5f9',
          color: v.estCourante ? '#1d4ed8' : '#475569',
          fontSize: 12.5, fontWeight: 700, letterSpacing: '.01em',
        }}>
          v{v.numeroVersion}
          {v.estCourante && <span style={{ fontSize: 10, fontWeight: 400, opacity: .8 }}>actuelle</span>}
        </span>
      </div>

      {/* Date */}
      <div>
        <div style={{ fontSize: 13.5, color: '#334155', fontWeight: 500 }}>
          {v.date}
        </div>
        {isLatest && (
          <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Icon name="check" size={10} color="#22c55e" /> Dernière modification
          </div>
        )}
      </div>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: avatarColor + '22', border: `1.5px solid ${avatarColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10.5, fontWeight: 700, color: avatarColor, flexShrink: 0,
        }}>
          {initials}
        </div>
        <span style={{ fontSize: 13.5, color: '#475569' }}>{v.auteur}</span>
      </div>

      {/* Size */}
      <div style={{ fontSize: 13.5, color: '#64748b' }}>{v.taille}</div>

      {/* Action + SHA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        {v.estCourante ? (
          <span style={{
            padding: '6px 14px', borderRadius: 8,
            background: '#f0fdf4', color: '#16a34a',
            fontSize: 12.5, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Icon name="check" size={12} color="#16a34a" /> Courante
          </span>
        ) : (
          <button
            onClick={() => onRestoreClick(v)}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: '#2563eb', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'background .15s, transform .1s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'none'; }}>
            <Icon name="versions" size={12} color="#fff" /> Restaurer
          </button>
        )}
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8' }} title={v.sha256}>
          SHA-256 : {v.sha256.substring(0, 10)}…
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function FileVersions() {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const [versions, setVersions] = useState([]);
  const [fileName, setFileName] = useState('Document sans nom');
  const [loading, setLoading] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // NE-02: GET /files/{id}/versions
    const fetchVersions = async () => {
      try {
        // const response = await api.get(`/files/${fileId}/versions`);
        // setVersions(response.data);
        // setFileName(response.data.fileName || `Fichier #${fileId}`);

        // MOCK pour le développement :
        await new Promise(r => setTimeout(r, 600));
        setVersions([
          { id: 1, numeroVersion: 3, date: '27 Avr 2025, 14:32', auteur: 'Nizar El Amrani', taille: '2.6 MB', sha256: 'a3f9d1c2e8b047fa93c2d8b1', estCourante: true },
          { id: 2, numeroVersion: 2, date: '25 Avr 2025, 09:15', auteur: 'Imane Elouahi', taille: '2.4 MB', sha256: 'b7e2f4a9c3d801e52f8a0d3c', estCourante: false },
          { id: 3, numeroVersion: 1, date: '20 Avr 2025, 16:44', auteur: 'Nizar El Amrani', taille: '2.1 MB', sha256: 'c9a5b3d7e1f204b68d2e7f0a', estCourante: false },
        ]);
        setFileName('Rapport_Q1_2024.pdf');
      } catch (err) {
        console.error('Erreur chargement versions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [fileId]);

  const handleRestoreConfirm = async () => {
    setRestoring(true);
    try {
      // NE-02: POST /files/{id}/versions/{n}/restore
      // await api.post(`/files/${fileId}/versions/${restoreTarget.numeroVersion}/restore`);

      await new Promise(r => setTimeout(r, 900));

      setVersions(prev => prev.map(v => ({
        ...v,
        estCourante: v.numeroVersion === restoreTarget.numeroVersion,
      })));

      setToast({ type: 'success', message: `Version v${restoreTarget.numeroVersion} restaurée avec succès.` });
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      setToast({ type: 'error', message: 'Erreur lors de la restauration.' });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
    }
  };

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#f8f9fc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <Sidebar activePage="versions" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />

        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 60px' }}>

          {/* ── Page header ── */}
          <div style={{ marginBottom: 28 }}>
            <button
              onClick={() => navigate ? navigate(-1) : window.history.back()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: 'none', background: 'none', padding: 0,
                fontSize: 13.5, color: '#3b82f6', cursor: 'pointer',
                fontWeight: 500, marginBottom: 14,
              }}>
              <Icon name="back" size={15} color="#3b82f6" /> Retour aux fichiers
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0, letterSpacing: '-0.02em' }}>
                  Historique des versions
                </h1>
                <p style={{ fontSize: 13.5, color: '#94a3b8', marginTop: 4 }}>
                  Fichier : <span style={{ fontFamily: 'monospace', color: '#64748b', fontWeight: 500 }}>{fileName}</span>
                </p>
              </div>
              {/* Summary pill */}
              <div style={{
                padding: '8px 18px', borderRadius: 99,
                background: '#fff', border: '1px solid #e2e8f0',
                fontSize: 13, color: '#64748b', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Icon name="versions" size={14} color="#94a3b8" />
                {versions.length} version{versions.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* ── Table card ── */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div style={{
                width: 36, height: 36, border: '3px solid #e2e8f0',
                borderTopColor: '#3b82f6', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : (
            <div style={{
              background: '#fff', borderRadius: 14,
              border: '1px solid #e8e8ed',
              boxShadow: '0 1px 4px rgba(0,0,0,.04)',
              overflow: 'hidden',
            }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 1fr 90px 160px',
                gap: 16, padding: '12px 24px',
                borderBottom: '1.5px solid #f1f5f9',
                background: '#fafbfd',
              }}>
                {['Version', 'Date de modification', 'Auteur', 'Taille', 'Action'].map((h, i) => (
                  <span key={h} style={{
                    fontSize: 11, fontWeight: 600, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '.08em',
                    textAlign: i === 4 ? 'right' : 'left',
                  }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {versions.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  Aucune version disponible pour ce fichier.
                </div>
              ) : (
                versions.map((v, i) => (
                  <VersionRow
                    key={v.id}
                    v={v}
                    isLatest={i === 0}
                    onRestoreClick={setRestoreTarget}
                  />
                ))
              )}
            </div>
          )}

          {/* ── Info banner ── */}
          <div style={{
            marginTop: 20, padding: '12px 18px', borderRadius: 10,
            background: '#f0f9ff', border: '1px solid #bae6fd',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: '#0369a1',
          }}>
            <Icon name="info" size={15} color="#0369a1" />
            La restauration d'une ancienne version archive la version courante. Elle reste disponible dans cet historique.
          </div>

        </main>
      </div>

      {/* ── Restore Modal ── */}
      {restoreTarget && (
        <RestoreModal
          version={restoreTarget}
          loading={restoring}
          onConfirm={handleRestoreConfirm}
          onCancel={() => !restoring && setRestoreTarget(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          padding: '14px 20px', borderRadius: 12,
          background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: toast.type === 'success' ? '#16a34a' : '#dc2626',
          fontSize: 13.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,.1)',
        }}>
          {toast.type === 'success' ? <Icon name="check" size={16} color="#16a34a" /> : '⚠'}
          {toast.message}
        </div>
      )}
    </div>
  );
}