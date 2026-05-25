import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Save, ArrowLeft, Lock, Unlock, AlertTriangle, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

export default function FileEditor() {
  const [params] = useSearchParams();
  const fileId  = params.get('fileId');
  const urlReadOnly = params.get('mode') === 'read';
  const navigate = useNavigate();

  const [content, setContent]       = useState('');
  const [original, setOriginal]     = useState('');
  const [fileName, setFileName]     = useState('');
  const [fileTaille, setFileTaille] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [lockStatus, setLockStatus] = useState({ checked: false, locked: false });
  const [lockReadOnly, setLockReadOnly] = useState(false);
  const [lockActionLoading, setLockActionLoading] = useState(false);
  const heartbeatIntervalRef = useRef(null);
  const lockStateRef = useRef({ is_mine: false, fileId: null });

  const readOnly = urlReadOnly || lockReadOnly;
  const dirty = !readOnly && content !== original;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const checkAndAcquireLock = useCallback(async (id) => {
    if (!id) return;
    try {
      const statusRes = await API.get(`/files/${id}/lock`);
      if (statusRes.data.locked && !statusRes.data.is_mine) {
        setLockStatus({ checked: true, ...statusRes.data });
        setLockReadOnly(true);
        return;
      }
      try {
        const acquireRes = await API.post(`/files/${id}/lock`, { manual: false });
        setLockStatus({ checked: true, ...acquireRes.data });
        setLockReadOnly(false);
      } catch (e) {
        if (e.response?.status === 409) {
          setLockStatus({ checked: true, locked: true, is_mine: false, lock: e.response.data.locked_by });
          setLockReadOnly(true);
        } else if (e.response?.status === 400) {
          // Fichier non lié à un espace : verrou non applicable
          setLockStatus({ checked: false, locked: false });
          setLockReadOnly(false);
        } else {
          setLockStatus({ checked: true, locked: false });
          setLockReadOnly(false);
        }
      }
    } catch (e) {
      console.error('Erreur check verrou:', e);
      setLockStatus({ checked: true, locked: false });
      setLockReadOnly(false);
    }
  }, []);

  // Bloc navigation navigateur (F5, fermer onglet, etc.)
  useEffect(() => {
    const handler = (e) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    if (!fileId) { setLoading(false); return; }
    API.get(`/files/${fileId}/content`)
      .then(res => {
        setContent(res.data.content);
        setOriginal(res.data.content);
        setFileName(res.data.nom);
        setFileTaille(res.data.taille);
      })
      .catch(err => {
        const status = err.response?.status;
        if (status === 415) showToast('Ce type de fichier n\'est pas éditable.', 'error');
        else if (status === 403) showToast('Vous n\'avez pas la permission de lire ce fichier.', 'error');
        else if (status === 404) showToast('Fichier introuvable.', 'error');
        else showToast(err.response?.data?.error || 'Erreur lors du chargement.', 'error');
      })
      .finally(() => setLoading(false));
    checkAndAcquireLock(fileId);
  }, [fileId]);

  // Heartbeat : maintenir le verrou actif tant qu'on édite
  useEffect(() => {
    if (!lockStatus.checked || !lockStatus.locked || !lockStatus.is_mine || !fileId) return;

    const heartbeat = async () => {
      try {
        await API.put(`/files/${fileId}/lock/heartbeat`);
      } catch (e) {
        console.error('Heartbeat échoué:', e);
        checkAndAcquireLock(fileId);
      }
    };

    heartbeatIntervalRef.current = setInterval(heartbeat, 30000);
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [lockStatus.checked, lockStatus.locked, lockStatus.is_mine, fileId]);

  // Polling pour détecter quand un AUTRE utilisateur pose un verrou
  // (utile quand on est en mode lecture ou édition sans verrou explicite)
  useEffect(() => {
    if (!fileId || (lockStatus.locked && lockStatus.is_mine)) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await API.get(`/files/${fileId}/lock`);
        const newStatus = res.data;

        setLockStatus(prev => {
          if (prev.locked === newStatus.locked &&
              prev.is_mine === newStatus.is_mine &&
              prev.lock?.user_id === newStatus.lock?.user_id) {
            return prev;
          }
          return { checked: true, ...newStatus };
        });

        if (newStatus.locked && !newStatus.is_mine) {
          setLockReadOnly(true);
        } else if (!newStatus.locked) {
          setLockReadOnly(false);
        }
      } catch (e) {
        // Silencieux
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [fileId, lockStatus.locked, lockStatus.is_mine]);

  // Synchronisation de la ref avec le state courant du verrou
  useEffect(() => {
    lockStateRef.current = {
      is_mine: lockStatus.is_mine || false,
      fileId: fileId,
    };
  }, [lockStatus.is_mine, fileId]);

  // Libération du verrou au démontage réel du composant (pas à chaque re-render)
  useEffect(() => {
    return () => {
      const { is_mine, fileId: storedFileId } = lockStateRef.current;
      if (is_mine && storedFileId) {
        API.delete(`/files/${storedFileId}/lock`).catch(() => {});
      }
    };
  }, []); // Pas de dépendances → s'exécute uniquement au mount/unmount réel

  const handleSave = useCallback(async () => {
    if (saving || !fileId) return;
    setSaving(true);
    try {
      await API.put(`/files/${fileId}`, { content }, {
        headers: { 'Content-Type': 'application/json' },
      });
      setOriginal(content);
      showToast('Modifications enregistrées, nouvelle version créée.');
    } catch (err) {
      const status = err.response?.status;
      if (status === 423) {
        showToast('Ce fichier est en cours de modification par un autre utilisateur. Réessayez dans quelques instants.', 'error');
      } else if (status === 403) {
        showToast('Vous n\'avez pas la permission de modifier ce fichier.', 'error');
      } else if (status === 415) {
        showToast('Type de fichier non éditable.', 'error');
      } else {
        showToast(err.response?.data?.error || 'Erreur lors de la sauvegarde.', 'error');
      }
    } finally {
      setSaving(false);
    }
  }, [fileId, content, saving]);

  const handleBack = () => {
    if (dirty && !window.confirm('Vous avez des modifications non sauvegardées. Quitter quand même ?')) return;
    navigate(-1);
  };

  const formatTaille = (taille) => {
    if (taille == null) return '';
    return taille < 0.01
      ? `${(taille * 1024).toFixed(0)} KB`
      : `${taille.toFixed(2)} MB`;
  };

  return (
    <AppLayout>
      {/* ── En-tête ── */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={handleBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: 'none', background: 'none', padding: 0,
            fontSize: 13.5, color: '#3b82f6', cursor: 'pointer',
            fontWeight: 500, marginBottom: 14,
          }}
        >
          <ArrowLeft size={15} color="#3b82f6" />
          Retour aux fichiers
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileText size={22} color="#3b82f6" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0, letterSpacing: '-0.02em' }}>
                {fileName || 'Éditeur de fichier'}
              </h1>
              {fileTaille != null && (
                <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '2px 0 0' }}>
                  {formatTaille(fileTaille)}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleBack}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 9,
                border: '1.5px solid #e2e8f0', background: '#fff',
                color: '#475569', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              Retour
            </button>
            {!urlReadOnly && !lockReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving || loading || !fileId}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 20px', borderRadius: 9,
                  border: 'none',
                  background: 'var(--wings-blue)',
                  color: '#fff', fontSize: 13.5, fontWeight: 600,
                  cursor: saving || loading ? 'not-allowed' : 'pointer',
                  transition: 'background .15s',
                  opacity: saving || loading ? 0.75 : 1,
                }}
              >
                {saving ? (
                  <>
                    <span style={{
                      width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite', display: 'inline-block',
                    }} />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Enregistrer
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bandeau lecture seule (permission URL) ── */}
      {urlReadOnly && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 9,
          background: '#fefce8', border: '1px solid #fde68a',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: '#92400e', fontWeight: 500,
        }}>
          <Lock size={14} />
          Mode lecture seule — vous n'avez pas la permission de modifier ce fichier.
        </div>
      )}

      {/* ── Bannière verrou actif ── */}
      {lockStatus.checked && lockStatus.locked && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          marginBottom: 12,
          borderRadius: 10,
          background: lockStatus.is_mine
            ? 'rgba(255,193,7,0.08)'
            : 'rgba(229,115,115,0.08)',
          border: `0.5px solid ${lockStatus.is_mine
            ? 'rgba(255,193,7,0.3)'
            : 'rgba(229,115,115,0.3)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lockStatus.is_mine ? (
              <Lock size={14} style={{ color: 'var(--wings-gold)' }} />
            ) : (
              <AlertTriangle size={14} style={{ color: '#e57373' }} />
            )}
            <div>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: lockStatus.is_mine ? 'var(--wings-gold)' : '#e57373',
              }}>
                {lockStatus.is_mine
                  ? 'Vous avez verrouillé ce fichier'
                  : `Fichier verrouillé par ${lockStatus.lock?.user_nom || lockStatus.lock?.user_email || 'un autre utilisateur'}`}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--wings-text-muted)',
                fontFamily: 'monospace',
                marginTop: 2,
              }}>
                {lockStatus.is_mine
                  ? 'Les autres ne peuvent pas modifier ce fichier'
                  : "Vous êtes en mode lecture seule. Le verrou expire après 15 minutes d'inactivité."}
              </div>
            </div>
          </div>

          {lockStatus.is_mine && (
            <button
              onClick={async () => {
                if (lockActionLoading) return;
                setLockActionLoading(true);
                try {
                  await API.delete(`/files/${fileId}/lock`);
                  setLockStatus({ checked: true, locked: false });
                  setLockReadOnly(false);
                } catch (e) {
                  console.error(e);
                } finally {
                  setLockActionLoading(false);
                }
              }}
              disabled={lockActionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'transparent',
                border: '0.5px solid var(--wings-gold)',
                borderRadius: 999,
                color: 'var(--wings-gold)',
                fontSize: 12,
                fontWeight: 500,
                cursor: lockActionLoading ? 'wait' : 'pointer',
                opacity: lockActionLoading ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              {lockActionLoading
                ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : <Unlock size={12} />}
              Libérer le verrou
            </button>
          )}
        </div>
      )}

      {/* ── Bannière : pas de verrou actif ── */}
      {lockStatus.checked && !lockStatus.locked && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          marginBottom: 12,
          borderRadius: 10,
          background: 'var(--wings-surface)',
          border: '0.5px solid var(--wings-border)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--wings-text-muted)' }}>
            Aucun verrou actif. D'autres peuvent modifier ce fichier.
          </div>
          <button
            onClick={async () => {
              if (lockActionLoading) return;
              setLockActionLoading(true);
              try {
                const res = await API.post(`/files/${fileId}/lock`, { manual: true });
                setLockStatus({ checked: true, ...res.data });
              } catch (e) {
                console.error(e);
              } finally {
                setLockActionLoading(false);
              }
            }}
            disabled={lockActionLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'transparent',
              border: '0.5px solid var(--wings-blue)',
              borderRadius: 999,
              color: 'var(--wings-blue)',
              fontSize: 12,
              fontWeight: 500,
              cursor: lockActionLoading ? 'wait' : 'pointer',
              opacity: lockActionLoading ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <Lock size={12} />
            Verrouiller
          </button>
        </div>
      )}

      {/* ── Zone d'édition ── */}
      <div style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid #e8e8ed',
        boxShadow: '0 1px 4px rgba(0,0,0,.04)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <div style={{
              width: 36, height: 36, border: '3px solid #e2e8f0',
              borderTopColor: 'var(--wings-blue)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={readOnly ? undefined : e => setContent(e.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: '60vh',
              padding: '20px 24px',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: 13.5,
              lineHeight: 1.7,
              color: readOnly ? '#64748b' : '#1e293b',
              background: readOnly ? '#f1f5f9' : '#fafafa',
              border: 'none',
              outline: 'none',
              resize: readOnly ? 'none' : 'vertical',
              boxSizing: 'border-box',
              display: 'block',
              cursor: readOnly ? 'default' : 'text',
            }}
          />
        )}
      </div>

      {/* ── Indicateur dirty ── */}
      {!loading && !readOnly && (
        <div style={{
          marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12.5,
          color: dirty ? '#d97706' : '#22c55e',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dirty ? '#f59e0b' : '#22c55e',
            display: 'inline-block',
          }} />
          {dirty ? 'Modifications non sauvegardées' : 'Aucune modification en attente'}
        </div>
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
          maxWidth: 420,
        }}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
