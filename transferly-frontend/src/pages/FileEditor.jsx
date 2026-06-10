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
  const [lockStatus, setLockStatus] = useState({ checked: false, locked: false, can_edit: true });
  const [lockReadOnly, setLockReadOnly] = useState(false);
  const [lockActionLoading, setLockActionLoading] = useState(false);
  const [lockStateRef, setLockStateRef] = [useRef({ is_mine: false, fileId: null }), null]; // Correction technique interne pour le remplacement
  const heartbeatIntervalRef = useRef(null);
  const lockStateRefReal = useRef({ is_mine: false, fileId: null });
  const [dirty, setDirty] = useState(false);

  const readOnly = urlReadOnly || lockReadOnly;

  const triggerAutoLock = useCallback(async (id) => {
    if (!id || lockStatus.locked) return;
    try {
      const res = await API.post(`/files/${id}/lock`);
      const { is_locked, locked_by_email, can_edit } = res.data;
      
      setLockStatus({
        checked: true,
        locked: is_locked,
        is_mine: can_edit,
        can_edit: can_edit,
        lock: { user_email: locked_by_email }
      });
      
      if (!can_edit) {
        setLockReadOnly(true);
      } else {
        setLockReadOnly(false);
      }
    } catch (e) {
      console.error('Erreur auto-lock:', e);
      setLockStatus({ checked: true, locked: false, can_edit: true });
    }
  }, [lockStatus.locked]);

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
    
    // Lazy Locking: Le verrouillage automatique ne se déclenche plus à l'ouverture,
    // mais lors de la première modification du texte.
  }, [fileId]);

  // Heartbeat : maintenir le verrou actif tant qu'on édite
  useEffect(() => {
    if (!lockStatus.checked || !lockStatus.locked || !lockStatus.is_mine || !fileId) return;

    const heartbeat = async () => {
      try {
        await API.put(`/files/${fileId}/lock/heartbeat`);
      } catch (e) {
        console.error('Heartbeat échoué:', e);
        // On ne tente pas de reprendre la main ici, le polling s'en chargera
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

  // Polling quasi-temps réel (Short Polling) pour synchroniser les verrous
  useEffect(() => {
    if (!fileId) return;

    const intervalId = setInterval(async () => {
      try {
        // On vérifie toujours le statut pour détecter les verrous tiers
        const res = await API.get(`/files/${fileId}/status`);
        const { is_locked, locked_by } = res.data;

        if (is_locked && locked_by !== lockStatus.lock?.user_email) {
          // Un autre utilisateur a pris le verrou
          setLockStatus(prev => ({
            ...prev,
            checked: true,
            locked: true,
            is_mine: false,
            can_edit: false,
            lock: { user_email: locked_by }
          }));
          setLockReadOnly(true);
        } else if (!is_locked && lockStatus.locked) {
          // Le verrou a été libéré
          setLockStatus(prev => ({
            ...prev,
            checked: true,
            locked: false,
            is_mine: false,
            can_edit: true,
            lock: null
          }));
          setLockReadOnly(false);
        }
      } catch (e) {
        console.error('Erreur sync verrou:', e);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [fileId, lockStatus.can_edit, lockStatus.locked, lockStatus.lock?.user_email]);

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
        // Utilisation de la route synchronisée POST /unlock
        API.post(`/files/${storedFileId}/unlock`).catch(() => {});
      }
    };
  }, []); // Pas de dépendances → s'exécute uniquement au unmount réel

  const handleSave = useCallback(async () => {
    if (saving || !fileId || !lockStatus.can_edit) return;
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
        // On force le mode lecture seule si on s'aperçoit d'un verrou concurrent
        setLockReadOnly(true);
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
  }, [fileId, content, saving, lockStatus.can_edit]);

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
                disabled={saving || loading || !fileId || !lockStatus.can_edit}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 20px', borderRadius: 9,
                  border: 'none',
                  background: 'var(--wings-blue)',
                  color: '#fff', fontSize: 13.5, fontWeight: 600,
                  cursor: saving || loading || !lockStatus.can_edit ? 'not-allowed' : 'pointer',
                  transition: 'background .15s',
                  opacity: saving || loading || !lockStatus.can_edit ? 0.75 : 1,
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

      {/* ── Bannière restrictive (verrouillé par un autre) ── */}
      {lockStatus.checked && lockStatus.locked && !lockStatus.is_mine && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          marginBottom: 12,
          borderRadius: 10,
          background: 'rgba(229,115,115,0.08)',
          border: '0.5px solid rgba(229,115,115,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={14} style={{ color: '#e57373' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#e57373' }}>
                Fichier verrouillé par {lockStatus.lock?.user_email || 'un autre utilisateur'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--wings-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                Vous êtes en mode lecture seule.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Badge : Verrou détenu par vous ── */}
      {lockStatus.checked && lockStatus.locked && lockStatus.is_mine && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          marginBottom: 12,
          borderRadius: 10,
          background: 'rgba(255,193,7,0.08)',
          border: '0.5px solid rgba(255,193,7,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={14} style={{ color: 'var(--wings-gold)' }} />
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-gold)' }}>
              Verrou détenu par vous
            </div>
          </div>
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
            onChange={readOnly ? undefined : e => {
              setContent(e.target.value);
              setDirty(true);
              // Déclenchement du Lazy Locking automatique lors de la première frappe
              if (!lockStatus.locked) {
                triggerAutoLock(fileId);
              }
            }}
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
