import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Share2, FolderOpen, History,
  Users, LayoutGrid, Files, BarChart3, Settings, LogOut,
  Sun, Moon, Inbox, Activity,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
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
  '/admin-quotas':            'Quotas',
  '/admin-quota-requests':   'Demandes de quota',
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
  { to: '/admin-quotas',           icon: BarChart3, label: 'Quotas'            },
  { to: '/admin-quota-requests',  icon: Inbox,     label: 'Demandes de quota' },
  { to: '/logs',                 icon: Activity,  label: "Journaux d'activité" },
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
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored === null ? true : stored === 'true'; // default to dark
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const nom   = localStorage.getItem('nom')   || '';
  const email = localStorage.getItem('email') || '';
  const role  = localStorage.getItem('role')  || 'Utilisateur';

  const [logoAnim, setLogoAnim] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    // Synchronisation avec les tokens de Wings :
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileMenuOpen]);

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
    document.documentElement.removeAttribute('data-theme');
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
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>

        <div style={{
          padding: '28px 22px 22px',
          borderBottom: '0.5px solid var(--wings-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          cursor: 'pointer',

        }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src={cicada}
              alt=""
              onClick={() => {
                setLogoAnim(true);
                setTimeout(() => setLogoAnim(false), 600);
              }}

              style={{
                width: '64px',
                height: '64px',
                filter: 'drop-shadow(0 0 12px rgba(79,139,255,0.5))',
                display: 'block',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, filter 0.3s ease',
                transform: logoAnim ? 'scale(1.2) rotate(-8deg)' : 'scale(1) rotate(0deg)',
                filter: logoAnim
                  ? 'drop-shadow(0 0 20px rgba(255,193,7,0.8))'
                  : 'drop-shadow(0 0 12px rgba(79,139,255,0.5))',

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
        </Link>

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

            <NotificationBell />

            {/* Avatar utilisateur */}
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setProfileMenuOpen(o => !o)}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--wings-surface)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
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

              {/* POPOVER */}
              {profileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 220,
                  background: 'var(--wings-surface)',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  zIndex: 100,
                }}>
                  <div style={{
                    padding: '10px 12px',
                    borderBottom: '0.5px solid var(--wings-border)',
                    marginBottom: 4,
                  }}>
                    <div style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nom || '—'}
                    </div>
                    <div style={{ color: 'var(--wings-text-muted)', fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email}
                    </div>
                  </div>

                  <button
                    onClick={() => { setProfileMenuOpen(false); navigate('/settings'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      color: 'var(--wings-text)',
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(79,139,255,0.08)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <Settings size={14} style={{ color: 'var(--wings-text-muted)' }} />
                    Paramètres
                  </button>

                  <button
                    onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      color: '#e57373',
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(220,80,80,0.08)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={14} style={{ color: '#e57373' }} />
                    Déconnexion
                  </button>
                </div>
              )}
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