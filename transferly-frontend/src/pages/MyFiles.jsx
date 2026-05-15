import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  Grid, List, FolderPlus, UploadCloud,
  Folder, FileText, FileSpreadsheet, ImageIcon,
  FileIcon, MoreVertical, History, Download, Trash2, Share2,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

function formatRelativeDate(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} heure${Math.floor(diff / 3600) > 1 ? 's' : ''}`;
  if (diff < 172800) return 'Hier';
  return `Il y a ${Math.floor(diff / 86400)} jours`;
}

function normalizeFile(f) {
  const ext = f.nom?.split('.').pop()?.toUpperCase() || 'FILE';
  const size = f.taille != null ? `${Number(f.taille).toFixed(1)} MB` : '—';
  return {
    id: f.id,
    type: 'file',
    name: f.nom,
    ft: ext,
    size,
    date: formatRelativeDate(f.date_creation),
  };
}

export default function MyFiles() {
  const [files,    setFiles]    = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [openMenu, setOpenMenu] = useState(null); // file.id or null
  const cardsRef = useRef([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

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

  const handleUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    API.post('/files/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(() => fetchFiles())
      .catch(err => alert(err.response?.data?.error || 'Échec upload'));
  };

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
      {/* Header row */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Mes Fichiers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Racine</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            disabled
            title="Fonctionnalité bientôt disponible"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed opacity-60"
          >
            <FolderPlus className="w-4 h-4" />
            Nouveau dossier
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => inputRef.current?.click()}
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
                        onClick={() => { setOpenMenu(null); navigate(`/acl?fichier=${file.id}`); }}
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
