import { useState, useEffect } from 'react';
import { Users, FolderOpen, HardDrive, Search, Edit2, Trash2, Pause, Play, Shield } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

export default function AdminPanel() {
  const [tab,       setTab]       = useState('users');
  const [users,     setUsers]     = useState([]);
  const [espaces,   setEspaces]   = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);
  const [editUser,  setEditUser]  = useState(null);
  const [editQuota, setEditQuota] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, e] = await Promise.all([
        API.get('/admin/users'),
        API.get('/admin/espaces'),
      ]);
      setUsers(u.data.users || []);
      setEspaces(e.data.spaces || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleDeleteUser = async (id) => {
    if (!confirm('Supprimer cet utilisateur ? Cette action est irréversible.')) return;
    try {
      await API.delete(`/admin/users/${id}`);
      showToast('Utilisateur supprimé');
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleSuspend = async (id) => {
    try {
      await API.post(`/admin/users/${id}/suspend`);
      showToast('Statut mis à jour');
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleSaveUser = async () => {
    try {
      await API.put(`/admin/users/${editUser.id}`, {
        email:  editUser.email,
        role:   editUser.role,
        statut: editUser.statut,
      });
      showToast('Utilisateur modifié');
      setEditUser(null);
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleSaveQuota = async () => {
    try {
      await API.put(`/admin/users/${editQuota.id}/quota`, {
        quota: parseFloat(editQuota.quota),
      });
      showToast('Quota mis à jour');
      setEditQuota(null);
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleDeleteEspace = async (id) => {
    if (!confirm('Supprimer cet espace ?')) return;
    try {
      await API.delete(`/admin/espaces/${id}`);
      showToast('Espace supprimé');
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const filteredUsers = users.filter(u =>
    !search || (u.email + (u.nom || '')).toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'users',   label: 'Utilisateurs', icon: Users },
    { id: 'espaces', label: 'Espaces',       icon: FolderOpen },
    { id: 'quotas',  label: 'Quotas',        icon: HardDrive },
  ];

  return (
    <AppLayout>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-500" />
          Administration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Gestion globale de la plateforme Transferly
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">Chargement...</div>
      ) : (
        <>
          {/* Search bar (users + quotas tabs) */}
          {(tab === 'users' || tab === 'quotas') && (
            <div className="mb-4 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un utilisateur..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab === 'users' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    {['Nom', 'Email', 'Rôle', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{u.nom || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'AdminGlobal'  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' :
                          u.role === 'AdminEspace'  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                      'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          u.statut === 'actif'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {u.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditUser({ ...u })}
                            className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSuspend(u.id)}
                            className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
                            title={u.statut === 'actif' ? 'Suspendre' : 'Activer'}
                          >
                            {u.statut === 'actif' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Supprimer"
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

          {/* ── ESPACES TAB ── */}
          {tab === 'espaces' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    {['ID', "Nom de l'espace", 'Admin', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {espaces.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                        Aucun espace
                      </td>
                    </tr>
                  ) : espaces.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">#{e.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {e.name || e.nom || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {e.adminEspace
                          ? `${e.adminEspace[0] || ''} (${e.adminEspace[1] || ''})`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteEspace(e.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Supprimer"
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

          {/* ── QUOTAS TAB ── */}
          {tab === 'quotas' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    {['Utilisateur', 'Email', 'Quota alloué', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                        Aucun utilisateur
                      </td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{u.nom || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100 font-medium">
                        {u.quota ?? 2} GB
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditQuota({ id: u.id, email: u.email, quota: u.quota ?? 2 })}
                          className="px-3 py-1 text-xs bg-cyan-500 hover:bg-cyan-600 text-white rounded-md transition-colors font-medium"
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MODALE ÉDITION UTILISATEUR ── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-5 text-slate-900 dark:text-slate-100">Modifier l'utilisateur</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={e => setEditUser({ ...editUser, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Rôle</label>
                <select
                  value={editUser.role}
                  onChange={e => setEditUser({ ...editUser, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="Utilisateur">Utilisateur</option>
                  <option value="AdminEspace">AdminEspace</option>
                  <option value="AdminGlobal">AdminGlobal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Statut</label>
                <select
                  value={editUser.statut}
                  onChange={e => setEditUser({ ...editUser, statut: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="actif">Actif</option>
                  <option value="bloque">Bloqué</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditUser(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE ÉDITION QUOTA ── */}
      {editQuota && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-slate-100">Modifier le quota</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{editQuota.email}</p>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Quota en GB
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={editQuota.quota}
              onChange={e => setEditQuota({ ...editQuota, quota: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditQuota(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveQuota}
                className="px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
