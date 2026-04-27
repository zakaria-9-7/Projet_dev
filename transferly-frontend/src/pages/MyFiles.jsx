import React, { useState, useEffect, useRef } from 'react';
// import api from '../api/files';

// ─── Mock data ───────────────────────────────────────────────
const ROOT_ITEMS = [
  { id: 1, type: 'folder', name: 'Documents', count: 24, date: 'Il y a 1 jour', permissions: { lecture: true, ecriture: true, download: false, suppression: false, partage: false, versions: false } },
  { id: 2, type: 'folder', name: 'Images', count: 156, date: 'Il y a 3 jours', permissions: { lecture: true, ecriture: true, download: false, suppression: false, partage: false, versions: false } },
  { id: 3, type: 'folder', name: 'Projets', count: 8, date: 'Il y a 1 semaine', permissions: { lecture: true, ecriture: true, download: false, suppression: false, partage: false, versions: false } },
  { id: 4, type: 'file', name: 'Rapport_Q1_2024.pdf', fileType: 'PDF', size: '2.4 MB', date: 'Il y a 2 heures', permissions: { download: true, lecture: true, ecriture: false, suppression: true, partage: false, versions: true } },
  { id: 5, type: 'file', name: 'Presentation.pptx', fileType: 'PPT', size: '8.1 MB', date: 'Il y a 5 heures', permissions: { download: true, lecture: true, ecriture: true, suppression: true, partage: true, versions: true } },
  { id: 6, type: 'file', name: 'Budget_2024.xlsx', fileType: 'XLS', size: '1.2 MB', date: 'Hier', permissions: { download: true, lecture: true, ecriture: true, suppression: true, partage: true, versions: true } },
  { id: 7, type: 'file', name: 'Logo_Final.png', fileType: 'IMG', size: '450 KB', date: 'Il y a 2 jours', permissions: { download: true, lecture: true, ecriture: true, suppression: true, partage: true, versions: true } },
];

const FILE_TYPE_CONFIG = {
  PDF: { bg: '#fef2f2', color: '#dc2626', label: 'PDF' },
  PPT: { bg: '#fff7ed', color: '#ea580c', label: 'PPT' },
  XLS: { bg: '#f0fdf4', color: '#16a34a', label: 'XLS' },
  IMG: { bg: '#eff6ff', color: '#2563eb', label: 'IMG' },
  DOC: { bg: '#eff6ff', color: '#1d4ed8', label: 'DOC' },
  ZIP: { bg: '#faf5ff', color: '#7c3aed', label: 'ZIP' },
};

// ─── Icons ───────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor' }) => {
  const icons = {
    folder: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    file: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
      </svg>
    ),
    download: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7,10 12,15 17,10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
    share: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    ),
    clock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
    ),
    trash: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3,6 5,6 21,6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    ),
    dots: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
      </svg>
    ),
    grid: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    list: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
    upload: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17,8 12,3 7,8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
    chevronDown: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="6,9 12,15 18,9"/>
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    bell: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    shared: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16,6 12,2 8,6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
    ),
    versions: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <polyline points="1,4 1,10 7,10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
      </svg>
    ),
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16,17 21,12 16,7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

// ─── Sidebar ─────────────────────────────────────────────────
function Sidebar({ activePage, onNavigate }) {
  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { id: 'myfiles', label: 'Mes Fichiers', icon: 'folder' },
    { id: 'shared', label: 'Partagés avec moi', icon: 'shared' },
    { id: 'versions', label: 'Versions', icon: 'versions' },
  ];
  return (
    <aside style={{
      width: 220, flexShrink: 0, background: '#fff',
      borderRight: '1px solid #e8e8ed', display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0f0f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', letterSpacing: '-0.02em' }}>Transferly</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {navItems.map(item => {
          const active = activePage === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: active ? '#eff6ff' : 'transparent',
              color: active ? '#2563eb' : '#64748b',
              fontWeight: active ? 600 : 400, fontSize: 14,
              marginBottom: 2, textAlign: 'left', transition: 'all .15s',
            }}>
              <Icon name={item.icon} size={16} color={active ? '#2563eb' : '#94a3b8'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid #f0f0f5' }}>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', color: '#64748b', fontSize: 14, textAlign: 'left',
          marginBottom: 2,
        }}>
          <Icon name="settings" size={16} color="#94a3b8" /> Paramètres
        </button>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', color: '#ef4444', fontSize: 14, textAlign: 'left',
        }}>
          <Icon name="logout" size={16} color="#ef4444" /> Déconnexion
        </button>
      </div>
    </aside>
  );
}

