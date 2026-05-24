import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Share2, FolderOpen, History,
  Users, LayoutGrid, Files, BarChart3, Settings, LogOut,
  Sun, Moon,
} from 'lucide-react';
import cicada from '../assets/cicada.svg';
import './AppLayout.css';

const PAGE_TITLES = {
  '/dashboard':          'Tableau de bord',
  '/files':              'Mes fichiers',
  '/shared':             'Partagés avec moi',
  '/admin-espace':       'Mes espaces',
  '/versions':           'Historique',
  '/admin-users':        'Utilisateurs',
  '/admin-espaces-all':  'Tous les espaces',
  '/admin-fichiers-all': 'Tous les fichiers',
  '/admin-quotas':       'Quotas',
  '/logs':               'Journaux',
  '/settings':           'Paramètres',
  '/editor':             'Éditeur',
};

const NAV_PERSO = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord'   },
  { to: '/files',     icon: FileText,        label: 'Mes fichiers'       },
  { to: '/shared',    icon: Share2,          label: 'Partagés avec moi' },
];

const NAV_COLLAB = [
  { to: '/admin-espace', icon: FolderOpen, label: 'Mes espaces' },
  { to: '/versions',     icon: History,    label: 'Historique'  },
];

const NAV_ADMIN = [
  { to: '/admin-users',        icon: Users,      label: 'Utilisateurs'     },
  { to: '/admin-espaces-all',  icon: LayoutGrid, label: 'Tous les espaces'  },
  { to: '/admin-fichiers-all', icon: Files,      label: 'Tous les fichiers' },
  { to: '/admin-quotas',       icon: BarChart3,  label: 'Quotas'            },
];

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: '9px',
      letterSpacing: '2px',
      color: 'var(--wings-text-muted)',
      opacity: 0.6,
      padding: '0 22px 8px',
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  );
}

function NavItem({ to, icon: Icon, label, onClick, active = false, extraClass = '' }) {
  const cls = `wings-nav-item${active ? ' active' : ''}${extraClass ? ' ' + extraClass : ''}`;
  const iconEl = <Icon size={16} style={{ opacity: 0.8, flexShrink: 0 }} />;

  if (to) {
    return (
      <Link to={to} className={cls}>
        {iconEl}
        {label}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {iconEl}
      {label}
    </button>
  );
}

export default function AppLayout({ children, titleNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  const navigate = useNavigate();
  const location = useLocation();

  const nom   = localStorage.getItem('nom')   || '';
  const email = localStorage.getItem('email') || '';
  const role  = localStorage.getItem('role')  || 'Utilisateur';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

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

  const handleLogout = () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    navigate('/login');
  };

  const pageTitle = PAGE_TITLES[location.pathname] || 'Wings';

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--wings-bg)' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '260px',
        flexShrink: 0,
        background: 'var(--wings-surface)',
        borderRight: '0.5px solid var(--wings-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 20,
        overflow: 'hidden',
      }}>

        {/* BRAND ZONE */}
        <div style={{
          padding: '28px 22px 22px',
          borderBottom: '0.5px solid var(--wings-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src={cicada}
              alt=""
              style={{
                width: '64px',
                height: '64px',
                filter: 'drop-shadow(0 0 12px rgba(79,139,255,0.5))',
                display: 'block',
              }}
            />
          </div>
          <div style={{
            fontFamily: 'Georgia, serif',
            fontSize: '22px',
            letterSpacing: '6px',
            color: 'var(--wings-text)',
            fontWeight: 400,
            lineHeight: 1,
            marginTop: '8px',
          }}>
            WINGS
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '9px',
            letterSpacing: '3px',
            color: 'var(--wings-gold)',
            opacity: 0.7,
            marginTop: '6px',
          }}>
            — JUST FLY IT —
          </div>
        </div>

        {/* NAV SECTIONS */}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '18px', paddingBottom: '8px' }}>

          <SectionLabel>Espace Personnel</SectionLabel>
          {NAV_PERSO.map(({ to, icon, label }) => (
            <NavItem
              key={to}
              to={to}
              icon={icon}
              label={label}
              active={location.pathname === to}
            />
          ))}

          <div style={{ paddingTop: '18px' }}>
            <SectionLabel>Collaboratif</SectionLabel>
            {NAV_COLLAB.map(({ to, icon, label }) => (
              <NavItem
                key={to}
                to={to}
                icon={icon}
                label={label}
                active={location.pathname === to}
              />
            ))}
          </div>

          {role === 'AdminGlobal' && (
            <div style={{ paddingTop: '18px' }}>
              <SectionLabel>Administration</SectionLabel>
              {NAV_ADMIN.map(({ to, icon, label }) => (
                <NavItem
                  key={to}
                  to={to}
                  icon={icon}
                  label={label}
                  active={location.pathname === to}
                />
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM ZONE */}
        <div style={{
          borderTop: '0.5px solid var(--wings-border)',
          padding: '14px 16px',
          flexShrink: 0,
        }}>
          <NavItem
            to="/settings"
            icon={Settings}
            label="Paramètres"
            active={location.pathname === '/settings'}
          />
          <NavItem
            icon={LogOut}
            label="Déconnexion"
            onClick={handleLogout}
            extraClass="logout"
          />
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div style={{
        marginLeft: '260px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>

        {/* TOPBAR */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 40px',
          borderBottom: '0.5px solid var(--wings-border)',
          background: 'var(--wings-surface)',
          flexShrink: 0,
        }}>
          {titleNode ?? (
            <h1 style={{
              fontFamily: 'Georgia, serif',
              fontSize: '24px',
              color: 'var(--wings-text)',
              fontWeight: 400,
              margin: 0,
            }}>
              {pageTitle}
            </h1>
          )}

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button
              onClick={() => setDark(d => !d)}
              className="wings-theme-toggle"
              title={dark ? 'Mode clair' : 'Mode sombre'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '0.5px solid var(--wings-border)',
                background: 'transparent',
                color: 'var(--wings-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Avatar utilisateur */}
            <div
              onClick={() => navigate('/settings')}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--wings-blue), var(--wings-blue-dark))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {getInitials()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: 'var(--wings-text)',
                  fontSize: '12px',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '140px',
                }}>
                  {nom || email || '—'}
                </div>
                <div style={{
                  color: 'var(--wings-text-muted)',
                  fontSize: '10px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '140px',
                }}>
                  {email}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main style={{
          flex: 1,
          padding: '32px 40px',
          overflowY: 'auto',
          background: 'var(--wings-bg)',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
