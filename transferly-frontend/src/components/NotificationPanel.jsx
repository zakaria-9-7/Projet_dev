import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import API from '../api/auth';

export default function NotificationPanel() {
  const [open, setOpen]     = useState(false);
  const [notifs, setNotifs] = useState([]);
  const ref = useRef();

  const fetchNotifs = async () => {
    try {
      const res = await API.get('/notifications/');
      setNotifs(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const nonLues = notifs.filter(n => !n.lu).length;

  const markAllRead = async () => {
    await API.put('/notifications/tout-lu');
    setNotifs(notifs.map(n => ({ ...n, lu: true })));
  };

  const markRead = async (id) => {
    await API.put(`/notifications/${id}/lu`);
    setNotifs(notifs.map(n => n.id === id ? { ...n, lu: true } : n));
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); fetchNotifs(); }}
        className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition">
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        {nonLues > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {nonLues}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Notifications</span>
            {nonLues > 0 && (
              <button onClick={markAllRead} className="text-xs text-cyan-500 hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">Aucune notification</p>
            ) : notifs.map(n => (
              <div key={n.id} onClick={() => markRead(n.id)}
                className={`px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 ${!n.lu ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''}`}>
                <p className="text-sm text-slate-700 dark:text-slate-200">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(n.date + 'Z').toLocaleString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
