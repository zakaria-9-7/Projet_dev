import { useState, useEffect } from 'react';
import { FolderOpen, Users, FileText, Trash2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

export default function AdminEspacesAll() {
  const [espaces, setEspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/espaces');
      setEspaces(res.data);
    } catch (e) {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, nom) => {
    if (!confirm(`Supprimer l'espace "${nom}" et tout son contenu ? Action de modération irréversible.`)) return;
    try {
      await API.delete(`/admin/espaces/${id}`);
      showToast('Espace supprimé');
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
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Gestion des espaces</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Superviser et modérer tous les espaces de la plateforme</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement...</div>
      ) : espaces.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Aucun espace sur la plateforme</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/40">
              <tr>
                {['Espace', 'Administrateur', 'Membres', 'Fichiers', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {espaces.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <span className="inline-flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-cyan-500" /> {e.nom}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {e.admin_nom}
                    <span className="block text-xs text-slate-400">{e.admin_email}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {e.nb_membres}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> {e.nb_fichiers}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(e.id, e.nom)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                      title="Supprimer cet espace (modération)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
