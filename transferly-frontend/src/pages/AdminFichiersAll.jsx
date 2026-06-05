import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, FolderOpen, User, FilePen, History, CheckSquare, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';
import { getFileTypeColor, isEditable } from '../utils/fileType';
import SearchBar from '../components/SearchBar';
import { useDebounced } from '../hooks/useDebounced';

export default function AdminFichiersAll() {
  const [fichiers,         setFichiers]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [toast,            setToast]            = useState(null);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [selectedIds,      setSelectedIds]      = useState(new Set());
  const [selectionMode,    setSelectionMode]    = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [batchDeleting,    setBatchDeleting]    = useState(false);
  const debouncedSearch = useDebounced(searchTerm, 300);
  const navigate = useNavigate();

  const filteredFiles = fichiers.filter(f => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      (f.nom         || '').toLowerCase().includes(q) ||
      (f.owner_nom   || '').toLowerCase().includes(q) ||
      (f.owner_email || '').toLowerCase().includes(q) ||
      (f.espace_nom  || '').toLowerCase().includes(q)
    );
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/fichiers');
      setFichiers(res.data);
    } catch (e) {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, nom) => {
    if (!confirm(`Supprimer le fichier "${nom}" ? Action de modération irréversible.`)) return;
    try {
      await API.delete(`/admin/fichiers/${id}`);
      showToast('Fichier supprimé');
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  const toggleSelect = (fileId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelectionMode = () => {
    if (selectionMode) clearSelection();
    setSelectionMode(s => !s);
  };

  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await API.delete('/admin/fichiers/batch', { data: { ids } });
      await load();
      clearSelection();
      setSelectionMode(false);
      setShowBatchConfirm(false);
      showToast(`${ids.length} fichier${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la suppression', 'error');
    } finally {
      setBatchDeleting(false);
    }
  };

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
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 50,
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          background: toast.type === 'error' ? '#dc2626' : '#059669',
          color: '#fff',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* En-tête */}
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
            Tous les fichiers
          </h1>
          <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
            Superviser tous les fichiers de la plateforme. Le contenu des fichiers reste confidentiel.
          </p>
        </div>

        {/* Barre outils : SearchBar + bouton Sélectionner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Rechercher un fichier, un propriétaire…"
            />
          </div>
          <button
            onClick={toggleSelectionMode}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: selectionMode ? 'rgba(220,38,38,0.08)' : 'transparent',
              border: `0.5px solid ${selectionMode ? 'rgba(220,38,38,0.4)' : 'var(--wings-border)'}`,
              borderRadius: 999,
              color: selectionMode ? '#dc2626' : 'var(--wings-text-muted)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {selectionMode ? <X size={14} /> : <CheckSquare size={14} />}
            {selectionMode ? 'Annuler' : 'Sélectionner'}
          </button>
        </div>

        {/* Barre d'actions batch (sticky) */}
        {selectionMode && selectedIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 12,
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500 }}>
              {selectedIds.size} fichier{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={clearSelection}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12,
                  background: 'none', border: '0.5px solid var(--wings-border)',
                  color: 'var(--wings-text-muted)', cursor: 'pointer',
                }}
              >
                Tout désélectionner
              </button>
              <button
                onClick={() => setShowBatchConfirm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  background: '#dc2626', border: 'none',
                  color: '#fff', cursor: 'pointer',
                }}
              >
                <Trash2 size={13} />
                Supprimer la sélection
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
            Chargement…
          </div>
        ) : fichiers.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <FileText size={40} style={{ color: 'var(--wings-text-muted)', opacity: 0.4 }} />
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>Aucun fichier sur la plateforme</p>
          </div>
        ) : (
          <div>
            {/* Tout sélectionner */}
            {selectionMode && filteredFiles.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: 20 }}>
                <input
                  type="checkbox"
                  checked={filteredFiles.length > 0 && selectedIds.size === filteredFiles.length}
                  onChange={toggleSelectAll}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--wings-blue)' }}
                />
                <span style={{ color: 'var(--wings-text-muted)', fontSize: 12 }}>Tout sélectionner</span>
              </div>
            )}

            {/* En-tête colonnes */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
              {selectionMode && <span style={{ flex: '0 0 28px' }} />}
              <span style={{ ...colHeaderStyle, flex: '0 0 240px' }}>Fichier</span>
              <span style={{ ...colHeaderStyle, flex: 1 }}>Propriétaire</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 160px' }}>Emplacement</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 120px' }}>Date</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 100px', textAlign: 'right' }}>Action</span>
            </div>

            {/* Lignes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredFiles.map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center',
                  background: 'var(--wings-surface)',
                  border: selectedIds.has(f.id)
                    ? '0.5px solid rgba(79,139,255,0.5)'
                    : '0.5px solid var(--wings-border)',
                  borderRadius: 12, padding: '14px 20px',
                  outline: selectedIds.has(f.id) ? '1.5px solid rgba(79,139,255,0.15)' : 'none',
                  outlineOffset: '-1px',
                  transition: 'border-color 0.1s',
                }}>

                  {/* CHECKBOX sélection */}
                  {selectionMode && (
                    <div style={{ flex: '0 0 28px' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(f.id)}
                        onChange={() => toggleSelect(f.id)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--wings-blue)' }}
                      />
                    </div>
                  )}

                  {/* NOM FICHIER */}
                  <div style={{ flex: '0 0 240px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {(() => {
                      const ext = f.nom?.split('.').pop()?.toUpperCase() || '—';
                      const { bg, color } = getFileTypeColor(f.nom);
                      return (
                        <span style={{
                          background: bg, color, borderRadius: 4,
                          fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
                          padding: '2px 5px', flexShrink: 0, letterSpacing: '0.5px',
                        }}>
                          {ext}
                        </span>
                      );
                    })()}
                    <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.nom}
                    </span>
                  </div>

                  {/* PROPRIÉTAIRE */}
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ color: 'var(--wings-text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.owner_nom}
                    </div>
                    <div style={{ color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.owner_email}
                    </div>
                  </div>

                  {/* EMPLACEMENT */}
                  <div style={{ flex: '0 0 160px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px', borderRadius: 6, fontSize: 11,
                      background: 'rgba(168,180,212,0.1)',
                      color: 'var(--wings-text-muted)',
                      maxWidth: 150, overflow: 'hidden',
                    }}>
                      {f.espace_nom
                        ? <FolderOpen size={11} style={{ flexShrink: 0 }} />
                        : <User size={11} style={{ flexShrink: 0 }} />}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.espace_nom || 'Fichier personnel'}
                      </span>
                    </span>
                  </div>

                  {/* DATE */}
                  <div style={{ flex: '0 0 120px', color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11 }}>
                    {formatRelativeTime(f.date_creation)}
                  </div>

                  {/* ACTIONS */}
                  <div style={{ flex: '0 0 100px', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    {isEditable(f.nom) && (
                      <button
                        onClick={() => navigate(`/editor?fileId=${f.id}`)}
                        title="Éditer"
                        style={{
                          background: 'none', border: 'none', padding: 4,
                          color: 'var(--wings-text-muted)', cursor: 'pointer', borderRadius: 6,
                          display: 'flex', alignItems: 'center',
                        }}
                        onMouseEnter={el => el.currentTarget.style.color = 'var(--wings-blue)'}
                        onMouseLeave={el => el.currentTarget.style.color = 'var(--wings-text-muted)'}
                      >
                        <FilePen size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/versions?fileId=${f.id}`)}
                      title="Historique des versions"
                      style={{
                        background: 'none', border: 'none', padding: 4,
                        color: 'var(--wings-text-muted)', cursor: 'pointer', borderRadius: 6,
                        display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={el => el.currentTarget.style.color = 'var(--wings-gold)'}
                      onMouseLeave={el => el.currentTarget.style.color = 'var(--wings-text-muted)'}
                    >
                      <History size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id, f.nom)}
                      title="Supprimer ce fichier (modération)"
                      style={{
                        background: 'none', border: 'none', padding: 4,
                        color: 'var(--wings-text-muted)', cursor: 'pointer', borderRadius: 6,
                        display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={el => el.currentTarget.style.color = '#e57373'}
                      onMouseLeave={el => el.currentTarget.style.color = 'var(--wings-text-muted)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal confirmation suppression batch */}
      {showBatchConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 440,
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '0.5px solid var(--wings-border)' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 400, color: 'var(--wings-text)', margin: 0 }}>
                Confirmer la suppression
              </h2>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <p style={{ fontSize: 13, color: 'var(--wings-text-muted)', margin: 0 }}>
                Vous allez supprimer définitivement{' '}
                <strong style={{ color: 'var(--wings-text)' }}>
                  {selectedIds.size} fichier{selectedIds.size > 1 ? 's' : ''}
                </strong>{' '}
                appartenant à d'autres utilisateurs. Cette action de modération est irréversible.
              </p>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '14px 24px',
              borderTop: '0.5px solid var(--wings-border)',
            }}>
              <button
                onClick={() => setShowBatchConfirm(false)}
                style={{
                  padding: '8px 20px', fontSize: 13,
                  background: 'transparent',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 999,
                  color: 'var(--wings-text-muted)',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                style={{
                  padding: '8px 24px', fontSize: 13, fontWeight: 500,
                  background: '#dc2626', border: 'none',
                  borderRadius: 999, color: '#fff',
                  cursor: batchDeleting ? 'not-allowed' : 'pointer',
                  opacity: batchDeleting ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {batchDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
