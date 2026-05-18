import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  Grid, List, UploadCloud,
  Folder, FolderOpen, FolderPlus, FolderInput,
  FileText, FileSpreadsheet, ImageIcon,
  FileIcon, MoreVertical, History, Download, Trash2, Share2, X,
  ChevronRight, Pencil,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';
import { ShareModal } from './SharedWithMe';
import UploadZone from '../components/UploadZone';

function formatRelativeDate(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso + 'Z')) / 1000);
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} heure${Math.floor(diff / 3600) > 1 ? 's' : ''}`;
  if (diff < 172800) return 'Hier';
  return `Il y a ${Math.floor(diff / 86400)} jours`;
}

function formatSize(tailleMb) {
  if (tailleMb == null) return '—';
  const bytes = tailleMb * 1024 * 1024;
  if (bytes < 1024) return `${Math.round(bytes)} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${tailleMb.toFixed(2)} Mo`;
}

function normalizeFile(f) {
  const ext = f.nom?.split('.').pop()?.toUpperCase() || 'FILE';
  return {
    id: f.id,
    type: 'file',
    name: f.nom,
    ft: ext,
    size: formatSize(f.taille),
    date: formatRelativeTime(f.date_creation),
    folder_id: f.folder_id ?? null,
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
  const [moveFile,       setMoveFile]       = useState(null);
  const [allFolders,     setAllFolders]     = useState([]);
  const cardsRef = useRef([]);
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

  const loadFolders = async () => {
    const url = currentFolder ? `/folders?parent_id=${currentFolder.id}` : '/folders';
    try {
      const res = await API.get(url);
      setFolders(res.data);
    } catch {
      setFolders([]);
    }
  };

  useEffect(() => { fetchFiles(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFolders(); }, [currentFolder]);

  const enterFolder = (folder) => {
    setFolderPath(prev => [...prev, folder]);
    setCurrentFolder(folder);
  };

  const navigateTo = (index) => {
    if (index < 0) {
      setFolderPath([]);
      setCurrentFolder(null);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolder(newPath[newPath.length - 1]);
    }
  };

  const handleNewFolder = async () => {
    const nom = prompt('Nom du dossier :');
    if (!nom?.trim()) return;
    try {
      await API.post('/folders', { nom: nom.trim(), parent_id: currentFolder?.id || null });
      loadFolders();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur création dossier');
    }
  };

  const handleRenameFolder = async (folder) => {
    setOpenFolderMenu(null);
    const nom = prompt('Nouveau nom :', folder.nom);
    if (!nom?.trim() || nom.trim() === folder.nom) return;
    try {
      await API.put(`/folders/${folder.id}`, { nom: nom.trim() });
      loadFolders();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur renommage');
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!confirm(`Supprimer "${folder.nom}" ? Les fichiers qu'il contient reviendront à la racine.`)) return;
    setOpenFolderMenu(null);
    try {
      await API.delete(`/folders/${folder.id}`);
      loadFolders();
      fetchFiles();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur suppression dossier');
    }
  };

  const openMoveDialog = async (file) => {
    setOpenMenu(null);
    setMoveFile(file);
    try {
      const res = await API.get('/folders');
      setAllFolders(res.data);
    } catch {
      setAllFolders([]);
    }
  };

  const handleMoveFile = async (folderId) => {
    if (!moveFile) return;
    try {
      await API.put('/folders/move-file', { fichier_id: moveFile.id, folder_id: folderId });
      setMoveFile(null);
      fetchFiles();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur déplacement');
    }
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
      .then(() => fetchFiles())
      .catch(err => alert(err.response?.data?.error || 'Erreur suppression'));
  };

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  useEffect(() => {
    if (!openFolderMenu) return;
    const close = () => setOpenFolderMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openFolderMenu]);

  useEffect(() => {
    const cards = cardsRef.current.filter(Boolean);
    if (!loading && cards.length) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' },
      );
    }
  }, [loading, viewMode, currentFolder]);

  const visibleFiles = files.filter(f =>
    currentFolder ? f.folder_id === currentFolder.id : f.folder_id === null
  );

  const isEmpty = folders.length === 0 && visibleFiles.length === 0;

  return (
    <AppLayout>
      {/* Header row */}
      <div className="flex items-start justify-between mb-2 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Mes Fichiers</h1>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 mt-1 flex-wrap">
            <button
              onClick={() => navigateTo(-1)}
              className={`text-sm font-medium transition-colors ${
                folderPath.length === 0
                  ? 'text-slate-700 dark:text-slate-300 cursor-default'
                  : 'text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
            >
              Mes fichiers
            </button>
            {folderPath.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                <button
                  onClick={() => navigateTo(i)}
                  className={`text-sm font-medium transition-colors ${
                    i === folderPath.length - 1
                      ? 'text-slate-700 dark:text-slate-300 cursor-default'
                      : 'text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400'
                  }`}
                >
                  {f.nom}
                </button>
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* New folder */}
          <button
            onClick={handleNewFolder}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-cyan-300 hover:text-cyan-600 dark:hover:border-cyan-700 dark:hover:text-cyan-400 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            Nouveau dossier
          </button>

          {/* Upload */}
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
        <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 mt-6">
          Chargement...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-400 mt-6">
          <FileIcon className="w-12 h-12" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={fetchFiles} className="text-xs text-cyan-600 hover:underline">Réessayer</button>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400 dark:text-slate-500 mt-6">
          <FolderOpen className="w-12 h-12" />
          <p className="text-sm font-medium">
            {currentFolder ? `Le dossier "${currentFolder.nom}" est vide` : 'Aucun fichier pour le moment'}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Folders */}
          {folders.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Dossiers
              </h2>
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                  : 'flex flex-col gap-2'
              }>
                {folders.map(folder => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    viewMode={viewMode}
                    onOpen={() => enterFolder(folder)}
                    onRename={() => handleRenameFolder(folder)}
                    onDelete={() => handleDeleteFolder(folder)}
                    openMenu={openFolderMenu}
                    setOpenMenu={setOpenFolderMenu}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Files */}
          {visibleFiles.length > 0 && (
            <section>
              {folders.length > 0 && (
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Fichiers
                </h2>
              )}
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                  : 'flex flex-col gap-2'
              }>
                {visibleFiles.map((file, i) => (
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
                          className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 py-1"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setOpenMenu(null); handleDownload(file); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <Download className="w-3.5 h-3.5" /> Télécharger
                          </button>
                          <button
                            onClick={() => openMoveDialog(file)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <FolderInput className="w-3.5 h-3.5" /> Déplacer vers…
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
                          <button
                            onClick={() => handleDelete(file.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Supprimer
                          </button>
                        </div>
                      )}
                    </div>

                    <FileTypeIcon file={file} listMode={viewMode === 'list'} />

                    <div className={viewMode === 'list' ? 'flex-1 min-w-0' : 'mt-auto'}>
                      <h3
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate pr-6"
                        title={file.name}
                      >
                        {file.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{file.size}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                          {file.ft}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{file.date}</p>
                    </div>

                    {viewMode === 'grid' && (
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
            </section>
          )}
        </div>
      )}

      {/* Share modal */}
      {shareFile && (
        <ShareModal
          fichier={shareFile}
          onClose={() => setShareFile(null)}
          onSuccess={(msg) => { alert(msg); setShareFile(null); }}
        />
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Ajouter des fichiers</h2>
                <p className="text-xs text-slate-400 mt-0.5">Ajoutez des fichiers à votre espace personnel</p>
              </div>
              <button
                onClick={() => setShowUpload(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <UploadZone onSuccess={() => { fetchFiles(); setShowUpload(false); }} folderId={currentFolder?.id} />
            </div>
          </div>
        </div>
      )}

      {/* Move file modal */}
      {moveFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                Déplacer «&nbsp;{moveFile.name}&nbsp;»
              </h2>
              <button
                onClick={() => setMoveFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto">
              <button
                onClick={() => handleMoveFile(null)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                <Folder className="w-4 h-4 text-slate-400" />
                Racine (sans dossier)
              </button>
              {allFolders.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleMoveFile(f.id)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  <Folder className="w-4 h-4 text-cyan-400" />
                  {f.nom}
                </button>
              ))}
              {allFolders.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Aucun dossier disponible</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function FolderCard({ folder, viewMode, onOpen, onRename, onDelete, openMenu, setOpenMenu }) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-cyan-200 dark:hover:border-cyan-700 transition-all group relative cursor-pointer ${
        viewMode === 'list' ? 'flex items-center gap-4 p-4' : 'flex flex-col p-4 min-h-[120px]'
      }`}
      onClick={onOpen}
    >
      <div className="absolute top-3 right-3" onClick={e => e.stopPropagation()}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === folder.id ? null : folder.id); }}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {openMenu === folder.id && (
          <div
            className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 py-1"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onRename}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Pencil className="w-3.5 h-3.5" /> Renommer
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>
        )}
      </div>

      <Folder className={`stroke-[1.5] text-cyan-400 ${viewMode === 'list' ? 'w-6 h-6' : 'w-10 h-10 mb-3'}`} />
      <div className={viewMode === 'list' ? 'flex-1 min-w-0' : 'mt-auto'}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate pr-6" title={folder.nom}>
          {folder.nom}
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Dossier</p>
      </div>
    </div>
  );
}

function FileTypeIcon({ file, listMode }) {
  const base = `stroke-[1.5] ${listMode ? 'w-6 h-6' : 'w-10 h-10 mb-4'}`;
  if (file.type === 'folder')               return <Folder          className={`${base} text-cyan-400`}  />;
  if (file.ft === 'PDF' || file.ft === 'PPT') return <FileText      className={`${base} text-slate-400`} />;
  if (file.ft === 'XLS')                    return <FileSpreadsheet className={`${base} text-slate-400`} />;
  if (file.ft === 'IMG')                    return <ImageIcon       className={`${base} text-slate-400`} />;
  return                                           <FileIcon        className={`${base} text-slate-400`} />;
}
