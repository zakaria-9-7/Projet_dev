import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, FolderOpen, User, FilePen, History } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';
import { isEditable } from '../utils/fileType';

export default function AdminFichiersAll() {
  const [fichiers, setFichiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

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

  return (
    <AppLayout>
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-2 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>{toast.msg}</div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Tous les fichiers</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Superviser tous les fichiers de la plateforme. Le contenu des fichiers reste confidentiel.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement...</div>
      ) : fichiers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Aucun fichier sur la plateforme</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/40">
              <tr>
                {['Fichier', 'Propriétaire', 'Emplacement', 'Date', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {fichiers.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <span className="inline-flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" /> {f.nom}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {f.owner_nom}
                    <span className="block text-xs text-slate-400">{f.owner_email}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {f.espace_nom ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded-full">
                        <FolderOpen className="w-3 h-3" /> {f.espace_nom}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full">
                        <User className="w-3 h-3" /> Fichier personnel
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatRelativeTime(f.date_creation)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {isEditable(f.nom) && (
                        <button
                          onClick={() => navigate(`/editor?fileId=${f.id}`)}
                          className="p-1.5 text-slate-400 hover:text-cyan-500 rounded"
                          title="Éditer"
                        >
                          <FilePen className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/versions?fileId=${f.id}`)}
                        className="p-1.5 text-slate-400 hover:text-violet-500 rounded"
                        title="Historique des versions"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id, f.nom)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                        title="Supprimer ce fichier (modération)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
