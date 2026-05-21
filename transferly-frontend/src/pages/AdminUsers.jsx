import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Edit2, Trash2, ToggleLeft, ToggleRight, HardDrive,
  X, ChevronLeft, ChevronRight, UserPlus, Copy, Check,
  CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

const ROLE_COLORS = {
  AdminGlobal:  'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
  AdminEspace:  'bg-amber-50  dark:bg-amber-900/20  text-amber-700  dark:text-amber-400',
  Utilisateur:  'bg-cyan-50   dark:bg-cyan-900/20   text-cyan-700   dark:text-cyan-400',
};

const ROLE_LABELS = {
  Utilisateur: 'Utilisateur',
  AdminEspace: "Administrateur d'espace",
  AdminGlobal: 'Admin Global',
};

function CreateUserModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ nom: '', email: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [copied,  setCopied]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/admin/users', {
        email: form.email.trim(),
        nom:   form.nom.trim(),
      });
      setResult(res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error;
      if (status === 409)      setError('Cet email est déjà utilisé.');
      else if (status === 400) setError(msg || 'Rôle invalide.');
      else if (status === 403) setError("Vous n'avez pas les droits nécessaires.");
      else                     setError(msg || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result) onCreated(result);
    onClose();
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(result.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard API indisponible */ }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400 transition';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">

        {!result ? (
          /* ── Étape 1 : formulaire ── */
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-violet-500" />
                Créer un utilisateur
              </h2>
              <button onClick={onClose} aria-label="Fermer">
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Prénom Nom"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Adresse email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="utilisateur@exemple.com"
                  className={inputCls}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition disabled:opacity-60"
                >
                  {loading ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ── Étape 2 : succès ── */
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Compte créé avec succès</h2>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Email</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{result.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Rôle</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{ROLE_LABELS[result.role] ?? result.role}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Mot de passe temporaire
              </p>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                <code className="flex-1 font-mono text-sm font-bold text-amber-800 dark:text-amber-300 tracking-widest break-all select-all">
                  {result.temporary_password}
                </code>
                <button
                  onClick={copyPassword}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-200 dark:hover:bg-amber-700/40 transition"
                >
                  {copied
                    ? <><Check className="w-3.5 h-3.5" />Copié</>
                    : <><Copy className="w-3.5 h-3.5" />Copier</>}
                </button>
              </div>
            </div>

            <div className={`flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg border ${
              result.email_sent
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {result.email_sent
                ? "Un email d'invitation a été envoyé à l'utilisateur."
                : "L'email d'invitation n'a pas pu être envoyé. Transmettez les identifiants manuellement."}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center px-2">
              Communiquez ce mot de passe à l'utilisateur. Il devra le changer à sa première connexion.
              Ce mot de passe ne sera plus affiché après fermeture.
            </p>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const currentUserId = parseInt(localStorage.getItem('user_id') || '0');

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editUser, setEditUser]       = useState(null);
  const [quotaUser, setQuotaUser]     = useState(null);
  const [toast, setToast]             = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [sessionUsers, setSessionUsers] = useState([]);

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

  const handleCreated = (data) => {
    setSessionUsers(prev => [{ id: data.id, nom: data.nom, email: data.email, role: data.role }, ...prev]);
    showToast(`Compte créé pour ${data.email}.`);
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
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition shadow-sm shadow-violet-200 dark:shadow-violet-900/30"
          >
            <UserPlus className="w-4 h-4" />
            Créer un utilisateur
          </button>
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
                      {user.id === currentUserId && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">VOUS</span>
                      )}
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
                        {user.id !== currentUserId && (
                          <button
                            onClick={() => handleToggle(user)}
                            title={user.statut === 'actif' ? 'Désactiver' : 'Activer'}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
                          >
                            {user.statut === 'actif'
                              ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                              : <ToggleLeft  className="w-4 h-4 text-slate-400" />}
                          </button>
                        )}
                        <button
                          onClick={() => setQuotaUser(user)}
                          title="Modifier le quota"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
                        >
                          <HardDrive className="w-4 h-4" />
                        </button>
                        {user.id !== currentUserId && (
                          <button
                            onClick={() => handleDelete(user)}
                            title="Supprimer"
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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

        {/* Liste de session */}
        {sessionUsers.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Comptes créés dans cette session</h2>
              <span className="text-xs px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full font-medium ml-1">
                {sessionUsers.length}
              </span>
              <p className="ml-auto text-xs text-slate-400 dark:text-slate-500 italic">Réinitialisé au rechargement de la page</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {['Nom', 'Email', 'Rôle', 'Statut'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sessionUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{u.nom}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Mot de passe à changer
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editUser   && <EditModal  user={editUser}  onClose={() => setEditUser(null)}  onSave={handleEditSave}  />}
      {quotaUser  && <QuotaModal user={quotaUser} onClose={() => setQuotaUser(null)} onSave={handleQuotaSave} />}
      {toast      && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AppLayout>
  );
}
