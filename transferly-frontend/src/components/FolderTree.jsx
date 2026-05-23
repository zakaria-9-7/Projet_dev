import { useState, useEffect } from 'react';
import { Home, Folder, ChevronRight, ChevronDown, Plus, MoreVertical, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import API from '../api/auth';
import './FolderTree.css';

function buildTree(folders) {
  const map = {};
  folders.forEach(f => { map[f.id] = { ...f, children: [] }; });
  const roots = [];
  folders.forEach(f => {
    if (f.parent_id != null && map[f.parent_id]) {
      map[f.parent_id].children.push(map[f.id]);
    } else {
      roots.push(map[f.id]);
    }
  });
  return roots;
}

function FolderNode({ node, level, selectedFolderId, expandedFolders, onToggle, onSelect, onKebabClick }) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedFolders.has(node.id);
  const isActive = selectedFolderId === node.id;

  return (
    <div>
      <div
        className={`ft-item${isActive ? ' active' : ''}`}
        style={{ padding: `4px 6px 4px ${level * 14 + 6}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Caret ouvre/ferme */}
        <span
          style={{ width: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { e.stopPropagation(); onToggle(node.id); }}
        >
          {hasChildren
            ? isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />
            : null}
        </span>

        <Folder size={14} style={{ opacity: 0.8, flexShrink: 0 }} />

        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {node.nom}
        </span>

        {/* Kebab ⋮ */}
        <button
          className="ft-kebab-btn"
          title="Actions"
          onClick={e => { e.stopPropagation(); onKebabClick(e, node.id); }}
        >
          <MoreVertical size={12} />
        </button>
      </div>

      {hasChildren && isExpanded && node.children.map(child => (
        <FolderNode
          key={child.id}
          node={child}
          level={level + 1}
          selectedFolderId={selectedFolderId}
          expandedFolders={expandedFolders}
          onToggle={onToggle}
          onSelect={onSelect}
          onKebabClick={onKebabClick}
        />
      ))}
    </div>
  );
}

export default function FolderTree({
  folders, selectedFolderId, onSelect, onCreateFolder,
  onFolderCreated, onFolderUpdated, onFolderDeleted,
}) {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [openMenuId,      setOpenMenuId]      = useState(null);
  const [menuPos,         setMenuPos]         = useState({ top: 0, left: 0 });

  // Ferme le menu au clic extérieur
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  const handleToggle = (id) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleKebabClick = (e, folderId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 2, left: rect.right - 182 });
    setOpenMenuId(prev => prev === folderId ? null : folderId);
  };

  const menuFolder = folders.find(f => f.id === openMenuId);

  const handleNewSubfolder = async (e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!menuFolder) return;
    const nom = prompt('Nom du sous-dossier ?');
    if (!nom?.trim()) return;
    try {
      const res = await API.post('/folders', { nom: nom.trim(), parent_id: menuFolder.id });
      onFolderCreated?.(res.data);
    } catch {
      alert('Erreur création sous-dossier');
    }
  };

  const handleRename = async (e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!menuFolder) return;
    const newNom = prompt('Nouveau nom ?', menuFolder.nom);
    if (!newNom?.trim() || newNom.trim() === menuFolder.nom) return;
    try {
      await API.put(`/folders/${menuFolder.id}`, { nom: newNom.trim() });
      onFolderUpdated?.(menuFolder.id, newNom.trim());
    } catch {
      alert('Erreur renommage');
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!menuFolder) return;
    if (!confirm(`Supprimer "${menuFolder.nom}" ?\n\nLes fichiers et sous-dossiers seront déplacés à la racine.`)) return;
    try {
      await API.delete(`/folders/${menuFolder.id}`);
      onFolderDeleted?.(menuFolder.id);
    } catch {
      alert('Erreur suppression');
    }
  };

  const tree = buildTree(folders);

  return (
    <div style={{
      width: '220px',
      flexShrink: 0,
      background: 'var(--wings-surface)',
      borderRight: '0.5px solid var(--wings-border)',
      padding: '16px 8px',
      overflowY: 'auto',
    }}>
      {/* En-tête */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 6px 10px',
      }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '10px',
          letterSpacing: '2px',
          color: 'var(--wings-gold)',
          opacity: 0.8,
          textTransform: 'uppercase',
        }}>
          Dossiers
        </span>
        <button
          onClick={() => onCreateFolder(null)}
          title="Nouveau dossier à la racine"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--wings-gold)', opacity: 0.8,
            display: 'flex', alignItems: 'center', padding: '2px',
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Item Racine */}
      <div
        className={`ft-item${selectedFolderId === null ? ' active' : ''}`}
        style={{ padding: '4px 6px' }}
        onClick={() => onSelect(null)}
      >
        <Home size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
        <span style={{ marginLeft: 4 }}>Racine</span>
      </div>

      {/* Arborescence */}
      {tree.map(node => (
        <FolderNode
          key={node.id}
          node={node}
          level={0}
          selectedFolderId={selectedFolderId}
          expandedFolders={expandedFolders}
          onToggle={handleToggle}
          onSelect={onSelect}
          onKebabClick={handleKebabClick}
        />
      ))}

      {tree.length === 0 && (
        <div style={{
          fontSize: '10px',
          color: 'var(--wings-text-muted)',
          opacity: 0.5,
          textAlign: 'center',
          paddingTop: '16px',
        }}>
          Aucun dossier
        </div>
      )}

      {/* Dropdown menu (position: fixed pour passer les overflow) */}
      {openMenuId && menuFolder && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 100,
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: '8px',
            padding: '4px',
            minWidth: '180px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <button className="ft-menu-item" onClick={handleNewSubfolder}>
            <FolderPlus size={14} style={{ color: 'var(--wings-blue)', flexShrink: 0 }} />
            Nouveau sous-dossier
          </button>
          <button className="ft-menu-item" onClick={handleRename}>
            <Pencil size={14} style={{ color: 'var(--wings-blue)', flexShrink: 0 }} />
            Renommer
          </button>
          <button className="ft-menu-item ft-menu-item--danger" onClick={handleDelete}>
            <Trash2 size={14} style={{ flexShrink: 0 }} />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
