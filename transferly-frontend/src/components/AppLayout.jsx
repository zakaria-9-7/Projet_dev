import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Share2, LayoutDashboard, Files, Share2 as ShareIcon,
  History, Settings, LogOut, Search, Bell, Moon, Sun,
  ShieldCheck, Users, FolderOpen, Activity,
  Shield, Crown, User, HardDrive,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import API from '../api/auth';

/* ── Nav items per role ─────────────────────────── */
const NAV_BY_ROLE = {
  Utilisateur: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord'   },
    { to: '/files',        icon: Files,           label: 'Mes fichiers'       },
    { to: '/admin-espace', icon: FolderOpen,      label: 'Mes espaces'        },
    { to: '/shared',       icon: ShareIcon,       label: 'Partagés avec moi' },
  ],
  AdminEspace: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord'   },
    { to: '/files',        icon: Files,           label: 'Mes fichiers'       },
    { to: '/admin-espace', icon: FolderOpen,      label: 'Mes espaces'        },
    { to: '/shared',       icon: ShareIcon,       label: 'Partagés avec moi' },
  ],
  AdminGlobal: [
    { to: '/dashboard',          icon: LayoutDashboard, label: 'Tableau de bord'    },
    { to: '/files',              icon: Files,           label: 'Mes fichiers'        },
    { to: '/admin-espace',       icon: FolderOpen,      label: 'Mes espaces'         },
    { to: '/shared',             icon: ShareIcon,       label: 'Partagés avec moi'  },
    { to: '/admin-users',        icon: Users,           label: 'Utilisateurs'        },
    { to: '/admin-espaces-all',  icon: FolderOpen,      label: 'Tous les espaces'    },
    { to: '/admin-fichiers-all', icon: Files,           label: 'Tous les fichiers'   },
    { to: '/logs',               icon: Activity,        label: 'Journaux'            },
    { to: '/admin-quotas',       icon: HardDrive,       label: 'Quotas'              },
  ],
};

const ROLE_BADGE = {
  AdminGlobal: { icon: Shield, label: 'Admin Global', cls: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
  AdminEspace: { icon: Crown,  label: 'Admin Espace', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'   },
  Utilisateur: { icon: User,   label: 'Utilisateur',  cls: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'       },
};

export default function AppLayout({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  const navigate  = useNavigate();
  const location  = useLocation();

  const [nom,   setNom]   = useState(() => localStorage.getItem('nom')   || '');
  const [email, setEmail] = useState(() => localStorage.getItem('email') || '');
  const [role,  setRole]  = useState(() => localStorage.getItem('role')  || 'Utilisateur');

  const navItems  = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.Utilisateur;
  const badge     = ROLE_BADGE[role]  ?? ROLE_BADGE.Utilisateur;
  const BadgeIcon = badge.icon;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  useEffect(() => {
    if (!email) {
      API.get('/me')
        .then(res => {
          const { nom: n, email: e, role: r } = res.data;
          if (n) { setNom(n);   localStorage.setItem('nom',   n); }
          if (e) { setEmail(e); localStorage.setItem('email', e); }
          if (r) { setRole(r);  localStorage.setItem('role',  r); }
        })
        .catch(() => {});
    }
  }, [email]);

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

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    navigate('/login');
  };

  /* Active nav item: left-border indicator, no left border-radius */
  const activeClass   = 'rounded-r-xl border-l-2 border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 pl-[10px] pr-3';
  const inactiveClass = 'rounded-xl px-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200';

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0a0a0f]">

      {/* ── SIDEBAR ── */}
      <aside className="w-[240px] fixed top-0 left-0 h-screen bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-800 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-cyan-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight">Transferly</span>
        </Link>

        {/* Role badge */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-3 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 py-2.5 text-sm font-medium transition-colors ${active ? activeClass : inactiveClass}`}
              >
                <Icon className={`w-4 h-4 shrink-0 stroke-[1.5] ${active ? 'text-cyan-500' : 'text-slate-400 dark:text-slate-500'}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-0.5">
          <Link
            to="/settings"
            className={`flex items-center gap-3 py-2.5 text-sm font-medium transition-colors ${
              location.pathname === '/settings' ? activeClass : inactiveClass
            }`}
          >
            <Settings className={`w-4 h-4 shrink-0 stroke-[1.5] ${location.pathname === '/settings' ? 'text-cyan-500' : 'text-slate-400 dark:text-slate-500'}`} />
            Paramètres
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 w-full text-left transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0 stroke-[1.5]" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">

        {/* TOPBAR */}
        <header className="h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 flex items-center px-6 gap-4 sticky top-0 z-10">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher des fichiers..."
              className="w-full pl-10 pr-4 py-2 border border-transparent rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-cyan-200 dark:focus:border-cyan-700 transition"
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setDark(d => !d)}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <NotificationBell />

            <div className="relative ml-1.5 flex items-center gap-2.5" ref={profileRef}>
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {nom || email || '—'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {badge.label}
                </span>
              </div>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="w-9 h-9 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer select-none hover:opacity-90 transition ring-2 ring-white dark:ring-slate-950 shadow-md"
              >
                {getInitials()}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-11 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{nom || 'Utilisateur'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{email}</p>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Paramètres
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
