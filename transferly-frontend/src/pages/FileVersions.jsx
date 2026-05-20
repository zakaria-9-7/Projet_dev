// frontend/src/pages/FileVersions.jsx
// NE-06 — Historique des versions d'un fichier
// Design system Transferly (blanc/bleu, sidebar, cards)

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API, { getFile, getVersionPreview, getVersionDownload } from '../api/auth';
import AppLayout from '../components/AppLayout';
import { isEditable } from '../utils/fileType';
import FilePreviewModal from '../components/FilePreviewModal';

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
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    close: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  };
  return icons[name] || null;
};


// ─── Restore Confirmation Modal ───────────────────────────────
function RestoreModal({ version, onConfirm, onCancel, loading }) {
  return (
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
          Restaurer la version {version.numero_version} ?
        </h3>
        <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
          La version courante sera archivée et la <strong>v{version.numero_version}</strong> deviendra la version active du fichier.
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
  );
}

// ─── Preview Modal ────────────────────────────────────────────
function PreviewModal({ preview, onClose, onRestoreClick }) {
  // preview = { numero, content, loading, versionObj, isLatest }
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
      backdropFilter: 'blur(4px)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 760,
        boxShadow: '0 24px 64px rgba(0,0,0,.22)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="eye" size={18} color="#3b82f6" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                Aperçu de la version v{preview.numero}
              </h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Lecture seule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 6, color: '#94a3b8',
            }}>
            <Icon name="close" size={18} color="#94a3b8" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {preview.loading ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 200, gap: 12, color: '#94a3b8',
            }}>
              <div style={{
                width: 32, height: 32, border: '3px solid #e2e8f0',
                borderTopColor: '#3b82f6', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              Chargement…
            </div>
          ) : (
            <pre style={{
              margin: 0, padding: '20px 24px',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 13, lineHeight: 1.7, color: '#1e293b',
              background: '#fafafa',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: '60vh', overflowY: 'auto',
            }}>
              {preview.content}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '16px 24px', borderTop: '1px solid #f1f5f9',
        }}>
          {!preview.isLatest && (
            <button
              onClick={() => { onClose(); onRestoreClick(preview.versionObj); }}
              style={{
                padding: '9px 18px', borderRadius: 9, border: 'none',
                background: '#2563eb', color: '#fff',
                fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
              <Icon name="versions" size={13} color="#fff" /> Restaurer cette version
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px', borderRadius: 9,
              border: '1.5px solid #e2e8f0', background: '#fff',
              color: '#475569', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
            }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Version Row ──────────────────────────────────────────────
function VersionRow({ v, onRestoreClick, isLatest }) {
  const [hov, setHov] = useState(false);

  const canRestore  = permissions?.can_restore  ?? true;
  const canPreview  = permissions?.can_preview  ?? false;
  const canDownload = permissions?.can_download ?? false;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 1fr',
        gap: 16, padding: '16px 24px',
        background: isLatest ? '#f0f9ff' : (hov ? '#fafbfd' : '#fff'),
        borderBottom: '1px solid #f1f5f9',
        alignItems: 'center', transition: 'background .12s',
      }}>

      {/* Version badge */}
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 20,
          background: isLatest ? '#dbeafe' : '#f1f5f9',
          color: isLatest ? '#1d4ed8' : '#475569',
          fontSize: 12.5, fontWeight: 700, letterSpacing: '.01em',
        }}>
          v{v.numero_version}
          {isLatest && <span style={{ fontSize: 10, fontWeight: 400, opacity: .8 }}>actuelle</span>}
        </span>
      </div>

      {/* Date + description */}
      <div>
        <div style={{ fontSize: 13.5, color: '#334155', fontWeight: 500 }}>
          {v.date_modification ? new Date(v.date_modification).toLocaleString('fr-FR') : '—'}
        </div>
        {v.description && (
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{v.description}</div>
        )}
        {isLatest && (
          <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Icon name="check" size={10} color="#22c55e" /> Dernière modification
          </div>
        )}
      </div>

      {/* Action */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        {isLatest ? (
          <span style={{
            padding: '6px 14px', borderRadius: 8,
            background: '#f0fdf4', color: '#16a34a',
            fontSize: 12.5, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Icon name="check" size={12} color="#16a34a" /> Courante
          </span>
        ) : (
          <>
            {canPreview && (
              <button
                onClick={() => onPreviewClick(v)}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#475569',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  transition: 'background .15s, border-color .15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Prévisualiser
              </button>
            )}
            {canDownload && (
              <button
                onClick={() => onDownloadClick(v)}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#475569',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  transition: 'background .15s, border-color .15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Télécharger
              </button>
            )}
            {canRestore && (
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
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function FileVersions() {
  const [params] = useSearchParams();
  const fileId = params.get('fileId');
  const navigate = useNavigate();

  const [versions, setVersions] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [fileName, setFileName] = useState('Document sans nom');
  const [loading, setLoading] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);
  // previewTarget: the VersionFichier row the user wants to preview, or null
  const [previewTarget, setPreviewTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!fileId) { setLoading(false); return; }
    fetchVersions().finally(() => setLoading(false));
    getFile(fileId)
      .then(r => setFileName(r.data.nom))
      .catch(() => setFileName('Document sans nom'));
  }, [fileId]);

  const handlePreviewClick = async (v, isLatest) => {
    setPreviewVersion({ numero: v.numero_version, content: '', loading: true, versionObj: v, isLatest });
    try {
      const res = await API.get(`/files/${fileId}/versions/${v.numero_version}/content`);
      setPreviewVersion(prev => prev && prev.numero === v.numero_version
        ? { ...prev, content: res.data.content, loading: false }
        : prev
      );
    } catch (err) {
      setPreviewVersion(null);
      const status = err.response?.status;
      let msg = err.response?.data?.error || 'Erreur lors du chargement de la version.';
      if (status === 415) msg = 'Ce type de fichier n\'est pas éditable.';
      else if (status === 404) msg = 'Version introuvable.';
      setToast({ type: 'error', message: msg });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleRestoreConfirm = async () => {
    setRestoring(true);
    try {
      await API.post(`/files/${fileId}/versions/${restoreTarget.numero_version}/restore`);
      await fetchVersions();
      showToast('success', `Version v${restoreTarget.numero_version} restaurée avec succès.`);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Erreur lors de la restauration.');
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
    }
  };

  // Trigger a browser file download for a specific version
  const handleVersionDownload = async (v) => {
    try {
      const res = await getVersionDownload(fileId, v.numero_version);
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || `version_${v.numero_version}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Erreur lors du téléchargement.');
    }
  };

  if (!fileId) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', color: '#64748b' }}>
            <p style={{ fontSize: 15, marginBottom: 16 }}>
              Aucun fichier sélectionné. Retournez à vos fichiers.
            </p>
            <button
              onClick={() => navigate('/files')}
              style={{
                padding: '9px 20px', borderRadius: 9, border: 'none',
                background: '#2563eb', color: '#fff',
                fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}>
              Retour aux fichiers
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate(-1)}
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr 1fr',
            gap: 16, padding: '12px 24px',
            borderBottom: '1.5px solid #f1f5f9',
            background: '#fafbfd',
          }}>
            {['Version', 'Date de modification', 'Actions'].map((h, i) => (
              <span key={h} style={{
                fontSize: 11, fontWeight: 600, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '.08em',
                textAlign: i === 2 ? 'right' : 'left',
              }}>{h}</span>
            ))}
          </div>

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
                permissions={permissions}
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
    </AppLayout>
  );
}