// ─── Topbar ──────────────────────────────────────────────────
function Topbar() {
  return (
    <div style={{
      height: 60, display: 'flex', alignItems: 'center',
      padding: '0 28px', borderBottom: '1px solid #e8e8ed',
      background: '#fff', gap: 16,
    }}>
      {/* Logo on mobile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Transferly</span>
      </div>

      {/* Search */}
      <div style={{
        flex: 1, maxWidth: 440,
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f8f9fc', border: '1px solid #e8e8ed',
        borderRadius: 10, padding: '0 14px', height: 38,
      }}>
        <Icon name="search" size={15} color="#94a3b8" />
        <input
          placeholder="Rechercher des fichiers..."
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13.5, color: '#1a1a2e', flex: 1,
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Bell */}
      <button style={{
        width: 36, height: 36, borderRadius: 8, border: '1px solid #e8e8ed',
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative',
      }}>
        <Icon name="bell" size={16} color="#64748b" />
        <span style={{
          position: 'absolute', top: 7, right: 7, width: 7, height: 7,
          background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff',
        }} />
      </button>

      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      }}>
        U
      </div>
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────
function ContextMenu({ item, onClose, onNavigateVersions }) {
  return (
    <div style={{
      position: 'fixed', zIndex: 999,
      background: '#fff', border: '1px solid #e8e8ed',
      borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,.12)',
      padding: '6px 0', minWidth: 180,
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    }}>
      {item.permissions.download && item.type === 'file' && (
        <button onClick={onClose} style={menuItemStyle('#1a1a2e')}>
          <Icon name="download" size={14} color="#64748b" /> Télécharger
        </button>
      )}
      {item.permissions.ecriture && (
        <button onClick={onClose} style={menuItemStyle('#1a1a2e')}>
          <Icon name="file" size={14} color="#64748b" /> Renommer
        </button>
      )}
      {item.type === 'file' && item.permissions.versions && (
        <button onClick={() => { onNavigateVersions(item.id); onClose(); }} style={menuItemStyle('#1a1a2e')}>
          <Icon name="versions" size={14} color="#64748b" /> Historique des versions
        </button>
      )}
      {item.permissions.partage && (
        <button onClick={onClose} style={menuItemStyle('#1a1a2e')}>
          <Icon name="share" size={14} color="#64748b" /> Partager
        </button>
      )}
      {item.permissions.suppression && (
        <>
          <div style={{ height: 1, background: '#f0f0f5', margin: '4px 0' }} />
          <button onClick={onClose} style={menuItemStyle('#ef4444')}>
            <Icon name="trash" size={14} color="#ef4444" /> Supprimer
          </button>
        </>
      )}
    </div>
  );
}

const menuItemStyle = (color) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '9px 16px', border: 'none',
  background: 'transparent', cursor: 'pointer', fontSize: 13.5,
  color, textAlign: 'left',
  ':hover': { background: '#f8f9fc' },
});

