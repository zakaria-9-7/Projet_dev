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

function formatTime(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return `il y a ${diff}s`;
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

const ICON_PALETTE = [
  { bg: 'rgba(79,139,255,0.1)',   color: 'var(--wings-blue)' },
  { bg: 'rgba(255,193,7,0.1)',    color: 'var(--wings-gold)' },
  { bg: 'rgba(93,211,158,0.1)',   color: '#5dd39e' },
  { bg: 'rgba(229,115,115,0.1)', color: '#e57373' },
  { bg: 'rgba(142,108,184,0.15)', color: '#b07cce' },
];

function StatCard({ icon: Icon, paletteIdx = 0, label, value, suffix = '', delay, quota, quotaLabel }) {
  const pal = ICON_PALETTE[paletteIdx % ICON_PALETTE.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: 'var(--wings-surface)',
        border: '0.5px solid var(--wings-border)',
        borderRadius: 14, padding: 20, cursor: 'default',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: pal.bg, border: `0.5px solid ${pal.bg}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12, flexShrink: 0,
      }}>
        <Icon size={16} color={pal.color} />
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: 'var(--wings-text)', fontWeight: 400, marginBottom: 2 }}>
        {value}{suffix}
      </div>
      <div style={{ color: 'var(--wings-text-muted)', fontSize: 12 }}>{label}</div>
      {quota !== undefined && (
        <>
          <div style={{ marginTop: 10, height: 4, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${quota}%`,
              background: quota >= 90 ? '#e57373' : quota >= 70 ? 'var(--wings-gold)' : 'var(--wings-blue)',
              transition: 'width 0.4s',
            }} />
          </div>
          <div style={{ color: 'var(--wings-text-muted)', fontSize: 11, marginTop: 4 }}>{quotaLabel || ''}</div>
        </>
      )}
    </motion.div>
  );
}

function ShortcutCard({ to, icon: Icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Link
        to={to}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: 18,
          background: 'var(--wings-surface)',
          border: '0.5px solid var(--wings-border)',
          borderRadius: 12, textDecoration: 'none',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(79,139,255,0.4)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--wings-border)'}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(79,139,255,0.08)',
          border: '0.5px solid rgba(79,139,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={16} color="var(--wings-blue)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{title}</div>
          <div style={{ color: 'var(--wings-text-muted)', fontSize: 11 }}>{desc}</div>
        </div>
        <ArrowRight size={14} style={{ color: 'var(--wings-text-muted)', flexShrink: 0 }} />
      </Link>
    </motion.div>
  );
}

