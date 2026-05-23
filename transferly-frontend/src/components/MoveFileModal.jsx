import { useState } from 'react';
import { Home, Folder, ChevronRight, ChevronDown, X } from 'lucide-react';
import API from '../api/auth';

// Construit un arbre depuis un tableau plat
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

function FolderOption({ node, level, selectedTarget, onSelect, expandedIds, onToggle }) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedTarget === node.id;

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: `6px 10px 6px ${level * 16 + 10}px`,
          borderRadius: '6px',
          cursor: 'pointer',
          background: isSelected ? 'rgba(79,139,255,0.12)' : 'transparent',
          color: isSelected ? 'var(--wings-text)' : 'var(--wings-text-muted)',
          fontSize: '13px',
          transition: 'background 0.12s, color 0.12s',
        }}
        className="move-folder-option"
      >
        <span
          style={{ width: 14, flexShrink: 0, display: 'flex', alignItems: 'center' }}
          onClick={e => { e.stopPropagation(); onToggle(node.id); }}
        >
          {hasChildren
            ? isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />
            : null}
        </span>
        <Folder size={14} style={{ color: 'var(--wings-gold)', opacity: 0.8, flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.nom}
        </span>
      </div>
      {hasChildren && isExpanded && node.children.map(child => (
        <FolderOption
          key={child.id}
          node={child}
          level={level + 1}
          selectedTarget={selectedTarget}
          onSelect={onSelect}
          expandedIds={expandedIds}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

export default function MoveFileModal({ isOpen, file, folders, currentFolderId, onClose, onMoved }) {
  const [selectedTarget, setSelectedTarget] = useState(currentFolderId);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  if (!isOpen || !file) return null;

  const tree = buildTree(folders);

  const handleToggle = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMove = async () => {
    setLoading(true);
    try {
      await API.put('/folders/move-file', {
        fichier_id: file.id,
        folder_id: selectedTarget,
      });
      onMoved(selectedTarget);
      onClose();
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur lors du déplacement');
    } finally {
      setLoading(false);
    }
  };

  const isSameLocation = selectedTarget === currentFolderId;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--wings-surface)',
          border: '0.5px solid var(--wings-border)',
          borderRadius: '16px',
          padding: '28px',
        }}
      >
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div>
            <h2 style={{
              fontFamily: 'Georgia, serif',
              fontSize: '22px',
              fontWeight: 400,
              color: 'var(--wings-text)',
              margin: 0,
            }}>
              Déplacer le fichier
            </h2>
            <p style={{
              fontSize: '12px',
              color: 'var(--wings-text-muted)',
              fontStyle: 'italic',
              marginTop: '4px',
            }}>
              {file.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--wings-text-muted)', padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Séparateur */}
        <div style={{ height: '0.5px', background: 'var(--wings-border)', margin: '16px 0' }} />

        {/* Liste des dossiers */}
        <div style={{
          maxHeight: '280px', overflowY: 'auto',
          border: '0.5px solid var(--wings-border)',
          borderRadius: '8px',
          padding: '6px',
        }}>
          {/* Racine */}
          <div
            onClick={() => setSelectedTarget(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: selectedTarget === null ? 'rgba(79,139,255,0.12)' : 'transparent',
              color: selectedTarget === null ? 'var(--wings-text)' : 'var(--wings-text-muted)',
              fontSize: '13px',
              transition: 'background 0.12s',
            }}
            className="move-folder-option"
          >
            <Home size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
            <span>Racine</span>
          </div>

          {/* Arborescence */}
          {tree.map(node => (
            <FolderOption
              key={node.id}
              node={node}
              level={0}
              selectedTarget={selectedTarget}
              onSelect={setSelectedTarget}
              expandedIds={expandedIds}
              onToggle={handleToggle}
            />
          ))}

          {tree.length === 0 && (
            <p style={{
              textAlign: 'center', fontSize: '11px',
              color: 'var(--wings-text-muted)', opacity: 0.5,
              padding: '16px 0',
            }}>
              Aucun dossier disponible
            </p>
          )}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              border: '0.5px solid var(--wings-border)',
              borderRadius: '8px',
              background: 'transparent',
              color: 'var(--wings-text-muted)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleMove}
            disabled={isSameLocation || loading}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '8px',
              background: isSameLocation || loading ? 'rgba(79,139,255,0.3)' : 'var(--wings-blue)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isSameLocation || loading ? 'not-allowed' : 'pointer',
              opacity: isSameLocation || loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Déplacement…' : 'Déplacer ici'}
          </button>
        </div>
      </div>

      <style>{`
        .move-folder-option:hover {
          background: rgba(79, 139, 255, 0.05) !important;
          color: var(--wings-text) !important;
        }
      `}</style>
    </div>
  );
}