// ─── File Card (grid) ─────────────────────────────────────────
function FileCard({ item, onFolderClick, onVersionsClick, onMenuToggle, menuOpen }) {
  const ftc = FILE_TYPE_CONFIG[item.fileType] || { bg: '#f8f9fc', color: '#64748b', label: '?' };

  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e8ed',
      borderRadius: 14, padding: '18px 16px 14px',
      display: 'flex', flexDirection: 'column', gap: 0,
      transition: 'box-shadow .18s, transform .14s', cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,.04)',
      position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Dots menu */}
      <button
        onClick={(e) => { e.stopPropagation(); onMenuToggle(item.id); }}
        style={{
          position: 'absolute', top: 10, right: 10,
          width: 28, height: 28, border: 'none',
          background: 'transparent', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#94a3b8',
        }}>
        <Icon name="dots" size={14} color="#94a3b8" />
      </button>

      {/* Icon */}
      <div
        onClick={() => item.type === 'folder' ? onFolderClick(item) : null}
        style={{ marginBottom: 12 }}
      >
        {item.type === 'folder' ? (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.3">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="#dbeafe" />
          </svg>
        ) : (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.3">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#f8f9fc" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
        )}
      </div>

      {/* Name + meta */}
      <div onClick={() => item.type === 'folder' ? onFolderClick(item) : null}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1a1a2e', marginBottom: 2, lineHeight: 1.35, paddingRight: 24 }}>
          {item.name}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {item.type === 'folder' ? (
            <span>{item.count} fichiers</span>
          ) : (
            <>
              <span>{item.size}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
              <span>{item.date}</span>
            </>
          )}
        </div>
        {/* File type badge */}
        {item.type === 'file' && item.fileType && (
          <span style={{
            display: 'inline-block', marginTop: 6,
            padding: '2px 7px', borderRadius: 5,
            background: ftc.bg, color: ftc.color,
            fontSize: 10.5, fontWeight: 700, fontFamily: 'monospace',
            letterSpacing: '.04em',
          }}>
            {ftc.label}
          </span>
        )}
      </div>

      {/* Action icons (bottom row) */}
      {item.type === 'file' && (
        <div style={{ display: 'flex', gap: 4, marginTop: 14, borderTop: '1px solid #f0f0f5', paddingTop: 12 }}>
          {item.permissions.download && (
            <ActionIcon icon="download" title="Télécharger" color="#3b82f6" />
          )}
          {item.permissions.partage && (
            <ActionIcon icon="share" title="Partager" color="#3b82f6" />
          )}
          {item.permissions.versions && (
            <ActionIcon icon="versions" title="Historique" color="#3b82f6" onClick={() => onVersionsClick(item.id)} />
          )}
          {item.permissions.suppression && (
            <ActionIcon icon="trash" title="Supprimer" color="#ef4444" />
          )}
        </div>
      )}
    </div>
  );
}

function ActionIcon({ icon, title, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, border: 'none', borderRadius: 7,
        background: hov ? (color === '#ef4444' ? '#fef2f2' : '#eff6ff') : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'background .15s',
      }}>
      <Icon name={icon} size={14} color={hov ? color : '#94a3b8'} />
    </button>
  );
}

