import { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import API from '../api/auth';

const FORBIDDEN_EXT = ['exe', 'sh', 'bat', 'cmd', 'ps1', 'msi', 'vbs'];
const MAX_SIZE_MB = 200;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function FileItem({ file, status, progress, error, onRemove }) {
  const ext = file.name.split('.').pop().toLowerCase();
  const isUploading = status === 'uploading';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <div className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all
      ${isDone ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
        : isError ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold
          ${isDone ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : isError ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
              : ''}`}
        style={(!isDone && !isError) ? { background: 'rgba(79,139,255,0.1)', color: 'var(--wings-blue)' } : {}}
      >
        {ext.toUpperCase().slice(0, 3)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
        {isError ? (
          <p className="text-xs text-red-500 mt-0.5">{error}</p>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatBytes(file.size)}</p>
        )}

        {/* Progress bar */}
        {isUploading && (
          <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200" style={{ background: 'var(--wings-blue)' }}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0">
        {isDone && <CheckCircle className="w-5 h-5 text-emerald-500" />}
        {isError && <AlertCircle className="w-5 h-5 text-red-500" />}
        {isUploading && (
          <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--wings-blue)' }}>
            {progress}%
          </span>
        )}
        {status === 'pending' && (
          <button
            onClick={() => onRemove(file)}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
            title="Retirer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function UploadZone({ onSuccess, folderId }) {
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState([]); // [{file, status, progress, error}]
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((rawFiles) => {
    const newItems = Array.from(rawFiles).map(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const sizeMb = file.size / (1024 * 1024);
      let error = null;
      if (FORBIDDEN_EXT.includes(ext)) error = `Extension .${ext} non autorisée`;
      else if (sizeMb > MAX_SIZE_MB) error = `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)`;
      return { file, status: error ? 'error' : 'pending', progress: 0, error };
    });
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const removeItem = (file) => {
    setQueue(prev => prev.filter(q => q.file !== file));
  };

  const uploadAll = async () => {
    const pending = queue.filter(q => q.status === 'pending');
    if (!pending.length) return;
    setUploading(true);

    for (const item of pending) {
      setQueue(prev => prev.map(q =>
        q.file === item.file ? { ...q, status: 'uploading', progress: 0 } : q
      ));
      const fd = new FormData();
      fd.append('file', item.file);
      if (folderId) fd.append('folder_id', folderId);
      try {
        await API.post('/files/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const pct = Math.round((e.loaded / e.total) * 100);
            setQueue(prev => prev.map(q =>
              q.file === item.file ? { ...q, progress: pct } : q
            ));
          },
        });
        setQueue(prev => prev.map(q =>
          q.file === item.file ? { ...q, status: 'done', progress: 100 } : q
        ));
      } catch (err) {
        const msg = err.response?.data?.error || "Erreur lors de l'envoi";
        setQueue(prev => prev.map(q =>
          q.file === item.file ? { ...q, status: 'error', error: msg } : q
        ));
      }
    }

    setUploading(false);
    if (onSuccess) onSuccess();
    // Auto-clear done items after 2s
    setTimeout(() => {
      setQueue(prev => prev.filter(q => q.status !== 'done'));
    }, 2000);
  };

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const allDone = queue.length > 0 && queue.every(q => q.status === 'done' || q.status === 'error');

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className="relative flex flex-col items-center justify-center gap-3 p-8 cursor-pointer"
        style={{
          border: dragging ? '2px dashed var(--wings-blue)' : '0.5px dashed var(--wings-border)',
          background: dragging ? 'rgba(79,139,255,0.05)' : 'var(--wings-surface)',
          borderRadius: 12,
          transition: 'all 0.2s',
          transform: dragging ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
          style={{ background: dragging ? 'rgba(79,139,255,0.15)' : 'var(--wings-surface)' }}
        >
          <UploadCloud className="w-7 h-7 transition-colors" style={{ color: dragging ? 'var(--wings-blue)' : 'var(--wings-text-muted)' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {dragging ? 'Relâchez pour ajouter' : 'Glissez vos fichiers ici'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            ou <span className="font-medium" style={{ color: 'var(--wings-blue)' }}>parcourez</span> — max {MAX_SIZE_MB} Mo par fichier
          </p>
        </div>
        <p className="text-[11px] text-slate-300 dark:text-slate-600">
          Fichiers interdits : {FORBIDDEN_EXT.map(e => `.${e}`).join(' · ')}
        </p>
      </div>

      {/* File queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, i) => (
            <FileItem
              key={i}
              file={item.file}
              status={item.status}
              progress={item.progress}
              error={item.error}
              onRemove={removeItem}
            />
          ))}

          {/* Actions */}
          {!allDone && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setQueue([])}
                disabled={uploading}
                className="text-xs text-slate-400 hover:text-red-500 transition disabled:opacity-40"
              >
                Tout effacer
              </button>
              <button
                onClick={uploadAll}
                disabled={uploading || pendingCount === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 20px',
                  background: (uploading || pendingCount === 0) ? 'var(--wings-text-muted)' : 'var(--wings-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: (uploading || pendingCount === 0) ? 'not-allowed' : 'pointer',
                  opacity: (uploading || pendingCount === 0) ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => !(uploading || pendingCount === 0) && (e.currentTarget.style.background = 'var(--wings-blue-dark)')}
                onMouseLeave={e => !(uploading || pendingCount === 0) && (e.currentTarget.style.background = 'var(--wings-blue)')}
              >
                <UploadCloud className="w-4 h-4" />
                {uploading ? 'Ajout en cours…' : `Ajouter ${pendingCount} fichier${pendingCount > 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
