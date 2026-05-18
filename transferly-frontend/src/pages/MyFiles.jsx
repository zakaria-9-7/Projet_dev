import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  Grid, List, UploadCloud,
  Folder, FileText, FileSpreadsheet, ImageIcon,
  FileIcon, MoreVertical, History, Download, Trash2, Share2, X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';
import UploadZone from '../components/UploadZone';

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
  const [moveFile,       setMoveFile]       = useState(null);
  const [allFolders,     setAllFolders]     = useState([]);
  const cardsRef = useRef([]);
  const navigate  = useNavigate();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFiles = () => {
    setLoading(true);
    setError(null);
    API.get('/files/')
      .then(res => setFiles((res.data.files || []).map(normalizeFile)))
      .catch(err => {
        setFiles([]);
        setError(err.response?.data?.error || 'Erreur lors du chargement des fichiers');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFiles(); }, []);

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
      .then(() => fetchFiles())
      .catch(err => alert(err.response?.data?.error || 'Erreur suppression'));
  };

  // TODO: activer quand /folders/ sera stable côté backend
  // const handleNewFolder = async () => {
  //   const nom = prompt('Nom du dossier ?');
  //   if (!nom?.trim()) return;
  //   API.post('/folders/', { nom: nom.trim(), espace_id: null })
  //     .then(() => fetchFiles())
  //     .catch(err => alert(err.response?.data?.error || 'Erreur création dossier'));
  // };

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
      {/* Header row */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Mes Fichiers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Racine</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleUpload}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Téléverser
          </button>

          {/* View toggle */}
          <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600'
                  : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 border-l border-slate-200 dark:border-slate-600 transition-colors ${
                viewMode === 'list'
                  ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600'
                  : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
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
          <button onClick={fetchFiles} className="text-xs text-cyan-600 hover:underline">Réessayer</button>
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
              className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-cyan-200 dark:hover:border-cyan-700 transition-all group relative ${
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
                      <button
                        onClick={() => { setOpenMenu(null); handleDownload(file); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Download className="w-3.5 h-3.5" /> Télécharger
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                      </button>
                      <button
                        onClick={() => { setOpenMenu(null); navigate(`/versions?fileId=${file.id}`); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <History className="w-3.5 h-3.5" /> Historique
                      </button>
                      <button
                        onClick={() => { setOpenMenu(null); setShareFile(file); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Partager
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{file.size}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      {file.ft}
                    </span>
                  </div>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{file.date}</p>
              </div>

              {file.type === 'file' && viewMode === 'grid' && (
                <button
                  onClick={() => navigate(`/versions?fileId=${file.id}`)}
                  className="absolute bottom-3 right-3 p-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-cyan-600 hover:border-cyan-200 dark:hover:border-cyan-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Historique des versions"
                >
                  <History className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
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
			<div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
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
				<div className="p-6">
					<UploadZone onSuccess={() => { fetchFiles(); setShowUpload(false); }} />
				</div>
			</div>
		</div>
	)}

    </AppLayout>
  );
}

function FileTypeIcon({ file, listMode }) {
  const base = `stroke-[1.5] ${listMode ? 'w-6 h-6' : 'w-10 h-10 mb-4'}`;
  if (file.type === 'folder')             return <Folder          className={`${base} text-cyan-400`}   />;
  if (file.ft === 'PDF' || file.ft === 'PPT') return <FileText    className={`${base} text-slate-400`}  />;
  if (file.ft === 'XLS')                  return <FileSpreadsheet className={`${base} text-slate-400`}  />;
  if (file.ft === 'IMG')                  return <ImageIcon       className={`${base} text-slate-400`}  />;
  return                                         <FileIcon        className={`${base} text-slate-400`}  />;
}

const SHARE_PERMS = [
  { key: 'lecture',     label: 'Lecture' },
  { key: 'download',    label: 'Téléchargement' },
  { key: 'ecriture',    label: 'Écriture' },
  { key: 'partage',     label: 'Partage' },
  { key: 'suppression', label: 'Suppression' },
];

function ShareModal({ fichier, onClose, onSuccess }) {
  const [search,      setSearch]      = useState('');
  const [results,     setResults]     = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [loadingU,    setLoadingU]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [perms,       setPerms]       = useState({
    lecture: true, download: true, ecriture: false, suppression: false, partage: false,
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
        partage:     perms.partage,
        suppression: perms.suppression,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 truncate pr-4">
            Partager &laquo;&nbsp;{fichier.name}&nbsp;&raquo;
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Recherche utilisateur */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
              Destinataire
            </label>
            <div className="relative">
              <input
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-400 transition"
                placeholder="Rechercher un utilisateur…"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); }}
                autoFocus
              />
              {search.length >= 2 && !selected && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 max-h-44 overflow-y-auto">
                  {loadingU && (
                    <div className="px-4 py-3 text-xs text-slate-400 text-center">Recherche…</div>
                  )}
                  {!loadingU && results.length === 0 && (
                    <div className="px-4 py-3 text-xs text-slate-400 text-center">Aucun résultat</div>
                  )}
                  {results.map(u => (
                    <button
                      key={u.id}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                      onClick={() => { setSelected(u); setSearch(u.nom); setResults([]); }}
                    >
                      <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.nom[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{u.nom}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <div className="flex items-center gap-3 mt-2 px-3 py-2.5 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {selected.nom[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selected.nom}</div>
                  <div className="text-xs text-slate-400">{selected.email}</div>
                </div>
                <button
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-lg leading-none"
                  onClick={() => { setSelected(null); setSearch(''); }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
              Permissions
            </label>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {SHARE_PERMS.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between py-2.5 cursor-pointer select-none">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={perms[key]}
                    onClick={() => setPerms(p => ({ ...p, [key]: !p[key] }))}
                    className={`relative w-10 h-6 rounded-full transition-colors ${perms[key] ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${perms[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!selected || submitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Envoi…' : 'Partager'}
          </button>
        </div>
      </div>
    </div>
  );
}
