import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FileText, HardDrive, Share2, Activity, Download, Settings, Share,
  Users, AlertTriangle, ShieldCheck, FolderOpen, ArrowRight,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';

/* ── Shared time helper ─────────────────────────── */
function formatTime(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return `il y a ${diff}s`;
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

/* ── Shared stat card ───────────────────────────── */
function StatCard({ icon: Icon, bg, iconCls, label, value, suffix = '', delay, quota, quotaLabel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md border border-slate-100 dark:border-slate-700 cursor-default"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
        <Icon className={`w-5 h-5 ${iconCls}`} />
      </div>
      <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-0.5">
        {value}{suffix}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      {quota !== undefined && (
        <>
          <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-1.5 bg-cyan-500 rounded-full transition-all" style={{ width: `${quota}%` }} />
          </div>
          <div className="text-xs text-slate-400 mt-1">{quotaLabel || ''}</div>
        </>
      )}
    </motion.div>
  );
}

/* ── Shared shortcut card ───────────────────────── */
function ShortcutCard({ to, icon: Icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Link
        to={to}
        className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-md transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-cyan-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors shrink-0" />
      </Link>
    </motion.div>
  );
}

/* ── Shared activity table ──────────────────────── */
function ActivityTable({ title, rows, columns }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        {title}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/40">
              {columns.map(c => (
                <th key={c} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                {row.cells.map((cell, j) => (
                  <td key={j} className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   VIEW: AdminGlobal
   ════════════════════════════════════════════════ */
function AdminGlobalDashboard() {
  const [stats, setStats] = useState({ users: 0, files: 0, storage: 0, fails: 0 });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const loadData = () => {
      Promise.all([
        API.get('/admin/users'),
        API.get('/admin/files'),
        API.get('/logs/?limit=10'),
      ]).then(([u, f, l]) => {
        const totalMb = f.data.reduce((s, x) => s + (x.taille || 0), 0);
        setStats({
          users: u.data.total ?? u.data.users?.length ?? 0,
          files: f.data.length,
          storage: (totalMb / 1024).toFixed(2),
          fails: l.data.filter(x => x.statut === 'echec').length,
        });
        setLogs(l.data);
      }).catch(err => console.error('Admin dashboard load:', err));
    };

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { icon: Users,         bg: 'bg-blue-50 dark:bg-blue-900/20',   iconCls: 'text-blue-500',   label: 'Total utilisateurs',    value: stats.users },
    { icon: FileText,      bg: 'bg-green-50 dark:bg-green-900/20', iconCls: 'text-green-500',  label: 'Total fichiers',        value: stats.files },
    { icon: HardDrive,     bg: 'bg-amber-50 dark:bg-amber-900/20', iconCls: 'text-amber-500',  label: 'Espace disque utilisé', value: `${stats.storage} GB` },
    { icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-900/20',     iconCls: 'text-red-500',    label: 'Tentatives échouées',   value: stats.fails },
  ];

  const activityRows = logs.map(l => ({
    cells: [
      l.user_email || '—',
      l.action,
      formatTime(l.date),
      <StatusBadge key={l.id} ok={l.statut === 'succes'} />,
    ],
  }));

  const shortcuts = [
    { to: '/admin', icon: Users,       title: 'Gestion utilisateurs', desc: 'Créer, modifier, suspendre des comptes' },
    { to: '/acl',   icon: ShieldCheck, title: 'Permissions ACL',      desc: "Droits d'accès par fichier et espace"  },
    { to: '/logs',  icon: Activity,    title: "Journaux d'activité",  desc: 'Historique complet des actions'        },
  ];

  return (
    <>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
        Tableau de bord administrateur
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Vue globale de la plateforme</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.1} />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {shortcuts.map((s, i) => <ShortcutCard key={s.to} {...s} delay={0.4 + i * 0.1} />)}
      </div>

      <ActivityTable
        title="Activité récente"
        columns={['Utilisateur', 'Action', 'Horodatage', 'Statut']}
        rows={activityRows}
      />
    </>
  );
}

/* ════════════════════════════════════════════════
   VIEW: AdminEspace
   ════════════════════════════════════════════════ */
function AdminEspaceDashboard() {
  const [stats, setStats] = useState({ members: 0, files: 0, quotaPct: 0, acls: 0 });
  const [activityRows] = useState([]);

  useEffect(() => {
  Promise.all([
    API.get('/admin/espaces/mine').catch(() => ({ data: { spaces: [] } })),
    API.get('/quota/me').catch(() => ({ data: {} })),
  ]).then(([espacesRes, quotaRes]) => {
    const e = espacesRes.data.spaces?.[0];
    const quota = quotaRes.data;
    const quotaUsed = quota.quota_utilise_mb || 0;
    const quotaTotal = quota.quota_total_mb || 1;
    const quotaPct = Math.round((quotaUsed / quotaTotal) * 100);
    if (e) {
      setStats({
        members:  e.nb_membres  || 0,
        files:    e.nb_fichiers || 0,
        quotaPct: quotaPct,
        acls:     e.nb_acls    || 0,
      });
    }
  });
}, []);

  const statCards = [
    { icon: Users,       bg: 'bg-blue-50 dark:bg-blue-900/20',    iconCls: 'text-blue-500',   label: "Membres de l'espace",  value: stats.members },
    { icon: FileText,    bg: 'bg-green-50 dark:bg-green-900/20',  iconCls: 'text-green-500',  label: "Fichiers de l'espace", value: stats.files },
    { icon: HardDrive,   bg: 'bg-amber-50 dark:bg-amber-900/20',  iconCls: 'text-amber-500',  label: 'Quota utilisé',        value: stats.quotaPct, suffix: '%', quota: stats.quotaPct },
    { icon: ShieldCheck, bg: 'bg-violet-50 dark:bg-violet-900/20',iconCls: 'text-violet-500', label: 'Permissions actives',  value: stats.acls },
  ];

  const shortcuts = [
    { to: '/admin-espace', icon: FolderOpen,  title: 'Gérer mon espace', desc: "Arborescence et droits de l'espace" },
    { to: '/acl',          icon: ShieldCheck, title: 'Permissions ACL',  desc: 'Configurer les droits par utilisateur' },
  ];

  return (
    <>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
        Tableau de bord — Mon espace
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Gestion de votre espace académique</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.1} />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {shortcuts.map((s, i) => <ShortcutCard key={s.to} {...s} delay={0.4 + i * 0.1} />)}
      </div>

      <ActivityTable
        title="Activité de l'espace"
        columns={['Utilisateur', 'Action', 'Horodatage', 'Statut']}
        rows={activityRows}
      />
    </>
  );
}

/* ════════════════════════════════════════════════
   VIEW: Utilisateur
   ════════════════════════════════════════════════ */
function UtilisateurDashboard() {
  const [stats, setStats] = useState({ files: 0, quotaPct: 0, quotaUsed: 0, quotaTotal: 0, shared: 0, activity: 0 });
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get('/files/'),
      API.get('/files/shared-with-me'),
      API.get('/quota/me'),
      API.get('/logs/me?limit=20').catch(() => ({ data: [] })),
    ]).then(([filesRes, sharedRes, quotaRes, logsRes]) => {
      const filesData = Array.isArray(filesRes.data) ? filesRes.data : (filesRes.data?.files || []);
      const quota = quotaRes.data;
      const currentUserId = parseInt(localStorage.getItem('user_id') || '0');

      setFiles((Array.isArray(filesData) ? filesData : []).slice(0, 5).map(f => ({
        ...f,
        taille_fmt: f.taille != null
  ? (Number(f.taille) < 0.01 ? `${(Number(f.taille) * 1024).toFixed(0)} KB` : `${Number(f.taille).toFixed(1)} MB`)
  : '—',
        modifie:     formatRelativeTime(f.date_creation),
        partage_par: f.user_id === currentUserId ? 'Moi' : 'Autre',
      })));

      setStats({
        files:      filesData.length,
        quotaPct:   Math.round(quota.pourcentage_utilise ?? 0),
        quotaUsed:  quota.quota_utilise_gb ?? 0,
        quotaTotal: quota.quota_total_gb ?? 0,
        shared:     Array.isArray(sharedRes.data) ? sharedRes.data.length : (sharedRes.data?.files?.length ?? 0),
        activity:   logsRes.data.length,
      });
    }).catch(err => console.error('Dashboard load', err));
  }, []);

  const dashStats = [
    { icon: FileText,  bg: 'bg-blue-50 dark:bg-blue-900/20',   iconCls: 'text-blue-500',  label: 'Mes fichiers',      value: stats.files },
    { icon: HardDrive, bg: 'bg-amber-50 dark:bg-amber-900/20', iconCls: 'text-amber-500', label: 'Mon quota',         value: stats.quotaPct, suffix: '%', quota: stats.quotaPct, quotaLabel: `${stats.quotaUsed?.toFixed(2) ?? '0'} GB / ${stats.quotaTotal ?? '0'} GB` },
    { icon: Share2,    bg: 'bg-green-50 dark:bg-green-900/20', iconCls: 'text-green-500', label: 'Partagés avec moi', value: stats.shared },
    { icon: Activity,  bg: 'bg-pink-50 dark:bg-pink-900/20',   iconCls: 'text-pink-500',  label: 'Activité récente',  value: stats.activity },
  ];

  const handleDownload = async (f) => {
    try {
      const res = await API.get(`/files/${f.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = f.nom; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Échec du téléchargement');
    }
  };

  return (
    <>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
        Ça roule ?
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Voilà ce qui se passe sur votre espace</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {dashStats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.1} />)}
      </div>

      {/* Recent files table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          Fichiers récents
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40">
                {['Nom', 'Taille', 'Modifié', 'Partagé par', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {files.map((f, i) => (
                <tr key={f.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{f.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400">{f.taille_fmt}</td>
                  <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400">{f.modifie}</td>
                  <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400">{f.partage_par}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(f)}
                        className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-md transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/versions?fileId=${f.id}`)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                        title="Historique des versions"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate('/shared')}
                        className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-md transition-colors"
                        title="Partager"
                      >
                        <Share className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Status badge helper ────────────────────────── */
function StatusBadge({ ok }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      ok
        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    }`}>
      {ok ? 'Succès' : 'Échec'}
    </span>
  );
}

/* ════════════════════════════════════════════════
   ROOT — role dispatcher, no redirect
   ════════════════════════════════════════════════ */
export default function Dashboard() {
  const role = localStorage.getItem('role');

  return (
    <AppLayout>
      {role === 'AdminGlobal'  ? <AdminGlobalDashboard />  :
       role === 'AdminEspace'  ? <AdminEspaceDashboard />  :
                                 <UtilisateurDashboard />}
    </AppLayout>
  );
}
