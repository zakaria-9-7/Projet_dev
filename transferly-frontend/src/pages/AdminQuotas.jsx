import { useState, useEffect, useCallback } from 'react';
import { HardDrive, RefreshCw, X, CheckCircle2, FolderOpen } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <X className="w-4 h-4 shrink-0" />}
      {message}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function QuotaBar({ used, total }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const color =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-400' :
                'bg-emerald-500';
  const trackColor =
    pct >= 90 ? 'bg-red-100 dark:bg-red-900/20' :
    pct >= 70 ? 'bg-amber-100 dark:bg-amber-900/20' :
                'bg-emerald-100 dark:bg-emerald-900/20';
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className={`flex-1 h-2 rounded-full overflow-hidden ${trackColor}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums shrink-0 ${
        pct >= 90 ? 'text-red-600 dark:text-red-400' :
        pct >= 70 ? 'text-amber-600 dark:text-amber-400' :
                    'text-emerald-600 dark:text-emerald-400'
      }`}>
        {pct.toFixed(0)} %
      </span>
    </div>
  );
}

function QuotaLegend({ count, label }) {
  return (
    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-6 text-xs text-slate-400 dark:text-slate-500">
      <span>{count} {label}{count !== 1 ? 's' : ''}</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> &lt; 70 %</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 70 – 90 %</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &gt; 90 %</span>
    </div>
  );
}

export default function AdminQuotas() {
  const [tab,     setTab]     = useState('users');  // 'users' | 'espaces'
  const [users,   setUsers]   = useState([]);
  const [espaces, setEspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [inputs,  setInputs]  = useState({});   // id → quota string
  const [saving,  setSaving]  = useState({});
  const [toast,   setToast]   = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/admin/users?per_page=200');
      const list = res.data.users ?? [];
      setUsers(list);
      setInputs(prev => ({ ...prev, ...Object.fromEntries(list.map(u => [`u_${u.id}`, String(u.quota ?? 2)])) }));
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEspaces = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/admin/espaces/quotas');
      const list = res.data ?? [];
      setEspaces(list);
      setInputs(prev => ({ ...prev, ...Object.fromEntries(list.map(e => [`e_${e.id}`, String(e.quota ?? 0)])) }));
    } catch {
      setError('Impossible de charger les espaces.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    else fetchEspaces();
  }, [tab, fetchUsers, fetchEspaces]);

  const handleUpdateUser = async (user) => {
    const newQuota = parseFloat(inputs[`u_${user.id}`]);
    if (isNaN(newQuota) || newQuota <= 0) { showToast('Quota invalide (doit être > 0).', 'error'); return; }
    setSaving(s => ({ ...s, [`u_${user.id}`]: true }));
    try {
      await API.put(`/admin/users/${user.id}/quota`, { quota: newQuota });
      showToast(`Quota de ${user.nom || user.email} mis à jour (${newQuota} Go).`);
      await fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Échec de la mise à jour.', 'error');
    } finally {
      setSaving(s => ({ ...s, [`u_${user.id}`]: false }));
    }
  };

  const handleUpdateEspace = async (espace) => {
    const newQuota = parseFloat(inputs[`e_${espace.id}`]);
    if (isNaN(newQuota) || newQuota < 0) { showToast('Quota invalide (≥ 0, 0 = illimité).', 'error'); return; }
    setSaving(s => ({ ...s, [`e_${espace.id}`]: true }));
    try {
      await API.put(`/admin/espaces/${espace.id}/quota`, { quota: newQuota });
      showToast(`Quota de l'espace "${espace.nom}" mis à jour (${newQuota === 0 ? 'illimité' : newQuota + ' Go'}).`);
      await fetchEspaces();
    } catch (err) {
      showToast(err.response?.data?.error || 'Échec de la mise à jour.', 'error');
    } finally {
      setSaving(s => ({ ...s, [`e_${espace.id}`]: false }));
    }
  };

  const fmt = (val) => `${(val ?? 0).toFixed(2)} Go`;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestion des quotas</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Consultez et ajustez l'espace de stockage alloué
              </p>
            </div>
          </div>
          <button
            onClick={() => tab === 'users' ? fetchUsers() : fetchEspaces()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          {[
            { id: 'users',   label: 'Utilisateurs', Icon: HardDrive },
            { id: 'espaces', label: 'Espaces',       Icon: FolderOpen },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Users table ── */}
        {tab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {['Utilisateur', 'Quota utilisé', 'Quota total', 'Utilisation', 'Nouveau quota (Go)', 'Action'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Chargement…</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Aucun utilisateur</td></tr>
                  ) : users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{user.nom || '—'}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{user.email}</p>
                      </td>
                      <td className="px-5 py-4 tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt(user.quota_utilise)}</td>
                      <td className="px-5 py-4 tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt(user.quota)}</td>
                      <td className="px-5 py-4"><QuotaBar used={user.quota_utilise} total={user.quota} /></td>
                      <td className="px-5 py-4">
                        <input type="number" min="0.1" step="0.5"
                          value={inputs[`u_${user.id}`] ?? user.quota}
                          onChange={e => setInputs(prev => ({ ...prev, [`u_${user.id}`]: e.target.value }))}
                          className="w-28 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => handleUpdateUser(user)} disabled={saving[`u_${user.id}`]}
                          className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-semibold transition whitespace-nowrap">
                          {saving[`u_${user.id}`] ? 'Mise à jour…' : 'Mettre à jour'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && users.length > 0 && <QuotaLegend count={users.length} label="utilisateur" />}
          </div>
        )}

        {/* ── Espaces table ── */}
        {tab === 'espaces' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {['Espace', 'Administrateur', 'Stockage utilisé', 'Quota', 'Utilisation', 'Nouveau quota (Go, 0=∞)', 'Action'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {loading ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Chargement…</td></tr>
                  ) : espaces.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Aucun espace</td></tr>
                  ) : espaces.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-cyan-500 shrink-0" />{e.nom}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{e.nb_fichiers} fichier{e.nb_fichiers !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        <p className="text-sm">{e.admin_nom}</p>
                        <p className="text-xs text-slate-400">{e.admin_email}</p>
                      </td>
                      <td className="px-5 py-4 tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt(e.quota_utilise)}</td>
                      <td className="px-5 py-4 tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {e.quota > 0 ? fmt(e.quota) : <span className="text-slate-400 italic">Illimité</span>}
                      </td>
                      <td className="px-5 py-4">
                        {e.quota > 0
                          ? <QuotaBar used={e.quota_utilise} total={e.quota} />
                          : <span className="text-xs text-slate-400">—</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <input type="number" min="0" step="0.5"
                          value={inputs[`e_${e.id}`] ?? e.quota}
                          onChange={ev => setInputs(prev => ({ ...prev, [`e_${e.id}`]: ev.target.value }))}
                          className="w-32 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => handleUpdateEspace(e)} disabled={saving[`e_${e.id}`]}
                          className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-semibold transition whitespace-nowrap">
                          {saving[`e_${e.id}`] ? 'Mise à jour…' : 'Mettre à jour'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && espaces.length > 0 && <QuotaLegend count={espaces.length} label="espace" />}
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </AppLayout>
  );
}


