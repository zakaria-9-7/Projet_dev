import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, FolderOpen, User, FilePen, History } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';
import { getFileTypeColor, isEditable } from '../utils/fileType';
import SearchBar from '../components/SearchBar';
import { useDebounced } from '../hooks/useDebounced';

export default function AdminFichiersAll() {
  const [fichiers, setFichiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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

        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Rechercher un fichier, un propriétaire…"
        />

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
            {/* En-tête colonnes */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
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
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 12, padding: '14px 20px',
                }}>
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
    </AppLayout>
  );
}
