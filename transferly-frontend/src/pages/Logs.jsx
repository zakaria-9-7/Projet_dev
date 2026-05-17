import { useState, useEffect } from 'react';
import { Activity, Search, Filter, Download } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatAction } from '../utils/formatAction';
import { formatRelativeTime } from '../utils/formatTime';

function normalizeLog(l) {
  return {
    id:          l.id,
    utilisateur: l.user_email ?? '—',
    action:      formatAction(l.action ?? ''),
    fichier:     l.fichier_nom || l.details || '—',
    horodatage:  l.date ? formatRelativeTime(l.date) : '—',
    statut:      l.statut === 'succes',
  };
}

const ACTION_COLORS = {
  'Téléversement':  'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400',
  'Partage':        'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
  'Connexion':      'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
  'Téléchargement': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  'Suppression':    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

export default function Logs() {
  const [logs, setLogs]       = useState([]);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('Tous');

  useEffect(() => {
    API.get('/logs/?limit=200')
      .then(r => setLogs((r.data ?? []).map(normalizeLog)))
      .catch(() => setError('Impossible de charger les journaux.'));
  }, []);

  const actions = ['Tous', ...new Set(logs.map(l => l.action))];

  const exportCSV = () => {
    const header = ['Utilisateur', 'Action', 'Fichier/Ressource', 'Horodatage', 'Statut'];
    const rows = visible.map(l => [
      l.utilisateur, l.action, l.fichier, l.horodatage, l.statut ? 'Succès' : 'Échec',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'logs_transferly.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const visible = logs.filter(l => {
    const matchSearch = l.utilisateur.toLowerCase().includes(search.toLowerCase())
      || l.action.toLowerCase().includes(search.toLowerCase())
      || l.fichier.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Tous' || l.action === filter;
    return matchSearch && matchFilter;
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Journaux d'activité</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Toutes les actions sur la plateforme</p>
            </div>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur, action, fichier..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            {actions.map(a => (
              <button
                key={a}
                onClick={() => setFilter(a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === a
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {['Utilisateur', 'Action', 'Fichier', 'Horodatage', 'Statut'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                      Aucun journal ne correspond à votre recherche
                    </td>
                  </tr>
                ) : visible.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{log.utilisateur}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 font-mono text-xs">{log.fichier}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 tabular-nums">{log.horodatage}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        log.statut
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.statut ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {log.statut ? 'Succès' : 'Échec'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
            {visible.length} entrée{visible.length !== 1 ? 's' : ''} affichée{visible.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
