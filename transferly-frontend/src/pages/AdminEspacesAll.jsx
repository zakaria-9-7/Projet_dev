import { useState, useEffect } from 'react';
import { FolderOpen, Users, FileText, Trash2, X, UserMinus, Crown, User } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

export default function AdminEspacesAll() {
  const [espaces,        setEspaces]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [toast,          setToast]          = useState(null);
  const [selectedEspace, setSelectedEspace] = useState(null);
  const [members,        setMembers]        = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

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

  const loadMembers = async (espace) => {
    setSelectedEspace(espace);
    setLoadingMembers(true);
    try {
      const res = await API.get(`/admin/espaces/${espace.id}/members`);
      setMembers(res.data);
    } catch (e) {
      showToast('Erreur chargement membres', 'error');
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDelete = async (id, nom) => {
    if (!confirm(`Supprimer l'espace "${nom}" et tout son contenu ? Action de modération irréversible.`)) return;
    try {
      await API.delete(`/admin/espaces/${id}`);
      showToast('Espace supprimé');
      if (selectedEspace?.id === id) setSelectedEspace(null);
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleRemoveMember = async (userId, userNom) => {
    if (!confirm(`Retirer "${userNom}" de l'espace "${selectedEspace.nom}" ?`)) return;
    try {
      await API.delete(`/admin/espaces/${selectedEspace.id}/members/${userId}`);
      showToast(`${userNom} retiré de l'espace`);
      loadMembers(selectedEspace);
      load(); // refresh member count
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

      <div className="flex gap-6">
        {/* ── Espaces list ── */}
        <div className={`${selectedEspace ? 'w-1/2' : 'w-full'} transition-all`}>
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
                    <tr
                      key={e.id}
                      onClick={() => loadMembers(e)}
                      className={`cursor-pointer transition-colors ${
                        selectedEspace?.id === e.id
                          ? 'bg-cyan-50 dark:bg-cyan-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                      }`}
                    >
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
                      <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
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
        </div>

        {/* ── Member detail panel ── */}
        {selectedEspace && (
          <div className="w-1/2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden self-start">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-cyan-500" />
                  {selectedEspace.nom}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Membres de l'espace</p>
              </div>
              <button
                onClick={() => setSelectedEspace(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Members list */}
            <div className="p-4">
              {loadingMembers ? (
                <div className="text-center py-8 text-slate-400 text-sm">Chargement...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Aucun membre</div>
              ) : (
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {(m.nom || m.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.nom}</p>
                          <p className="text-xs text-slate-400">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.is_admin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                            <Crown className="w-2.5 h-2.5" /> Admin
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full">
                              <User className="w-2.5 h-2.5" /> Membre
                            </span>
                            <button
                              onClick={() => handleRemoveMember(m.id, m.nom)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                              title="Retirer ce membre"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