function ActivityList({ title, rows }) {
  const colHeaderStyle = {
    fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px',
    color: 'var(--wings-text-muted)', opacity: 0.6, textTransform: 'uppercase',
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 14 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px', marginBottom: 6 }}>
        {rows[0]?.cells.map((_, j) => {
          const labels = ['Utilisateur', 'Action', 'Horodatage', 'Statut'];
          const widths = ['1', '0 0 140px', '0 0 120px', '0 0 80px'];
          return <span key={j} style={{ ...colHeaderStyle, flex: widths[j] || '1', paddingRight: 8 }}>{labels[j] || ''}</span>;
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
            Aucune activité récente
          </div>
        ) : rows.map((row, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 10, padding: '10px 16px',
          }}>
            {row.cells.map((cell, j) => {
              const widths = ['1', '0 0 140px', '0 0 120px', '0 0 80px'];
              return (
                <div key={j} style={{
                  flex: widths[j] || '1',
                  color: j === 0 ? 'var(--wings-text)' : 'var(--wings-text-muted)',
                  fontSize: 12, fontWeight: j === 0 ? 500 : 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  paddingRight: 8,
                }}>
                  {cell}
                </div>
              );
            })}
          </div>
        ))}
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
    { icon: Users,         paletteIdx: 0, label: 'Total utilisateurs',    value: stats.users },
    { icon: FileText,      paletteIdx: 2, label: 'Total fichiers',        value: stats.files },
    { icon: HardDrive,     paletteIdx: 1, label: 'Espace disque utilisé', value: `${stats.storage} GB` },
    { icon: AlertTriangle, paletteIdx: 3, label: 'Tentatives échouées',   value: stats.fails },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
          Tableau de bord administrateur
        </h1>
        <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>Vue globale de la plateforme</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {statCards.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.1} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {shortcuts.map((s, i) => <ShortcutCard key={s.to} {...s} delay={0.4 + i * 0.1} />)}
      </div>

      <ActivityList title="Activité récente" rows={activityRows} />
    </div>
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
    { icon: Users,       paletteIdx: 0, label: "Membres de l'espace",  value: stats.members },
    { icon: FileText,    paletteIdx: 2, label: "Fichiers de l'espace", value: stats.files },
    { icon: HardDrive,   paletteIdx: 1, label: 'Quota utilisé',        value: stats.quotaPct, suffix: '%', quota: stats.quotaPct },
    { icon: ShieldCheck, paletteIdx: 4, label: 'Permissions actives',  value: stats.acls },
  ];

  const shortcuts = [
    { to: '/admin-espace', icon: FolderOpen,  title: 'Gérer mon espace', desc: "Arborescence et droits de l'espace" },
    { to: '/acl',          icon: ShieldCheck, title: 'Permissions ACL',  desc: 'Configurer les droits par utilisateur' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
          Tableau de bord — Mon espace
        </h1>
        <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>Gestion de votre espace académique</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {statCards.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.1} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {shortcuts.map((s, i) => <ShortcutCard key={s.to} {...s} delay={0.4 + i * 0.1} />)}
      </div>

      <ActivityList title="Activité de l'espace" rows={activityRows} />
    </div>
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
    { icon: FileText,  paletteIdx: 0, label: 'Mes fichiers',      value: stats.files },
    { icon: HardDrive, paletteIdx: 1, label: 'Mon quota',         value: stats.quotaPct, suffix: '%', quota: stats.quotaPct, quotaLabel: `${stats.quotaUsed?.toFixed(2) ?? '0'} GB / ${stats.quotaTotal ?? '0'} GB` },
    { icon: Share2,    paletteIdx: 2, label: 'Partagés avec moi', value: stats.shared },
    { icon: Activity,  paletteIdx: 4, label: 'Activité récente',  value: stats.activity },
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

  const colHeaderStyle = {
    fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px',
    color: 'var(--wings-text-muted)', opacity: 0.6, textTransform: 'uppercase',
  };

  const actionBtnBase = {
    background: 'none', border: 'none', padding: 4,
    color: 'var(--wings-text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', borderRadius: 6,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
          Ça roule ?
        </h1>
        <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>Voilà ce qui se passe sur votre espace</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {dashStats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.1} />)}
      </div>

      {/* Fichiers récents */}
      <div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 14 }}>
          Fichiers récents
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px', marginBottom: 6 }}>
          <span style={{ ...colHeaderStyle, flex: 1 }}>Nom</span>
          <span style={{ ...colHeaderStyle, flex: '0 0 80px' }}>Taille</span>
          <span style={{ ...colHeaderStyle, flex: '0 0 110px' }}>Modifié</span>
          <span style={{ ...colHeaderStyle, flex: '0 0 90px' }}>Partagé par</span>
          <span style={{ ...colHeaderStyle, flex: '0 0 90px', textAlign: 'right' }}>Actions</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {files.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
              Aucun fichier récent
            </div>
          ) : files.map((f, i) => (
            <div key={f.id ?? i} style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--wings-surface)',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 10, padding: '12px 16px',
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <FileText size={13} style={{ color: 'var(--wings-text-muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.nom}
                </span>
              </div>
              <div style={{ flex: '0 0 80px', color: 'var(--wings-text-muted)', fontSize: 12, fontFamily: 'monospace' }}>
                {f.taille_fmt}
              </div>
              <div style={{ flex: '0 0 110px', color: 'var(--wings-text-muted)', fontSize: 12 }}>
                {f.modifie}
              </div>
              <div style={{ flex: '0 0 90px', color: 'var(--wings-text-muted)', fontSize: 12 }}>
                {f.partage_par}
              </div>
              <div style={{ flex: '0 0 90px', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleDownload(f)}
                  title="Télécharger"
                  style={actionBtnBase}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-blue)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                >
                  <Download size={13} />
                </button>
                <button
                  onClick={() => navigate(`/versions?fileId=${f.id}`)}
                  title="Historique des versions"
                  style={actionBtnBase}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                >
                  <Settings size={13} />
                </button>
                <button
                  onClick={() => navigate('/shared')}
                  title="Partager"
                  style={actionBtnBase}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-blue)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                >
                  <Share size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Badge statut ────────────────────────────────────────────────── */
function StatusBadge({ ok }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 6, fontSize: 11,
      background: ok ? 'rgba(93,211,158,0.1)' : 'rgba(229,115,115,0.1)',
      color: ok ? '#5dd39e' : '#e57373',
      border: `0.5px solid ${ok ? 'rgba(93,211,158,0.25)' : 'rgba(229,115,115,0.25)'}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: ok ? '#5dd39e' : '#e57373' }} />
      {ok ? 'Succès' : 'Échec'}
    </span>
  );
}

/* ════════════════════════════════════════════════
   ROOT — dispatcheur par rôle
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
