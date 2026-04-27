import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/auth';

export default function Dashboard() {
  const [stats, setStats] = useState({ fichiers: 124, quota: 45, partages: 32, activite: 18 });
  const [fichiers, setFichiers] = useState([
    { nom: 'TP_Reseaux_2026.pdf', taille: '2.4 MB', modifie: 'Il y a 2 heures', partage_par: 'Salma D.' },
    { nom: 'Cours_Python_S3.pptx', taille: '8.1 MB', modifie: 'Il y a 5 heures', partage_par: 'Nizar E.' },
    { nom: 'Projet_ICCN_Groupe4.xlsx', taille: '1.2 MB', modifie: 'Hier', partage_par: 'Imane E.' },
    { nom: 'Schema_Architecture.png', taille: '450 KB', modifie: 'Il y a 2 jours', partage_par: 'Moi' },
    { nom: 'Rapport_Bibliographique.pdf', taille: '3.8 MB', modifie: 'Il y a 3 jours', partage_par: 'Zakaria T.' },
  ]);
  const [hoveredStat, setHoveredStat] = useState(null);
  const [hoveredTable, setHoveredTable] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('darkMode', String(next));
  };

  const nom = localStorage.getItem('nom');
  const email = localStorage.getItem('email');
  const getInitials = () => {
    if (nom) {
      const parts = nom.trim().split(' ');
      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return 'U';
  };

  const dk = (light, darkVal) => dark ? darkVal : light;

  const statCardStyle = (i) => ({
    ...s.statCard,
    background: dk('white', '#1e293b'),
    border: dk('1px solid #e2e8f0', '1px solid #334155'),
    ...(hoveredStat === i ? s.statCardHover : {}),
    animation: 'fadeInUp 0.4s ease forwards',
    animationDelay: `${i * 100}ms`,
    opacity: 0,
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ ...s.layout, background: dk('#f8fafc', '#0f172a') }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ ...s.sidebar, background: dk('white', '#1e293b'), borderRight: dk('1px solid #e2e8f0', '1px solid #334155') }}>
        <div style={{ ...s.sidebarBrand, color: dk('#0d9488', '#5eead4') }}>
          <svg width='22' height='22' viewBox='0 0 24 24' fill='currentColor'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.59' y1='13.51' x2='15.42' y2='17.49' stroke='currentColor' strokeWidth='2'/><line x1='15.41' y1='6.51' x2='8.59' y2='10.49' stroke='currentColor' strokeWidth='2'/></svg>
        </div>
        <nav style={s.nav}>
          <a href="/dashboard" title="Tableau de bord" style={{ ...s.navItem, ...s.navActive, ...(dark ? { background: '#0f3460', color: '#5eead4', borderRight: '3px solid #0d9488' } : {}) }}>🏠</a>
          <a href="/files"    title="Mes Fichiers"    style={{ ...s.navItem, color: dk('#64748b', '#94a3b8') }}>📄</a>
          <a href="/shared"   title="Partagés avec moi" style={{ ...s.navItem, color: dk('#64748b', '#94a3b8') }}>⇄</a>
          <a href="/versions" title="Versions"        style={{ ...s.navItem, color: dk('#64748b', '#94a3b8') }}>🕐</a>
          {role === 'AdminGlobal' && (
            <a href="/admin"  title="Administration"  style={{ ...s.navItem, color: dk('#64748b', '#94a3b8') }}>👥</a>
          )}
        </nav>
        <div style={{ ...s.sidebarBottom, borderTop: dk('1px solid #e2e8f0', '1px solid #334155') }}>
          <a href="/settings" title="Paramètres" style={{ ...s.navItem, color: dk('#64748b', '#94a3b8') }}>⚙️</a>
          <button title="Déconnexion" style={s.logoutBtn} onClick={handleLogout}>↪</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={s.main}>
        {/* TOPBAR */}
        <div style={{ ...s.topbar, background: dk('white', '#1e293b'), borderBottom: dk('1px solid #e2e8f0', '1px solid #334155') }}>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>🔍</span>
            <input
              style={{ ...s.search, background: dk('#f8fafc', '#0f172a'), border: dk('1px solid #e2e8f0', '1px solid #334155'), color: dk('#0f172a', '#f8fafc') }}
              placeholder="Rechercher des fichiers..."
            />
          </div>
          <div style={s.topRight}>
            <button onClick={toggleDark} style={{ ...s.darkToggle, background: dk('white', '#334155'), color: dk('#374151', '#f8fafc'), border: dk('1px solid #e2e8f0', '1px solid #475569') }}>
              {dark ? '☀️' : '🌙'}
            </button>
            <span style={s.notifIcon}>🔔</span>
            <div style={s.avatar}>{getInitials()}</div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={s.content}>
          <h1 style={{ ...s.greeting, color: dk('#0f172a', '#f8fafc') }}>Ça roule ?</h1>
          <p style={{ ...s.greetingSub, color: dk('#64748b', '#94a3b8') }}>Voilà ce qui se passe sur ton espace</p>

          {/* STATS */}
          <div style={s.statsGrid}>
            {[
              { icon: '📄', bg: '#dbeafe', num: stats.fichiers, label: 'Total Fichiers' },
              { icon: '💾', bg: '#fef3c7', num: `${stats.quota}%`, label: 'Espace utilisé', extra: true },
              { icon: '⇄',  bg: '#dcfce7', num: stats.partages, label: 'Fichiers partagés' },
              { icon: '📊', bg: '#fce7f3', num: stats.activite, label: 'Activité récente' },
            ].map((card, i) => (
              <div key={i} style={statCardStyle(i)} onMouseEnter={() => setHoveredStat(i)} onMouseLeave={() => setHoveredStat(null)}>
                <div style={{ ...s.statIcon, background: card.bg }}>{card.icon}</div>
                <div style={{ ...s.statNum, color: dk('#0f172a', '#f8fafc') }}>{card.num}</div>
                <div style={{ ...s.statLabel, color: dk('#64748b', '#94a3b8') }}>{card.label}</div>
                {card.extra && (
                  <>
                    <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${stats.quota}%` }}></div></div>
                    <div style={s.statSub}>0.9 GB / 2 GB</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* FICHIERS RECENTS */}
          <div
            style={{
              ...s.tableCard,
              background: dk('white', '#1e293b'),
              border: dk('1px solid #e2e8f0', '1px solid #334155'),
              ...(hoveredTable ? s.tableCardHover : {}),
              animation: 'fadeIn 0.4s ease forwards',
              animationDelay: '400ms',
              opacity: 0,
            }}
            onMouseEnter={() => setHoveredTable(true)}
            onMouseLeave={() => setHoveredTable(false)}
          >
            <h2 style={{ ...s.tableTitle, color: dk('#0f172a', '#f8fafc'), borderBottom: dk('1px solid #e2e8f0', '1px solid #334155') }}>Fichiers récents</h2>
            <table style={s.table}>
              <thead>
                <tr style={{ ...s.thead, background: dk('#f8fafc', '#0f172a') }}>
                  {['Nom', 'Taille', 'Modifié le', 'Partagé par', 'Actions'].map(h => (
                    <th key={h} style={{ ...s.th, color: dk('#64748b', '#94a3b8') }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fichiers.map((f, i) => (
                  <tr key={i} style={{ ...s.tr, borderBottom: dk('1px solid #f1f5f9', '1px solid #334155') }}>
                    <td style={{ ...s.td, color: dk('#374151', '#cbd5e1') }}>📄 {f.nom}</td>
                    <td style={{ ...s.td, color: dk('#374151', '#cbd5e1') }}>{f.taille}</td>
                    <td style={{ ...s.td, color: dk('#374151', '#cbd5e1') }}>{f.modifie}</td>
                    <td style={{ ...s.td, color: dk('#374151', '#cbd5e1') }}>{f.partage_par}</td>
                    <td style={s.td}>
                      <span style={s.action}>⬇</span>
                      <span style={s.action}>⚙</span>
                      <span style={s.action}>↗</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  layout: { display:'flex', minHeight:'100vh', fontFamily:'system-ui, sans-serif' },
  sidebar: { width:'65px', display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0', position:'fixed', height:'100vh' },
  sidebarBrand: { fontWeight:'700', fontSize:'13px', padding:'0', marginBottom:'20px', display:'flex', alignItems:'center', justifyContent:'center' },
  nav: { display:'flex', flexDirection:'column', gap:'4px', flex:1, width:'100%' },
  navItem: { padding:'10px 0', fontSize:'18px', textDecoration:'none', display:'block', textAlign:'center', transition:'all .15s' },
  navActive: { background:'#f0fdfa', color:'#0d9488', fontWeight:'600', borderRight:'3px solid #0d9488' },
  sidebarBottom: { display:'flex', flexDirection:'column', gap:'4px', paddingTop:'16px' },
  logoutBtn: { padding:'10px 0', color:'#ef4444', fontSize:'18px', background:'none', border:'none', cursor:'pointer', textAlign:'center', width:'100%' },
  main: { marginLeft:'65px', flex:1, display:'flex', flexDirection:'column' },
  topbar: { padding:'12px 32px', display:'flex', alignItems:'center', gap:'16px', position:'sticky', top:0, zIndex:10 },
  searchWrap: { flex:1, position:'relative', display:'flex', alignItems:'center' },
  searchIcon: { position:'absolute', left:'12px', fontSize:'14px' },
  search: { width:'100%', padding:'9px 12px 9px 36px', borderRadius:'8px', fontSize:'14px', outline:'none' },
  topRight: { display:'flex', alignItems:'center', gap:'12px' },
  darkToggle: { borderRadius:'8px', padding:'6px 10px', cursor:'pointer', fontSize:'16px', transition:'all 0.2s' },
  notifIcon: { fontSize:'20px', cursor:'pointer' },
  avatar: { width:'36px', height:'36px', borderRadius:'50%', background:'#0d9488', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'15px' },
  content: { padding:'32px' },
  greeting: { fontSize:'24px', fontWeight:'800', marginBottom:'4px' },
  greetingSub: { fontSize:'14px', marginBottom:'28px' },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px', marginBottom:'28px' },
  statCard: { borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', transition:'all 0.2s ease' },
  statCardHover: { transform:'translateY(-4px)', boxShadow:'0 8px 24px rgba(0,0,0,0.12)' },
  statIcon: { width:'40px', height:'40px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', marginBottom:'12px' },
  statNum: { fontSize:'28px', fontWeight:'800', marginBottom:'4px' },
  statLabel: { fontSize:'12px' },
  statSub: { fontSize:'11px', color:'#94a3b8', marginTop:'4px' },
  progressBar: { background:'#e2e8f0', borderRadius:'4px', height:'6px', marginTop:'8px' },
  progressFill: { background:'#0d9488', height:'6px', borderRadius:'4px' },
  tableCard: { borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', transition:'all 0.2s ease' },
  tableCardHover: { transform:'translateY(-4px)', boxShadow:'0 8px 24px rgba(0,0,0,0.12)' },
  tableTitle: { fontSize:'16px', fontWeight:'700', padding:'20px 24px' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: {},
  th: { padding:'12px 24px', fontSize:'12px', fontWeight:'600', textAlign:'left', textTransform:'uppercase', letterSpacing:'.05em' },
  tr: {},
  td: { padding:'14px 24px', fontSize:'13px' },
  action: { marginRight:'12px', cursor:'pointer', color:'#64748b', fontSize:'16px' },
};
