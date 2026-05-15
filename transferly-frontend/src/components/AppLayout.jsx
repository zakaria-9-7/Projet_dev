import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Share2, LayoutDashboard, Files, Share2 as ShareIcon,
  History, Settings, LogOut, Search, Bell, Moon, Sun,
  ShieldCheck, Users, FolderOpen, Activity,
} from 'lucide-react';

/* ── Nav items per role ─────────────────────────── */
const NAV_BY_ROLE = {
  Utilisateur: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord'    },
    { to: '/files',        icon: Files,           label: 'Mes fichiers'        },
    { to: '/shared',       icon: ShareIcon,       label: 'Partagés avec moi'  },
    { to: '/versions',     icon: History,         label: 'Versions'            },
    { to: '/admin-espace', icon: FolderOpen,      label: 'Mes espaces'         },
  ],
  AdminEspace: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord'    },
    { to: '/files',        icon: Files,           label: 'Mes fichiers'        },
    { to: '/shared',       icon: ShareIcon,       label: 'Partagés avec moi'  },
    { to: '/versions',     icon: History,         label: 'Versions'            },
    { to: '/admin-espace', icon: FolderOpen,      label: 'Mes espaces'         },
    { to: '/acl',          icon: ShieldCheck,     label: "Droits d'accès"     },
  ],
  AdminGlobal: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord'   },
    { to: '/files',     icon: Files,           label: 'Mes fichiers'       },
    { to: '/shared',    icon: ShareIcon,       label: 'Partagés avec moi'  },
    { to: '/versions',  icon: History,         label: 'Versions'           },
    { to: '/admin-users', icon: Users,           label: 'Utilisateurs'       },
    { to: '/acl',       icon: ShieldCheck,     label: "Droits d'accès"    },
    { to: '/logs',      icon: Activity,        label: 'Logs'               },
  ],
};

export default function AppLayout({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  const navigate = useNavigate();
  const location = useLocation();

  const role    = localStorage.getItem('role') || 'Utilisateur';
  const nom     = localStorage.getItem('nom');
  const email   = localStorage.getItem('email');
  const roleLabel = role === 'AdminGlobal'  ? 'Admin Global'
                  : role === 'AdminEspace' ? 'Admin Espace'
                  : 'Utilisateur';

  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.Utilisateur;

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

  return (
    <div className="flex min-h-screen bg-sky-50 dark:bg-[#121414]">

      {/* ── SIDEBAR ── */}
      <aside className="w-[200px] fixed top-0 left-0 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-20">

        {/* Brand */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-100 dark:border-slate-700">
          <Share2 className="w-5 h-5 text-cyan-500 shrink-0" />
          <span className="font-bold text-slate-900 dark:text-slate-100 text-base">Transferly</span>
        </div>

        {/* Role badge */}
        <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-700">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
            role === 'AdminGlobal'  ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' :
            role === 'AdminEspace' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                                     'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
          }`}>
            {roleLabel}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5 px-3 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-500' : 'text-slate-400 dark:text-slate-500'}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-0.5">
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/settings'
                ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
            Paramètres
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 w-full text-left transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Déconnexion
          </button>

          <button
            onClick={() => setDark(d => !d)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 w-full text-left transition-colors"
          >
            {dark
              ? <Sun  className="w-4 h-4 text-amber-400 shrink-0" />
              : <Moon className="w-4 h-4 text-slate-400 shrink-0" />}
            {dark ? 'Mode clair' : 'Mode sombre'}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="ml-[200px] flex-1 flex flex-col min-h-screen">

        {/* TOPBAR */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 gap-4 sticky top-0 z-10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher des fichiers..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full" />
            </button>

            <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer select-none">
              {getInitials()}
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
