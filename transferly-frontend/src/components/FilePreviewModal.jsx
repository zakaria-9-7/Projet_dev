import { useState, useEffect } from 'react';
import { X, Download, Loader } from 'lucide-react';
import API from '../api/auth';

const TEXT_EXTS = ['txt', 'md', 'html', 'css', 'js', 'csv', 'json', 'py', 'jsx'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const PDF_EXTS = ['pdf'];

function getExt(nom) {
  return (nom || '').split('.').pop().toLowerCase();
}

export default function FilePreviewModal({ file, onClose, onDownload }) {
  const [url, setUrl]       = useState(null);
  const [text, setText]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const ext = getExt(file.nom || file.name);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (TEXT_EXTS.includes(ext)) {
          const res = await API.get(`/files/${file.id}/preview`, { responseType: 'text' });
          setText(res.data);
        } else {
          const res = await API.get(`/files/${file.id}/preview`, { responseType: 'blob' });
          setUrl(URL.createObjectURL(res.data));
        }
      } catch (e) {
        setError(e.response?.data?.error || 'Impossible de prévisualiser ce fichier');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 truncate">{file.nom || file.name}</h2>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button onClick={onDownload}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Télécharger">
                <Download className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-800">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-64 text-red-400 text-sm">{error}</div>
          )}
          {!loading && !error && (
            <>
              {IMAGE_EXTS.includes(ext) && (
                <img src={url} alt={file.nom} className="max-w-full max-h-[70vh] mx-auto rounded-lg shadow" />
              )}
              {PDF_EXTS.includes(ext) && (
                <iframe src={url} className="w-full h-[70vh] rounded-lg border-0" title={file.nom} />
              )}
              {TEXT_EXTS.includes(ext) && (
                <pre className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-mono bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 overflow-auto max-h-[70vh]">
                  {text}
                </pre>
              )}
              {!IMAGE_EXTS.includes(ext) && !PDF_EXTS.includes(ext) && !TEXT_EXTS.includes(ext) && (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                  <p className="text-sm">Prévisualisation non disponible pour ce type de fichier</p>
                  <button onClick={onDownload}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600">
                    Télécharger pour ouvrir
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
