import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Edit2, Trash2, ToggleLeft, ToggleRight, HardDrive, X, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

const ROLE_COLORS = {
  AdminGlobal:  'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
  AdminEspace:  'bg-amber-50  dark:bg-amber-900/20  text-amber-700  dark:text-amber-400',
  Utilisateur:  'bg-cyan-50   dark:bg-cyan-900/20   text-cyan-700   dark:text-cyan-400',
};

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {message}
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

function EditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ email: user.email, role: user.role, statut: user.statut });
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.put(`/admin/users/${user.id}`, form);
      onSave();
    } catch {
      /* error handled by parent */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Modifier l'utilisateur</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Rôle</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="Utilisateur">Utilisateur</option>
              <option value="AdminEspace">AdminEspace</option>
              <option value="AdminGlobal">AdminGlobal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Statut</label>
            <select
              value={form.statut}
              onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium transition disabled:opacity-60">
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuotaModal({ user, onClose, onSave }) {
  const [quota, setQuota] = useState(user.quota ?? 2);
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.put(`/admin/users/${user.id}/quota`, { quota: parseFloat(quota) });
      onSave();
    } catch {
      /* error handled by parent */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Modifier le quota</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{user.nom} — {user.email}</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Quota (Go)</label>
            <input
              type="number"
              min="0.1"
              step="0.5"
              value={quota}
              onChange={e => setQuota(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium transition disabled:opacity-60">
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editUser, setEditUser]   = useState(null);
  const [quotaUser, setQuotaUser] = useState(null);
  const [toast, setToast]         = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchUsers = useCallback(async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get(`/admin/users?page=${p}&per_page=20`);
      setUsers(res.data.users ?? []);
      setTotalPages(res.data.pages ?? 1);
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchUsers(page); }, [page]);

  const handleDelete = async user => {
    if (!window.confirm(`Supprimer définitivement ${user.nom || user.email} ?`)) return;
    try {
      await API.delete(`/admin/users/${user.id}`);
      showToast('Utilisateur supprimé.');
      fetchUsers(page);
    } catch {
      showToast('Échec de la suppression.', 'error');
    }
  };

  const handleToggle = async user => {
    const next = user.statut === 'actif' ? 'inactif' : 'actif';
    try {
      await API.put(`/admin/users/${user.id}`, { statut: next });
      showToast(`Statut mis à jour : ${next}.`);
      fetchUsers(page);
    } catch {
      showToast('Échec de la mise à jour.', 'error');
    }
  };

  const handleEditSave = () => {
    setEditUser(null);
    showToast('Utilisateur modifié.');
    fetchUsers(page);
  };

  const handleQuotaSave = () => {
    setQuotaUser(null);
    showToast('Quota mis à jour.');
    fetchUsers(page);
  };

  const visible = users.filter(u =>
    (u.nom  ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestion des utilisateurs</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Modifier, suspendre ou supprimer des comptes</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un nom ou email…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {['Nom', 'Email', 'Rôle', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                      Chargement…
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : visible.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {user.nom || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{user.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.statut === 'actif'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.statut === 'actif' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {user.statut ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditUser(user)}
                          title="Modifier"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(user)}
                          title={user.statut === 'actif' ? 'Désactiver' : 'Activer'}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
                        >
                          {user.statut === 'actif'
                            ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                            : <ToggleLeft  className="w-4 h-4 text-slate-400" />}
                        </button>
                        <button
                          onClick={() => setQuotaUser(user)}
                          title="Modifier le quota"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
                        >
                          <HardDrive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          title="Supprimer"
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 transition"
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

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>{visible.length} utilisateur{visible.length !== 1 ? 's' : ''} affichés</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {editUser  && <EditModal  user={editUser}  onClose={() => setEditUser(null)}  onSave={handleEditSave}  />}
      {quotaUser && <QuotaModal user={quotaUser} onClose={() => setQuotaUser(null)} onSave={handleQuotaSave} />}
      {toast     && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AppLayout>
  );
}
