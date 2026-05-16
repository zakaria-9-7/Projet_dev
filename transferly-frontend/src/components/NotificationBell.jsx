import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, FileUp, UserPlus, UserMinus, Mail, Share2, FolderOpen } from 'lucide-react';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';

const ICONS = {
  upload_espace: FileUp,
  join_espace: UserPlus,
  leave_espace: UserMinus,
  retrait_espace: UserMinus,
  invitation: Mail,
  partage_fichier: Share2,
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [count, setCount] = useState(0);
  const panelRef = useRef(null);

  const loadCount = async () => {
    try {
      const res = await API.get('/notifications/non-lues');
      setCount(res.data.count || 0);
    } catch (e) { /* silencieux */ }
  };

  const loadNotifs = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifs(res.data);
    } catch (e) { /* silencieux */ }
  };

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) loadNotifs();
  };

  const handleNotifClick = async (notif) => {
    try {
      if (!notif.lu) {
        await API.put(`/notifications/${notif.id}/lu`);
        setCount(c => Math.max(0, c - 1));
      }
    } catch (e) { /* silencieux */ }
    setOpen(false);
    if (notif.lien) navigate(notif.lien);
  };

  const handleToutLu = async () => {
    try {
      await API.put('/notifications/tout-lu');
      setCount(0);
      setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
    } catch (e) { /* silencieux */ }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-500 dark:text-slate-300" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
            {count > 0 && (
              <button
                onClick={handleToutLu}
                className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Aucune notification</p>
              </div>
            ) : (
              notifs.map(n => {
                const Icon = ICONS[n.type] || FolderOpen;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition border-b border-slate-50 dark:border-slate-700/50 ${
                      !n.lu ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''
                    }`}
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      !n.lu ? 'bg-cyan-100 dark:bg-cyan-900/40' : 'bg-slate-100 dark:bg-slate-700'
                    }`}>
                      <Icon className={`w-4 h-4 ${!n.lu ? 'text-cyan-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.lu ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(n.date_creation)}</p>
                    </div>
                    {!n.lu && <span className="shrink-0 w-2 h-2 bg-cyan-500 rounded-full mt-1.5" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
