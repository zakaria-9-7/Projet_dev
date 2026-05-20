import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import API from '../api/auth';

const NotificationContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const MAX_NOTIFS = 30;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const esRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const openStream = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Don't open a second connection if one is already open
    if (esRef.current && esRef.current.readyState !== EventSource.CLOSED) return;

    const es = new EventSource(`${API_BASE}/notifications/stream?token=${token}`);
    esRef.current = es;

    es.addEventListener('notification', (e) => {
      try {
        const notif = JSON.parse(e.data);
        setNotifications(prev => {
          const updated = [notif, ...prev];
          return updated.slice(0, MAX_NOTIFS);
        });
        if (!notif.lu) {
          setUnreadCount(c => c + 1);
        }
      } catch {
        // malformed event — ignore
      }
    });

    es.onerror = () => {
      // Browser handles reconnection automatically via the retry hint.
      // We just log silently.
    };
  }, []);

  const closeStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  // ── Load initial notifications list ───────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data.slice(0, MAX_NOTIFS));
      const unread = res.data.filter(n => !n.lu).length;
      setUnreadCount(unread);
    } catch {
      // silencieux
    }
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadNotifications();
      openStream();
    }

    // Reopen stream when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!esRef.current || esRef.current.readyState === EventSource.CLOSED) {
          openStream();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      closeStream();
    };
  }, [openStream, closeStream, loadNotifications]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, lu: true } : n)
    );
    setUnreadCount(c => Math.max(0, c - 1));

    try {
      await API.put(`/notifications/${id}/lu`);
    } catch {
      // silencieux — optimistic update stays
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    setUnreadCount(0);

    try {
      await API.put('/notifications/tout-lu');
    } catch {
      // silencieux
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