// ─── List Row ─────────────────────────────────────────────────
function ListRow({ item, onFolderClick, onVersionsClick }) {
  const ftc = FILE_TYPE_CONFIG[item.fileType] || { bg: '#f8f9fc', color: '#64748b', label: '?' };
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 18px', borderRadius: 10,
        background: hov ? '#f8f9fc' : 'transparent',
        cursor: 'pointer', transition: 'background .12s',
      }}
      onClick={() => item.type === 'folder' && onFolderClick(item)}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0 }}>
        {item.type === 'folder' ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="#dbeafe" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#f1f5f9" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
        )}
      </div>

      {/* Name */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1a1a2e' }}>{item.name}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
          {item.type === 'folder' ? `${item.count} fichiers` : item.date}
        </div>
      </div>

      {/* Type badge */}
      {item.type === 'file' && (
        <span style={{
          padding: '2px 8px', borderRadius: 5,
          background: ftc.bg, color: ftc.color,
          fontSize: 10.5, fontWeight: 700, fontFamily: 'monospace',
        }}>
          {ftc.label}
        </span>
      )}

      {/* Size */}
      {item.type === 'file' && (
        <span style={{ fontSize: 12.5, color: '#94a3b8', minWidth: 60, textAlign: 'right' }}>
          {item.size}
        </span>
      )}

      {/* Actions */}
      {item.type === 'file' && (
        <div style={{ display: 'flex', gap: 2 }}>
          {item.permissions.download && (
            <ActionIcon icon="download" title="Télécharger" color="#3b82f6" />
          )}
          {item.permissions.partage && (
            <ActionIcon icon="share" title="Partager" color="#3b82f6" />
          )}
          {item.permissions.versions && (
            <ActionIcon icon="versions" title="Historique" color="#3b82f6" onClick={(e) => { e.stopPropagation(); onVersionsClick(item.id); }} />
          )}
          {item.permissions.suppression && (
            <ActionIcon icon="trash" title="Supprimer" color="#ef4444" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── MyFiles page ─────────────────────────────────────────────
export default function MyFiles() {
  const [items, setItems] = useState(ROOT_ITEMS);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Racine' }]);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [menuOpen, setMenuOpen] = useState(null);
  const [activePage, setActivePage] = useState('myfiles');
  const [showVersions, setShowVersions] = useState(null);

  useEffect(() => {
    setItems(ROOT_ITEMS);
  }, [breadcrumbs]);

  const navigateToFolder = (folder) => {
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const goBackTo = (index) => {
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const sortedItems = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  // Show FileVersions if triggered
  if (showVersions !== null) {
    return <FileVersionsInline fileId={showVersions} onBack={() => setShowVersions(null)} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8f9fc', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />

        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }}>

          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0, letterSpacing: '-0.02em' }}>
              Mes Fichiers
            </h1>
            {/* Breadcrumb */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.id || 'root'}>
                  {i > 0 && <span style={{ color: '#cbd5e1', fontSize: 12 }}>/</span>}
                  <button
                    onClick={() => goBackTo(i)}
                    style={{
                      border: 'none', background: 'none', padding: '0 2px',
                      fontSize: 13, color: i === breadcrumbs.length - 1 ? '#64748b' : '#3b82f6',
                      cursor: i === breadcrumbs.length - 1 ? 'default' : 'pointer',
                      fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                    }}>
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 9, border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#475569', fontSize: 13.5, fontWeight: 500,
              cursor: 'pointer',
            }}>
              <Icon name="plus" size={14} color="#475569" /> Nouveau dossier
            </button>

            <button style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 9, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,.3)',
            }}>
              <Icon name="upload" size={14} color="#fff" /> Téléverser un fichier
            </button>

            <div style={{ flex: 1 }} />

            {/* Sort */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#fff', fontSize: 13, color: '#475569', cursor: 'pointer',
            }}>
              Trier par nom <Icon name="chevronDown" size={13} color="#94a3b8" />
            </div>

            {/* View toggle */}
            <div style={{
              display: 'flex', borderRadius: 8, border: '1px solid #e2e8f0',
              overflow: 'hidden', background: '#fff',
            }}>
              {['grid', 'list'].map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  width: 36, height: 34, border: 'none',
                  background: viewMode === mode ? '#eff6ff' : '#fff',
                  color: viewMode === mode ? '#2563eb' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <Icon name={mode} size={15} color={viewMode === mode ? '#2563eb' : '#94a3b8'} />
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {viewMode === 'grid' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 14,
            }}>
              {sortedItems.map(item => (
                <FileCard
                  key={item.id}
                  item={item}
                  onFolderClick={navigateToFolder}
                  onVersionsClick={(id) => setShowVersions(id)}
                  onMenuToggle={(id) => setMenuOpen(menuOpen === id ? null : id)}
                  menuOpen={menuOpen === item.id}
                />
              ))}
            </div>
          ) : (
            <div style={{
              background: '#fff', borderRadius: 12,
              border: '1px solid #e8e8ed', overflow: 'hidden',
            }}>
              {/* List header */}
              <div style={{
                display: 'flex', gap: 14, padding: '10px 18px',
                borderBottom: '1px solid #f0f0f5',
                fontSize: 11.5, fontWeight: 600, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '.06em',
              }}>
                <span style={{ flex: 1 }}>Nom</span>
                <span style={{ width: 60 }}>Type</span>
                <span style={{ width: 70 }}>Taille</span>
                <span style={{ width: 120 }}>Actions</span>
              </div>
              {sortedItems.map(item => (
                <ListRow
                  key={item.id}
                  item={item}
                  onFolderClick={navigateToFolder}
                  onVersionsClick={(id) => setShowVersions(id)}
                />
              ))}
            </div>
          )}

        </main>
      </div>

      {/* Overlay for context menu */}
      {menuOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            onClick={() => setMenuOpen(null)}
          />
          <ContextMenu
            item={items.find(i => i.id === menuOpen)}
            onClose={() => setMenuOpen(null)}
            onNavigateVersions={(id) => setShowVersions(id)}
          />
        </>
      )}
    </div>
  );
}

// ─── FileVersions (inline, for demo) ─────────────────────────
function FileVersionsInline({ fileId, onBack }) {
  const MOCK_VERSIONS = [
    { id: 1, numeroVersion: 3, date: '27 Avr 2025, 14:32', auteur: 'Nizar El Amrani', taille: '2.6 MB', sha256: 'a3f9d1c2e8b047...', estCourante: true },
    { id: 2, numeroVersion: 2, date: '25 Avr 2025, 09:15', auteur: 'Imane Elouahi', taille: '2.4 MB', sha256: 'b7e2f4a9c3d801...', estCourante: false },
    { id: 3, numeroVersion: 1, date: '20 Avr 2025, 16:44', auteur: 'Nizar El Amrani', taille: '2.1 MB', sha256: 'c9a5b3d7e1f204...', estCourante: false },
  ];

  return (
    <FileVersionsPage versions={MOCK_VERSIONS} fileName={`Fichier #${fileId}`} onBack={onBack} />
  );
}

