import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  Grid, List, UploadCloud, Eye,
  Folder, FileText, FileSpreadsheet, ImageIcon,
  FileIcon, MoreVertical, History, Download, Trash2, Share2, X, FilePen,
  Move, ChevronRight,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import FolderTree from '../components/FolderTree';
import MoveFileModal from '../components/MoveFileModal';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';
import { isEditable } from '../utils/fileType';
import UploadZone from '../components/UploadZone';
import FilePreviewModal from '../components/FilePreviewModal';


function normalizeFile(f) {
  const ext = f.nom?.split('.').pop()?.toUpperCase() || 'FILE';
  const taille = Number(f.taille) || 0;
  const size = f.taille != null
    ? taille < 0.01
      ? `${(taille * 1024).toFixed(0)} KB`
      : `${taille.toFixed(1)} MB`
    : '—';  
  return {
    id: f.id,
    type: 'file',
    name: f.nom,
    ft: ext,
    size,
    date: formatRelativeTime(f.date_creation),
    est_partage: f.est_partage || false,
    shared_by: f.shared_by || null,
    // permissions: present for shared files, null for own files (owner has all)
    perms: f.mes_permissions || null,
  };
}

export default function MyFiles() {
  const [files,          setFiles]          = useState([]);
  const [folders,        setFolders]        = useState([]);
  const [currentFolder,  setCurrentFolder]  = useState(null);
  const [folderPath,     setFolderPath]     = useState([]);
  const [viewMode,       setViewMode]       = useState('grid');
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [openMenu,       setOpenMenu]       = useState(null);
  const [openFolderMenu, setOpenFolderMenu] = useState(null);
  const [shareFile,      setShareFile]      = useState(null);
  const [showUpload,     setShowUpload]     = useState(false);
  const [toast,          setToast]          = useState(null);
  const [moveModal,      setMoveModal]      = useState({ open: false, file: null });
  const [allFolders,     setAllFolders]     = useState([]);
  const [previewFile,    setPreviewFile]    = useState(null);
  const cardsRef = useRef([]);
  const navigate  = useNavigate();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFiles = (folderId) => {
    setLoading(true);
    setError(null);
    // folder_id='' → racine (null en base), folder_id=X → dossier X
    const params = { folder_id: folderId === null ? '' : folderId };
    API.get('/files/', { params })
      .then(res => setFiles((res.data.files || res.data || []).map(normalizeFile)))
      .catch(err => {
        setFiles([]);
        setError(err.response?.data?.error || 'Erreur lors du chargement des fichiers');
      })
      .finally(() => setLoading(false));
  };

  // Rechargement fichiers à chaque changement de dossier courant
  useEffect(() => { fetchFiles(currentFolder); }, [currentFolder]);

  // Chargement des dossiers au mount
  useEffect(() => {
    API.get('/folders')
      .then(res => setFolders(Array.isArray(res.data) ? res.data : []))
      .catch(() => setFolders([]));
  }, []);

  const handleCreateFolder = async (parentId) => {
    const nom = prompt('Nom du dossier ?');
    if (!nom?.trim()) return;
    try {
      const res = await API.post('/folders', { nom: nom.trim(), parent_id: parentId });
      setFolders(prev => [...prev, res.data]);
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur création dossier');
    }
  };

  const buildBreadcrumb = () => {
    if (currentFolder === null) return [{ id: null, nom: 'Racine' }];
    const path = [];
    let fid = currentFolder;
    while (fid != null) {
      const f = folders.find(x => x.id === fid);
      if (!f) break;
      path.unshift(f);
      fid = f.parent_id;
    }
    return [{ id: null, nom: 'Racine' }, ...path];
  };

  const handleUpload = () => setShowUpload(true);

  const handleDownload = async (file) => {
    try {
      const res = await API.get(`/files/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Échec du téléchargement');
    }
  };

  const handleDelete = (id) => {
    if (!confirm('Supprimer ce fichier définitivement ?')) return;
    setOpenMenu(null);
    API.delete(`/files/${id}`)
      .then(() => fetchFiles(currentFolder))
      .catch(err => alert(err.response?.data?.error || 'Erreur suppression'));
  };


  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  useEffect(() => {
    const cards = cardsRef.current.filter(Boolean);
    if (!loading && cards.length) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' },
      );
    }
  }, [loading, viewMode]);

  return (
    <AppLayout>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 8,
          background: toast.type === 'error' ? '#F44336' : '#4CAF50',
          color: '#fff', fontWeight: 600, fontSize: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,.15)',
        }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      {/* Layout flex : arborescence + grille */}
      <div style={{ display: 'flex', margin: '-32px -40px', minHeight: 'calc(100% + 64px)' }}>
        <FolderTree
          folders={folders}
          selectedFolderId={currentFolder}
          onSelect={(id) => setCurrentFolder(id)}
          onCreateFolder={handleCreateFolder}
          onFolderCreated={(newFolder) => setFolders(prev => [...prev, newFolder])}
          onFolderUpdated={(id, nom) => setFolders(prev => prev.map(f => f.id === id ? { ...f, nom } : f))}
          onFolderDeleted={(id) => {
            setFolders(prev => prev.filter(f => f.id !== id));
            if (currentFolder === id) setCurrentFolder(null);
          }}
        />

        {/* Contenu principal */}
        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>

      {/* Breadcrumb + actions */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {buildBreadcrumb().map((segment, i, arr) => (
            <span key={segment.id ?? 'root'} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setCurrentFolder(segment.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px',
                  color: i === arr.length - 1 ? 'var(--wings-text)' : 'var(--wings-text-muted)',
                  fontWeight: i === arr.length - 1 ? 500 : 400,
                  padding: 0,
                }}
              >
                {segment.nom}
              </button>
              {i < arr.length - 1 && (
                <ChevronRight size={12} style={{ color: 'var(--wings-text-muted)', opacity: 0.5 }} />
              )}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleUpload}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px',
              background: 'var(--wings-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--wings-blue-dark)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--wings-blue)'}
          >
            <UploadCloud className="w-4 h-4" />
            Téléverser
          </button>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '0.5px solid var(--wings-border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: 8,
                background: viewMode === 'grid' ? 'var(--wings-surface)' : 'transparent',
                border: 'none',
                color: viewMode === 'grid' ? 'var(--wings-text)' : 'var(--wings-text-muted)',
                cursor: 'pointer',
              }}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: 8,
                background: viewMode === 'list' ? 'var(--wings-surface)' : 'transparent',
                border: 'none',
                borderLeft: '0.5px solid var(--wings-border)',
                color: viewMode === 'list' ? 'var(--wings-text)' : 'var(--wings-text-muted)',
                cursor: 'pointer',
              }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
          Chargement...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-400">
          <FileIcon className="w-12 h-12" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={fetchFiles} className="text-xs hover:underline" style={{ color: 'var(--wings-blue)' }}>Réessayer</button>
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400 dark:text-slate-500">
          <FileIcon className="w-12 h-12" />
          <p className="text-sm font-medium">Aucun fichier pour le moment</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
            : 'flex flex-col gap-2'
        }>
          {files.map((file, i) => (
            <div
              key={file.id ?? i}
              ref={el => (cardsRef.current[i] = el)}
              style={{ opacity: 0 }}
              className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all group relative ${
                viewMode === 'list'
                  ? 'flex items-center gap-4 p-4'
                  : 'flex flex-col p-4 min-h-[160px]'
              }`}
            >
              {file.type === 'file' && (
                <div className="absolute top-3 right-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === file.id ? null : file.id); }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenu === file.id && (
                    <div
                      className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 py-1"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Download — shown if owner or has download perm */}
                      {(!file.perms || file.perms.download) && (
                        <button
                          onClick={() => { setOpenMenu(null); handleDownload(file); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <Download className="w-3.5 h-3.5" /> Télécharger
                        </button>
                      )}
                      {/* Delete — shown if owner or has suppression perm */}
                      {(!file.perms || file.perms.suppression) && (
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Supprimer
                        </button>
                      )}
                      <button
                        onClick={() => { setOpenMenu(null); navigate(`/versions?fileId=${file.id}`); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <History className="w-3.5 h-3.5" /> Historique
                      </button>
                      {/* Edit — shown if owner or has ecriture perm */}
                      {isEditable(file.name) && (!file.perms || file.perms.ecriture) && (
                        <button
                          onClick={() => { setOpenMenu(null); navigate(`/editor?fileId=${file.id}`); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700" style={{ color: 'var(--wings-blue)' }}
                        >
                          <FilePen className="w-3.5 h-3.5" /> Éditer
                        </button>
                      )}
                      <button
                        onClick={() => { setOpenMenu(null); setPreviewFile(file); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" /> Aperçu
                      </button>
                      <button
                        onClick={() => { setOpenMenu(null); setShareFile(file); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Partager
                      </button>
                      <button
                        onClick={() => { setOpenMenu(null); setMoveModal({ open: true, file }); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Move className="w-3.5 h-3.5" /> Déplacer vers…
                      </button>
                    </div>
                  )}
                </div>
              )}

              <FileTypeIcon file={file} listMode={viewMode === 'list'} />

              <div className={viewMode === 'list' ? 'flex-1 min-w-0' : 'mt-auto'}>
                <h3
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate pr-6"
                  title={file.name}
                >
                  {file.name}
                </h3>
                {file.type === 'folder' ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{file.count} fichiers</p>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{file.size}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      {file.ft}
                    </span>
                    {file.shared_by && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded" title={`Partagé par ${file.shared_by}`}>
                        Partagé
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{file.date}</p>
              </div>

              {file.type === 'file' && viewMode === 'grid' && (
                <button
                  onClick={() => navigate(`/versions?fileId=${file.id}`)}
                  style={{
                    position: 'absolute', bottom: 12, right: 12,
                    padding: 6,
                    background: 'var(--wings-surface)',
                    border: '0.5px solid var(--wings-border)',
                    borderRadius: 6,
                    color: 'var(--wings-text-muted)',
                    opacity: 0,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s, color 0.15s',
                  }}
                  className="group-hover:opacity-100"
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-blue)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                  title="Historique des versions"
                >
                  <History className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={() => { handleDownload(previewFile); setPreviewFile(null); }}
        />
      )}
      {shareFile && (
        <ShareModal
          fichier={shareFile}
          onClose={() => setShareFile(null)}
          onSuccess={(msg, type) => {
            showToast(msg, type);
            if (!type || type === 'success') { setShareFile(null); fetchFiles(); }
          }}
        />
      )}

	{/* Upload modal */}
	{showUpload && (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
			<div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
					<div>
						<h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Téléverser des fichiers</h2>
						<p className="text-xs text-slate-400 mt-0.5">Glissez ou sélectionnez vos fichiers</p>
					</div>
					<button
						onClick={() => setShowUpload(false)}
						className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="p-6 overflow-y-auto flex-1">
					<UploadZone folderId={currentFolder} onSuccess={() => { fetchFiles(currentFolder); setShowUpload(false); }} />
				</div>
			</div>
		</div>
	)}

        </div>{/* fin contenu principal */}
      </div>{/* fin layout flex */}

      {moveModal.open && (
        <MoveFileModal
          isOpen={moveModal.open}
          file={moveModal.file}
          folders={folders}
          currentFolderId={currentFolder}
          onClose={() => setMoveModal({ open: false, file: null })}
          onMoved={(newFolderId) => {
            setFiles(prev => prev.filter(f => f.id !== moveModal.file.id));
            setMoveModal({ open: false, file: null });
          }}
        />
      )}
    </AppLayout>
  );
}

function FileTypeIcon({ file, listMode }) {
  const base = `stroke-[1.5] ${listMode ? 'w-6 h-6' : 'w-10 h-10 mb-4'}`;
  if (file.type === 'folder')             return <Folder          className={base} style={{ color: 'var(--wings-gold)' }} />;
  if (file.ft === 'PDF' || file.ft === 'PPT') return <FileText    className={`${base} text-slate-400`}  />;
  if (file.ft === 'XLS')                  return <FileSpreadsheet className={`${base} text-slate-400`}  />;
  if (file.ft === 'IMG')                  return <ImageIcon       className={`${base} text-slate-400`}  />;
  return                                         <FileIcon        className={`${base} text-slate-400`}  />;
}

const SHARE_PERMS = [
  { key: 'lecture',  label: 'Lecture' },
  { key: 'download', label: 'Téléchargement' },
  { key: 'ecriture', label: 'Écriture' },
];

function ShareModal({ fichier, onClose, onSuccess }) {
  const [search,      setSearch]      = useState('');
  const [results,     setResults]     = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [loadingU,    setLoadingU]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [perms,       setPerms]       = useState({
    lecture: true, download: true, ecriture: false,
  });

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoadingU(true);
      try {
        const res = await API.get(`/users/search?q=${encodeURIComponent(search)}`);
        setResults(res.data);
      } catch { setResults([]); }
      finally { setLoadingU(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const submit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await API.post('/acl/', {
        user_id:     selected.id,
        fichier_id:  fichier.id,
        lecture:     perms.lecture,
        ecriture:    perms.ecriture,
        download:    perms.download,
        partage:     false,
        suppression: false,
        upload:      false,
      });
      onSuccess?.('Fichier partagé avec succès');
    } catch (e) {
      if (e.response?.status === 409) {
        onSuccess?.('Ce fichier est déjà partagé avec cet utilisateur', 'error');
      } else {
        onSuccess?.(e.response?.data?.error || 'Erreur lors du partage', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 440,
          background: 'var(--wings-surface)',
          border: '0.5px solid var(--wings-border)',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '0.5px solid var(--wings-border)',
        }}>
          <h2 style={{
            fontFamily: 'Georgia, serif',
            fontSize: 20, fontWeight: 400,
            color: 'var(--wings-text)',
            margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            paddingRight: 16,
          }}>
            Partager &laquo;&nbsp;{fichier.name}&nbsp;&raquo;
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--wings-text-muted)', padding: 6,
              borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recherche utilisateur */}
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'monospace',
              fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--wings-gold)',
              marginBottom: 8,
            }}>
              Destinataire
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px',
                  background: 'var(--wings-bg)',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 8,
                  color: 'var(--wings-text)',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                placeholder="Rechercher un utilisateur…"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); }}
                onFocus={e => { e.target.style.borderColor = 'var(--wings-blue)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--wings-border)'; }}
                autoFocus
              />
              {search.length >= 2 && !selected && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  marginTop: 4,
                  background: 'var(--wings-surface)',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  zIndex: 10,
                  maxHeight: 176, overflowY: 'auto',
                }}>
                  {loadingU && (
                    <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--wings-text-muted)', textAlign: 'center' }}>Recherche…</div>
                  )}
                  {!loadingU && results.length === 0 && (
                    <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--wings-text-muted)', textAlign: 'center' }}>Aucun résultat</div>
                  )}
                  {results.map(u => (
                    <button
                      key={u.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '10px 14px',
                        background: 'transparent', border: 'none',
                        borderBottom: '0.5px solid var(--wings-border)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,139,255,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => { setSelected(u); setSearch(u.nom); setResults([]); }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--wings-blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {u.nom[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)' }}>{u.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--wings-text-muted)' }}>{u.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginTop: 8, padding: '10px 12px',
                background: 'rgba(79,139,255,0.06)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--wings-blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {selected.nom[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)' }}>{selected.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--wings-text-muted)' }}>{selected.email}</div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wings-text-muted)', padding: 4, display: 'flex', transition: 'color 0.15s' }}
                  onClick={() => { setSelected(null); setSearch(''); }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'monospace',
              fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--wings-gold)',
              marginBottom: 10,
            }}>
              Permissions
            </label>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {SHARE_PERMS.map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '0.5px solid var(--wings-border)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--wings-text)' }}>{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={perms[key]}
                    onClick={() => setPerms(p => ({ ...p, [key]: !p[key] }))}
                    style={{
                      position: 'relative',
                      width: 36, height: 20,
                      borderRadius: 999,
                      border: 'none', cursor: 'pointer',
                      background: perms[key] ? 'var(--wings-blue)' : 'rgba(168,180,212,0.2)',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 2,
                      left: perms[key] ? 18 : 2,
                      width: 16, height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      transition: 'left 0.2s',
                      display: 'block',
                    }} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '14px 24px',
          borderTop: '0.5px solid var(--wings-border)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', fontSize: 13,
              background: 'transparent',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 999,
              color: 'var(--wings-text-muted)',
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--wings-text-muted)';
              e.currentTarget.style.color = 'var(--wings-text)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--wings-border)';
              e.currentTarget.style.color = 'var(--wings-text-muted)';
            }}
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!selected || submitting}
            style={{
              padding: '8px 24px', fontSize: 13, fontWeight: 500,
              background: 'var(--wings-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              cursor: !selected || submitting ? 'not-allowed' : 'pointer',
              opacity: !selected || submitting ? 0.5 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (selected && !submitting) e.currentTarget.style.background = 'var(--wings-blue-dark)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--wings-blue)'; }}
          >
            {submitting ? 'Envoi…' : 'Partager'}
          </button>
        </div>
      </div>
    </div>
  );
}










































