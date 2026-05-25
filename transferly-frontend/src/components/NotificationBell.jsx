import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, FileUp, UserPlus, UserMinus, Mail, Share2, FolderOpen } from 'lucide-react';
import { formatRelativeTime } from '../utils/formatTime';
import { useNotifications } from '../context/NotificationContext';

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
  const panelRef = useRef(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => setOpen(prev => !prev);

  const handleNotifClick = async (notif) => {
    if (!notif.lu) {
      await markAsRead(notif.id);
    }
    setOpen(false);
    if (notif.lien) navigate(notif.lien);
  };

  const handleToutLu = async () => {
    await markAllAsRead();
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        onClick={handleOpen}
        title="Notifications"
        style={{
          position: 'relative',
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '0.5px solid var(--wings-border)',
          background: 'transparent',
          color: 'var(--wings-text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--wings-surface)';
          e.currentTarget.style.color = 'var(--wings-text)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--wings-text-muted)';
        }}
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            background: 'var(--wings-blue)',
            color: '#fff',
            fontSize: 9,
            fontWeight: 600,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 480,
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
          }}
        >
          {/* En-tête */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '0.5px solid var(--wings-border)',
          }}>
            <h3 style={{
              fontFamily: 'Georgia, serif',
              fontSize: 14,
              color: 'var(--wings-text)',
              margin: 0,
              fontWeight: 500,
            }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleToutLu}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--wings-blue)', fontSize: 11,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Check size={11} /> Tout lu
              </button>
            )}
          </div>

          {/* Liste scrollable */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                Aucune notification
              </div>
            ) : (
              notifications.map(n => {
                const Icon = ICONS[n.type] || FolderOpen;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      display: 'flex', gap: 12,
                      padding: '12px 16px',
                      borderBottom: '0.5px solid var(--wings-border)',
                      cursor: 'pointer',
                      background: n.lu ? 'transparent' : 'rgba(79,139,255,0.06)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,139,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = n.lu ? 'transparent' : 'rgba(79,139,255,0.06)'}
                  >
                    <div style={{
                      flexShrink: 0,
                      width: 32, height: 32, borderRadius: 8,
                      background: n.lu ? 'var(--wings-bg)' : 'rgba(79,139,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={14} style={{ color: n.lu ? 'var(--wings-text-muted)' : 'var(--wings-blue)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontSize: 12,
                        color: 'var(--wings-text)',
                        lineHeight: 1.4,
                        fontWeight: n.lu ? 400 : 500,
                      }}>
                        {n.message}
                      </p>
                      <p style={{
                        margin: '4px 0 0 0', fontSize: 10,
                        color: 'var(--wings-text-muted)',
                        fontFamily: 'monospace',
                      }}>
                        {formatRelativeTime(n.date_creation)}
                      </p>
                    </div>
                    {!n.lu && (
                      <span style={{
                        flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--wings-blue)', marginTop: 6,
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