// Export also FileVersionsPage standalone
export function FileVersionsPage({ versions: initVersions, fileName, onBack }) {
  const [versions, setVersions] = useState(initVersions || []);
  const [restoring, setRestoring] = useState(null);
  const [activePage] = useState('versions');

  const handleRestore = async (v) => {
    setRestoring(v.numeroVersion);
    await new Promise(r => setTimeout(r, 900));
    setVersions(prev => prev.map(ver => ({
      ...ver,
      estCourante: ver.numeroVersion === v.numeroVersion,
    })));
    setRestoring(null);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8f9fc', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Sidebar activePage={activePage} onNavigate={() => {}} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />

        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }}>

          {/* Back + header */}
          <div style={{ marginBottom: 28 }}>
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: 'none', background: 'none', padding: '0',
                fontSize: 13.5, color: '#3b82f6', cursor: 'pointer', marginBottom: 12,
                fontWeight: 500,
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
              Retour aux fichiers
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0, letterSpacing: '-0.02em' }}>
              Historique des versions
            </h1>
            <p style={{ fontSize: 13.5, color: '#94a3b8', marginTop: 4 }}>
              Fichier : <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{fileName}</span>
            </p>
          </div>

          {/* Table card */}
          <div style={{
            background: '#fff', borderRadius: 14,
            border: '1px solid #e8e8ed',
            boxShadow: '0 1px 4px rgba(0,0,0,.04)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 1fr 80px 1fr',
              gap: 12, padding: '12px 24px',
              borderBottom: '1px solid #f0f0f5',
              fontSize: 11, fontWeight: 600, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '.08em',
            }}>
              <span>Version</span>
              <span>Date de modification</span>
              <span>Auteur</span>
              <span>Taille</span>
              <span style={{ textAlign: 'right' }}>Action</span>
            </div>

            {versions.map((v, i) => (
              <div key={v.id} style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 1fr 80px 1fr',
                gap: 12, padding: '16px 24px',
                borderBottom: i < versions.length - 1 ? '1px solid #f8f9fc' : 'none',
                background: v.estCourante ? '#f0f9ff' : '#fff',
                alignItems: 'center', transition: 'background .12s',
              }}>
                {/* Version badge */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 20,
                    background: v.estCourante ? '#dbeafe' : '#f1f5f9',
                    color: v.estCourante ? '#1d4ed8' : '#475569',
                    fontSize: 12.5, fontWeight: 700,
                  }}>
                    v{v.numeroVersion}
                    {v.estCourante && (
                      <span style={{ fontSize: 10, fontWeight: 500, opacity: .75 }}>(actuelle)</span>
                    )}
                  </span>
                </div>

                {/* Date */}
                <div style={{ fontSize: 13.5, color: '#475569' }}>{v.date}</div>

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {v.auteur.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <span style={{ fontSize: 13.5, color: '#475569' }}>{v.auteur}</span>
                </div>

                {/* Size */}
                <div style={{ fontSize: 13.5, color: '#64748b' }}>{v.taille}</div>

                {/* Action */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {!v.estCourante ? (
                    <button
                      onClick={() => handleRestore(v)}
                      disabled={restoring === v.numeroVersion}
                      style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: restoring === v.numeroVersion ? '#dbeafe' : '#2563eb',
                        color: restoring === v.numeroVersion ? '#3b82f6' : '#fff',
                        fontSize: 13, fontWeight: 600, cursor: restoring ? 'not-allowed' : 'pointer',
                        transition: 'all .15s',
                      }}>
                      {restoring === v.numeroVersion ? 'Restauration...' : 'Restaurer'}
                    </button>
                  ) : (
                    <span style={{
                      padding: '7px 14px', borderRadius: 8,
                      background: '#f0fdf4', color: '#16a34a',
                      fontSize: 12.5, fontWeight: 600,
                    }}>
                      ✓ Version courante
                    </span>
                  )}
                  <span style={{
                    fontFamily: 'monospace', fontSize: 10.5, color: '#94a3b8',
                  }} title={v.sha256}>
                    SHA-256: {v.sha256.substring(0, 12)}…
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}