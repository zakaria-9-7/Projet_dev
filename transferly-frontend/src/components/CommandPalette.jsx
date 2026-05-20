/**
 * CommandPalette — Ctrl+K / Cmd+K global search
 * Searches files, espaces, and users simultaneously.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, FolderOpen, User, ArrowRight, X } from 'lucide-react';
import API from '../api/auth';

// ── Result type config ────────────────────────────────────────────
const TYPE_META = {
  file:   { label: 'Fichier',    color: 'text-cyan-600 dark:text-cyan-400',   bg: 'bg-cyan-50 dark:bg-cyan-900/30',   Icon: FileText  },
  espace: { label: 'Espace',     color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30', Icon: FolderOpen },
  user:   { label: 'Utilisateur', color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/30',  Icon: User      },
};

function fileIcon(nom) {
  const ext = (nom || '').split('.').pop().toLowerCase();
  const map = { pdf: '📄', jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼',
                xlsx: '📊', xls: '📊', csv: '📊', doc: '📝', docx: '📝',
                zip: '🗜', rar: '🗜', mp4: '🎬', mp3: '🎵', pptx: '📊', ppt: '📊',
                txt: '📃', md: '📃', js: '💻', py: '💻', json: '💻' };
  return map[ext] || '📄';
}

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);
  const navigate  = useNavigate();
  const role      = localStorage.getItem('role') || 'Utilisateur';
  const isAdmin   = role === 'AdminGlobal';

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return; }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = encodeURIComponent(query.trim());

        // Run all searches in parallel; each may fail independently
        const [filesRes, espacesRes, usersRes] = await Promise.allSettled([
          API.get('/files/').then(r => {
            const files = r.data.files ?? r.data ?? [];
            const lower = query.toLowerCase();
            return files
              .filter(f => f.nom.toLowerCase().includes(lower))
              .slice(0, 5)
              .map(f => ({
                type: 'file',
                id: f.id,
                label: f.nom,
                sub: f.taille ? `${(f.taille / 1024).toFixed(1)} KB` : null,
                action: () => navigate(`/files`),
              }));
          }),
          API.get('/espaces/all-mine').then(r => {
            const lower = query.toLowerCase();
            return (r.data ?? [])
              .filter(e => e.nom.toLowerCase().includes(lower))
              .slice(0, 5)
              .map(e => ({
                type: 'espace',
                id: e.id,
                label: e.nom,
                sub: e.role === 'admin' ? 'Admin' : 'Membre',
                action: () => navigate(`/espace/${e.id}`),
              }));
          }),
          // Users search only for admins or when query is long enough
          (isAdmin || query.length >= 2)
            ? API.get(`/users/search?q=${q}`).then(r =>
                (r.data ?? []).slice(0, 5).map(u => ({
                  type: 'user',
                  id: u.id,
                  label: u.nom || u.email,
                  sub: u.email,
                  action: () => isAdmin ? navigate('/admin-users') : null,
                }))
              )
            : Promise.resolve([]),
        ]);

        const merged = [
          ...(filesRes.status   === 'fulfilled' ? filesRes.value   : []),
          ...(espacesRes.status === 'fulfilled' ? espacesRes.value : []),
          ...(usersRes.status   === 'fulfilled' ? usersRes.value   : []),
        ];

        setResults(merged);
        setActiveIdx(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isAdmin, navigate]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const handleSelect = useCallback((item) => {
    item.action?.();
    onClose();
  }, [onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIdx]) handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un fichier, espace, utilisateur…"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1" ref={listRef}>
          {/* Empty state */}
          {!query && (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
              Tapez pour rechercher des fichiers, espaces ou utilisateurs
            </div>
          )}

          {/* Loading */}
          {query && loading && (
            <div className="py-8 text-center text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
              Recherche en cours…
            </div>
          )}

          {/* No results */}
          {query && !loading && results.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">
              Aucun résultat pour <span className="font-medium text-slate-600 dark:text-slate-300">"{query}"</span>
            </div>
          )}

          {/* Result groups */}
          {!loading && results.length > 0 && (() => {
            const groups = ['file', 'espace', 'user'];
            return groups.map(type => {
              const items = results.filter(r => r.type === type);
              if (items.length === 0) return null;
              const meta = TYPE_META[type];
              return (
                <div key={type}>
                  {/* Group header */}
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    {meta.label}s
                  </div>
                  {items.map((item) => {
                    const globalIdx = results.indexOf(item);
                    const isActive  = globalIdx === activeIdx;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onMouseEnter={() => setActiveIdx(globalIdx)}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0 ${
                          isActive
                            ? 'bg-cyan-50 dark:bg-cyan-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${meta.bg}`}>
                          {item.type === 'file'
                            ? <span>{fileIcon(item.label)}</span>
                            : <meta.Icon className={`w-4 h-4 ${meta.color}`} />
                          }
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.label}
                          </p>
                          {item.sub && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {item.sub}
                            </p>
                          )}
                        </div>

                        {/* Type badge + arrow */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                          {isActive && <ArrowRight className="w-3.5 h-3.5 text-cyan-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">↑↓</kbd>
            naviguer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">↵</kbd>
            ouvrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">Esc</kbd>
            fermer
          </span>
        </div>
      </div>
    </div>
  );
}
