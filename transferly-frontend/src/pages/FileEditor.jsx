import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Save, ArrowLeft } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

export default function FileEditor() {
  const [params] = useSearchParams();
  const fileId  = params.get('fileId');
  const readOnly = params.get('mode') === 'read';
  const navigate = useNavigate();

  const [content, setContent]       = useState('');
  const [original, setOriginal]     = useState('');
  const [fileName, setFileName]     = useState('');
  const [fileTaille, setFileTaille] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);

  const dirty = !readOnly && content !== original;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

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
  }, [fileId]);

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
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={saving || loading || !fileId}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 20px', borderRadius: 9,
                  border: 'none',
                  background: saving ? '#67e8f9' : '#06b6d4',
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

      {/* ── Bandeau lecture seule ── */}
      {readOnly && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 9,
          background: '#fefce8', border: '1px solid #fde68a',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: '#92400e', fontWeight: 500,
        }}>
          <span style={{ fontSize: 15 }}>🔒</span>
          Mode lecture seule — vous n'avez pas la permission de modifier ce fichier.
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
              borderTopColor: '#06b6d4', borderRadius: '50%',
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
