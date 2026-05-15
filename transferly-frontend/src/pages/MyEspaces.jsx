import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FolderOpen, Plus, Users, Mail } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

export default function MyEspaces() {
  const [espaces, setEspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedEspace, setSelectedEspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/espaces/mine');
      setEspaces(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedEspace) { setMembers([]); return; }
    API.get(`/espaces/${selectedEspace.id}/members`)
      .then(r => setMembers(r.data))
      .catch(() => setMembers([]));
  }, [selectedEspace]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await API.post('/espaces', { nom: newName.trim() });
      if (res.data.role_updated && res.data.role_updated !== localStorage.getItem('role')) {
        showToast('Espace créé ! Reconnexion nécessaire pour activer votre nouveau rôle (Admin Espace)...');
        setTimeout(() => {
          localStorage.clear();
          window.location.href = '/login';
        }, 2500);
        return;
      }
      showToast('Espace créé');
      setNewName('');
      setShowCreate(false);
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur création', 'error');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedEspace) return;
    try {
      await API.post(`/espaces/${selectedEspace.id}/invite`, { email: inviteEmail.trim() });
      showToast('Invitation envoyée');
      setInviteEmail('');
      setTimeout(() => {
        API.get(`/espaces/${selectedEspace.id}/members`).then(r => setMembers(r.data));
      }, 300);
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur invitation', 'error');
    }
  };

  return (
    <AppLayout>
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-2 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>{toast.msg}</div>
      )}

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Mes Espaces</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gérez vos espaces collaboratifs et leurs membres
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Créer un espace
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">{error}</div>
      ) : espaces.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">Aucun espace pour le moment</p>
          <p className="text-sm text-slate-400">Créez votre premier espace pour collaborer avec d'autres utilisateurs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Liste des espaces */}
          <div className="lg:col-span-1 space-y-2">
            {espaces.map(e => (
              <motion.div
                key={e.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedEspace(e)}
                className={`p-4 rounded-xl cursor-pointer border transition-colors ${
                  selectedEspace?.id === e.id
                    ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-cyan-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{e.nom}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Espace #{e.id}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Détails espace sélectionné */}
          <div className="lg:col-span-2">
            {!selectedEspace ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">Sélectionnez un espace pour voir ses détails</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedEspace.nom}</h2>
                </div>

                {/* Inviter un membre */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                    Inviter un membre par email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="email@exemple.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={handleInvite}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium"
                    >
                      <Mail className="w-4 h-4" />
                      Inviter
                    </button>
                  </div>
                </div>

                {/* Liste membres */}
                <div className="p-5">
                  <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Membres ({members.length})
                  </h3>
                  {members.length === 0 ? (
                    <p className="text-sm text-slate-400">Aucun membre pour le moment</p>
                  ) : (
                    <div className="space-y-2">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                              {(m.nom || m.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.nom}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{m.email}</p>
                            </div>
                          </div>
                          {m.is_admin && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">ADMIN</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale création */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Créer un nouvel espace</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Vous deviendrez Admin de cet espace et pourrez y inviter d'autres utilisateurs.
            </p>
            <input
              type="text"
              placeholder="Nom de l'espace"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm mb-4 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >Annuler</button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >Créer</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
