// frontend/src/pages/FileVersions.jsx
// Historique des versions d'un fichier

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API, { getFile, getVersionDownload } from '../api/auth';
import AppLayout from '../components/AppLayout';
import FilePreviewModal from '../components/FilePreviewModal';

// ─── Icons ────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor' }) => {
  const icons = {
    back:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
    versions: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
    check:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    info:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  };
  return icons[name] || null;
};

// ─── Modale de confirmation de restauration ───────────────────
function RestoreModal({ version, onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--wings-surface)',
        border: '0.5px solid var(--wings-border)',
        borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <h3 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 18, fontWeight: 400,
          color: 'var(--wings-text)', margin: '0 0 10px',
        }}>
          Restaurer la version {version.numero_version} ?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--wings-text-muted)', lineHeight: 1.6, margin: '0 0 24px' }}>
          La version courante sera archivée et la{' '}
          <strong style={{ color: 'var(--wings-text)', fontWeight: 600 }}>v{version.numero_version}</strong>{' '}
          deviendra la version active du fichier. Cette action est réversible.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 20px', borderRadius: 999,
              border: '0.5px solid var(--wings-border)',
              background: 'transparent',
              color: 'var(--wings-text-muted)',
              fontSize: 13, cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; e.currentTarget.style.borderColor = 'var(--wings-text-muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; e.currentTarget.style.borderColor = 'var(--wings-border)'; }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 20px', borderRadius: 999, border: 'none',
              background: 'var(--wings-blue)',
              color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--wings-blue-dark)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--wings-blue)'; }}
          >
            {loading ? 'Restauration...' : 'Confirmer la restauration'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ligne de version ─────────────────────────────────────────
function VersionRow({ v, isLatest, permissions, onRestoreClick, onPreviewClick, onDownloadClick }) {
  const [hov, setHov] = useState(false);

  const canRestore  = permissions?.can_restore  ?? true;
  const canPreview  = permissions?.can_preview  ?? false;
  const canDownload = permissions?.can_download ?? false;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 20px',
        background: 'var(--wings-surface)',
        border: `0.5px solid ${hov ? 'rgba(79,139,255,0.3)' : 'var(--wings-border)'}`,
        borderRadius: 12,
        marginBottom: 10,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Gauche : badge version + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 8px', borderRadius: 6, flexShrink: 0,
          background: isLatest ? 'rgba(79,139,255,0.12)' : 'rgba(168,180,212,0.08)',
          color: isLatest ? 'var(--wings-blue)' : 'var(--wings-text-muted)',
          border: isLatest ? '0.5px solid rgba(79,139,255,0.25)' : '0.5px solid var(--wings-border)',
          fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
        }}>
          v{v.numero_version}
          {isLatest && <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.8 }}>actuelle</span>}
        </span>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--wings-text)', fontWeight: 400 }}>
            {v.date_modification ? new Date(v.date_modification).toLocaleString('fr-FR') : '—'}
          </div>
          {v.description && (
            <div style={{ fontSize: 11, color: 'var(--wings-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {v.description}
            </div>
          )}
        </div>
      </div>

      {/* Droite : statut ou actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {isLatest ? (
          <span style={{
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(107,155,120,0.12)',
            color: '#5dd39e',
            fontSize: 11, fontFamily: 'monospace',
            border: '0.5px solid rgba(93,211,158,0.2)',
          }}>
            Courante
          </span>
        ) : (
          <>
            {canPreview && (
              <button
                onClick={() => onPreviewClick(v)}
                style={{
                  padding: '5px 12px', borderRadius: 999,
                  border: '0.5px solid var(--wings-border)',
                  background: 'transparent',
                  color: 'var(--wings-text-muted)',
                  fontSize: 12, cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; e.currentTarget.style.borderColor = 'var(--wings-text-muted)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; e.currentTarget.style.borderColor = 'var(--wings-border)'; }}
              >
                Aperçu
              </button>
            )}
            {canDownload && (
              <button
                onClick={() => onDownloadClick(v)}
                style={{
                  padding: '5px 12px', borderRadius: 999,
                  border: '0.5px solid var(--wings-border)',
                  background: 'transparent',
                  color: 'var(--wings-text-muted)',
                  fontSize: 12, cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; e.currentTarget.style.borderColor = 'var(--wings-text-muted)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; e.currentTarget.style.borderColor = 'var(--wings-border)'; }}
              >
                Télécharger
              </button>
            )}
            {canRestore && (
              <button
                onClick={() => onRestoreClick(v)}
                style={{
                  padding: '5px 14px', borderRadius: 999,
                  border: '0.5px solid var(--wings-border)',
                  background: 'transparent',
                  color: 'var(--wings-text-muted)',
                  fontSize: 12, cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; e.currentTarget.style.borderColor = 'var(--wings-text-muted)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; e.currentTarget.style.borderColor = 'var(--wings-border)'; }}
              >
                Restaurer
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────
export default function FileVersions() {
  const [params] = useSearchParams();
  const fileId   = params.get('fileId');
  const navigate = useNavigate();

  const [versions,      setVersions]      = useState([]);
  const [permissions,   setPermissions]   = useState(null);
  const [fileName,      setFileName]      = useState('Document sans nom');
  const [loading,       setLoading]       = useState(true);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring,     setRestoring]     = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [toast,         setToast]         = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchVersions = () =>
    API.get(`/files/${fileId}/versions/`).then(res => {
      if (Array.isArray(res.data)) {
        setVersions(res.data);
      } else {
        setVersions(res.data.versions ?? []);
        setPermissions(res.data.permissions ?? null);
      }
    }).catch(err => console.error(err));

  useEffect(() => {
    if (!fileId) { setLoading(false); return; }
    fetchVersions().finally(() => setLoading(false));
    getFile(fileId)
      .then(r => setFileName(r.data.nom))
      .catch(() => setFileName('Document sans nom'));
  }, [fileId]);

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
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, marginBottom: 16, color: 'var(--wings-text-muted)' }}>
              Aucun fichier sélectionné. Retournez à vos fichiers.
            </p>
            <button
              onClick={() => navigate('/files')}
              style={{
                padding: '8px 20px', borderRadius: 999, border: 'none',
                background: 'var(--wings-blue)', color: '#fff',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Retour aux fichiers
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* ── Fil d'ariane ── */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          border: 'none', background: 'transparent', padding: 0,
          fontSize: 13, color: 'var(--wings-text-muted)', cursor: 'pointer',
          marginBottom: 20,
        }}
      >
        <Icon name="back" size={14} color="var(--wings-text-muted)" /> Retour
      </button>

      {/* ── En-tête ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 24, fontWeight: 400,
          color: 'var(--wings-text)', margin: '0 0 6px',
        }}>
          Historique des versions
        </h1>
        <p style={{
          fontSize: 11, fontFamily: 'monospace',
          color: 'var(--wings-gold)', margin: 0,
        }}>
          {fileName}
          {versions.length > 0 && (
            <span style={{ color: 'var(--wings-text-muted)', marginLeft: 10 }}>
              · {versions.length} version{versions.length !== 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* ── Liste des versions ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ fontSize: 13, color: 'var(--wings-text-muted)' }}>Chargement…</div>
        </div>
      ) : versions.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64 }}>
          <p style={{ fontSize: 14, color: 'var(--wings-text-muted)', margin: '0 0 4px' }}>
            Aucune version disponible pour ce fichier.
          </p>
        </div>
      ) : (
        <div>
          {versions.map((v, i) => (
            <VersionRow
              key={v.id}
              v={v}
              isLatest={i === 0}
              permissions={permissions}
              onRestoreClick={setRestoreTarget}
              onPreviewClick={setPreviewTarget}
              onDownloadClick={handleVersionDownload}
            />
          ))}
        </div>
      )}

      {/* ── Bloc d'information ── */}
      {!loading && (
        <div style={{
          marginTop: 12,
          padding: '14px 18px',
          borderLeft: '3px solid var(--wings-gold)',
          borderRadius: '0 10px 10px 0',
          background: 'var(--wings-surface)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          fontSize: 12, color: 'var(--wings-text-muted)',
        }}>
          <Icon name="info" size={14} color="var(--wings-gold)" />
          La restauration d'une ancienne version archive la version courante. Elle reste disponible dans cet historique.
        </div>
      )}

      {/* ── Modale de restauration ── */}
      {restoreTarget && (
        <RestoreModal
          version={restoreTarget}
          loading={restoring}
          onConfirm={handleRestoreConfirm}
          onCancel={() => !restoring && setRestoreTarget(null)}
        />
      )}

      {/* ── Modale de prévisualisation ── */}
      {previewTarget && (
        <FilePreviewModal
          file={{ id: fileId, nom: fileName }}
          previewUrl={`/files/${fileId}/versions/${previewTarget.numero_version}/preview`}
          onClose={() => setPreviewTarget(null)}
          onDownload={() => handleVersionDownload(previewTarget)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          padding: '10px 18px', borderRadius: 8,
          background: toast.type === 'success' ? '#059669' : '#dc2626',
          color: '#fff', fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {toast.message}
        </div>
      )}
    </AppLayout>
  );
}
