import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, Download, Eye, FilePen, FolderOpen, User, X, Trash2 } from "lucide-react";
import API from "../api/auth";
import AppLayout from "../components/AppLayout";
import { formatRelativeTime } from '../utils/formatTime';
import { isEditable, getFileTypeColor } from '../utils/fileType';

const actionBtnStyle = {
  background: 'var(--wings-surface)',
  border: '0.5px solid var(--wings-border)',
  borderRadius: 6,
  padding: '5px 7px',
  color: 'var(--wings-text-muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

const filterSelectStyle = {
  padding: '8px 12px',
  background: 'var(--wings-surface)',
  border: '0.5px solid var(--wings-border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--wings-text)',
  cursor: 'pointer',
  outline: 'none',
};

export default function SharedWithMe() {
  const navigate = useNavigate();
  const [fichiers, setFichiers]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [filtrePerms, setFiltrePerms] = useState("all");
  const [filtreDates, setFiltreDates] = useState("all");
  const [searchOwner, setSearchOwner] = useState("");
  const [shareModal, setShareModal]   = useState(null);
  const [toast, setToast]             = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFichiers((await API.get("/files/shared-with-me")).data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownload = async (f) => {
    try {
      const res = await API.get(`/files/${f.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement("a");
      a.href = url; a.download = f.nom; a.click();
      URL.revokeObjectURL(url);
      showToast(`"${f.nom}" téléchargé`);
    } catch (e) { showToast(e.response?.data?.error || e.message, "error"); }
  };

  const handleDelete = async (f) => {
  if (!window.confirm(`Retirer "${f.nom}" de vos partages ?`)) return;
  try {
    await API.delete(`/files/${f.id}`);
    setFichiers(prev => prev.filter(x => x.id !== f.id));
    showToast(`"${f.nom}" retiré de vos partages`);
  } catch (e) {
    showToast(e.response?.data?.error || e.message, "error");
  }
};

  const affichés = fichiers.filter(f => {
    const perms = f.mes_permissions || {};
    if (filtrePerms === "lecture"  && !perms.lecture)  return false;
    if (filtrePerms === "download" && !perms.download) return false;
    if (filtrePerms === "ecriture" && !perms.ecriture) return false;
    const owner = (f.proprietaire_nom || "").toLowerCase();
    if (searchOwner && !owner.includes(searchOwner.toLowerCase())) return false;
    if (filtreDates === "today") {
      const iso = f.date_creation;
      const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
      const now = new Date();
      if (d.toDateString() !== now.toDateString()) return false;
    }
    if (filtreDates === "week") {
      const d = new Date(f.date_creation);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      if (d < cutoff) return false;
    }
    return true;
  });

  if (loading) return <AppLayout><LoadingState /></AppLayout>;
  if (error)   return <AppLayout><ErrorState msg={error} onRetry={load} /></AppLayout>;

  return (
    <AppLayout>
      <div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}

        {/* Barre de filtres */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <select
            style={filterSelectStyle}
            value={filtrePerms}
            onChange={e => setFiltrePerms(e.target.value)}
          >
            <option value="all">Toutes les permissions</option>
            <option value="lecture">Lecture</option>
            <option value="download">Téléchargement</option>
            <option value="ecriture">Écriture</option>
          </select>

          <select
            style={filterSelectStyle}
            value={filtreDates}
            onChange={e => setFiltreDates(e.target.value)}
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
          </select>

          <input
            style={{
              ...filterSelectStyle,
              flex: 1, minWidth: 200,
              cursor: 'text',
            }}
            placeholder="Rechercher par propriétaire..."
            value={searchOwner}
            onChange={e => setSearchOwner(e.target.value)}
          />
        </div>

        {/* Grille de fichiers */}
        {affichés.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 72, paddingBottom: 72 }}>
            <Share2
              size={40}
              style={{ color: 'var(--wings-text-muted)', opacity: 0.4, margin: '0 auto 12px', display: 'block' }}
            />
            <p style={{ fontSize: 14, color: 'var(--wings-text-muted)', margin: '0 0 4px' }}>Aucun fichier partagé</p>
            <p style={{ fontSize: 12, color: 'var(--wings-text-muted)', opacity: 0.6, margin: 0 }}>
              Les fichiers que l'on partage avec vous apparaîtront ici
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {affichés.map(f => (
              <FileCard
                key={f.id}
                fichier={f}
                onDownload={() => handleDownload(f)}
                onShare={() => setShareModal(f)}
                onEdit={() => navigate(`/editor?fileId=${f.id}`)}
                onApercu={() => navigate(`/editor?fileId=${f.id}&mode=read`)}
                onDelete={() => handleDelete(f)}
              />

            ))}
          </div>
        )}

        {shareModal && (
          <ShareModal
            fichier={shareModal}
            onClose={() => setShareModal(null)}
            onSuccess={(msg) => { showToast(msg); setShareModal(null); }}
          />
        )}
      </div>
    </AppLayout>
  );
}

// ── Carte fichier ─────────────────────────────────────────────────

function FileCard({ fichier, onDownload, onShare, onEdit, onApercu, onDelete }) {
  const perms  = fichier.mes_permissions || {};
  const ftColor = getFileTypeColor(fichier.nom);
  const ext    = fichier.nom?.split('.').pop()?.toUpperCase() || 'FILE';
  const taille = Number(fichier.taille) || 0;
  const sizeStr = taille < 0.01
    ? `${(taille * 1024).toFixed(0)} KB`
    : `${taille.toFixed(1)} MB`;

  return (
    <div style={{
      background: 'var(--wings-surface)',
      border: '0.5px solid var(--wings-border)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Badge extension + badge source */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{
          fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
          padding: '3px 8px',
          background: ftColor.bg,
          color: ftColor.color,
          borderRadius: 6,
        }}>{ext}</span>

        {fichier.source === 'espace' ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 600,
            padding: '2px 7px',
            background: 'rgba(79,139,255,0.1)',
            color: 'var(--wings-blue)',
            borderRadius: 999,
          }}>
            <FolderOpen size={10} />
            {fichier.espace_nom || 'Espace'}
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 600,
            padding: '2px 7px',
            background: 'rgba(255,193,7,0.1)',
            color: 'var(--wings-gold)',
            borderRadius: 999,
          }}>
            <User size={10} />
            Direct
          </span>
        )}
      </div>

      {/* Nom + infos */}
      <div>
        <p style={{
          fontSize: 13, fontWeight: 500,
          color: 'var(--wings-text)',
          margin: '0 0 4px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={fichier.nom}>{fichier.nom}</p>
        <p style={{ fontSize: 11, color: 'var(--wings-text-muted)', margin: 0 }}>
          Partagé par {fichier.proprietaire_nom || '—'} · {sizeStr}
        </p>
        <p style={{ fontSize: 11, color: 'var(--wings-text-muted)', opacity: 0.7, margin: '2px 0 0' }}>
          {formatRelativeTime(fichier.date_creation)}
        </p>
      </div>

      {/* Permissions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {perms.lecture  && <PermBadge label="Lecture" />}
        {perms.download && <PermBadge label="Téléchargement" />}
        {perms.ecriture && <PermBadge label="Écriture" />}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
        {isEditable(fichier.nom) && (
          <button onClick={onApercu} title="Aperçu" style={actionBtnStyle}>
            <Eye size={13} />
          </button>
        )}
        {isEditable(fichier.nom) && perms.ecriture && (
          <button onClick={onEdit} title="Éditer" style={actionBtnStyle}>
            <FilePen size={13} />
          </button>
        )}
        {perms.download && (
          <button onClick={onDownload} title="Télécharger" style={actionBtnStyle}>
            <Download size={13} />
          </button>
        )}
        {perms.partage && (
          <button onClick={onShare} title="Partager" style={actionBtnStyle}>
            <Share2 size={13} />
          </button>
        )}

        {/* ✅ AJOUT : bouton supprimer — toujours visible */}
          <button onClick={onDelete} title="Retirer de mes partages" style={{ ...actionBtnStyle, color: '#e57373' }}>
            <Trash2 size={13} />
          </button>
      </div>
    </div>
  );
}

function PermBadge({ label }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px',
      background: 'rgba(168,180,212,0.1)',
      color: 'var(--wings-text-muted)',
      borderRadius: 999,
      border: '0.5px solid var(--wings-border)',
    }}>{label}</span>
  );
}

// ── Modale de partage ─────────────────────────────────────────────

export function ShareModal({ fichier, onClose, onSuccess }) {
  const [search, setSearch]         = useState("");
  const [results, setResults]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [loadingU, setLoadingU]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [perms, setPerms] = useState({
    lecture: true, download: true, ecriture: false,
    suppression: false, partage: false,
  });

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoadingU(true);
      try {
        setResults((await API.get(`/users/search?q=${encodeURIComponent(search)}`)).data);
      } catch { setResults([]); }
      finally { setLoadingU(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await API.post(`/files/${fichier.id}/share`, { target_user_id: selected.id, permissions: perms });
      onSuccess?.(`Fichier partagé avec ${selected.nom}`);
    } catch (e) { onSuccess?.(e.message, "error"); }
    finally { setSubmitting(false); }
  };

  const PERMS_AFFICHÉES = [
    { key: 'lecture',  label: 'Lecture' },
    { key: 'download', label: 'Téléchargement' },
    { key: 'ecriture', label: 'Écriture' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 440,
          background: 'var(--wings-surface)',
          border: '0.5px solid var(--wings-border)',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '0.5px solid var(--wings-border)',
        }}>
          <h2 style={{
            fontFamily: 'Georgia, serif',
            fontSize: 20, fontWeight: 400,
            color: 'var(--wings-text)',
            margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            paddingRight: 16,
          }}>
            Partager &laquo;&nbsp;{fichier.nom}&nbsp;&raquo;
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--wings-text-muted)', padding: 6,
              borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recherche */}
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'monospace',
              fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--wings-gold)',
              marginBottom: 8,
            }}>
              Destinataire
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px',
                  background: 'var(--wings-bg)',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 8,
                  color: 'var(--wings-text)',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                placeholder="Rechercher un utilisateur..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); }}
                onFocus={e => { e.target.style.borderColor = 'var(--wings-blue)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--wings-border)'; }}
                autoFocus
              />
              {search.length >= 2 && !selected && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  marginTop: 4,
                  background: 'var(--wings-surface)',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  zIndex: 10,
                  maxHeight: 176, overflowY: 'auto',
                }}>
                  {loadingU && (
                    <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--wings-text-muted)', textAlign: 'center' }}>Recherche…</div>
                  )}
                  {!loadingU && results.length === 0 && (
                    <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--wings-text-muted)', textAlign: 'center' }}>Aucun résultat</div>
                  )}
                  {results.map(u => (
                    <button
                      key={u.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '10px 14px',
                        background: 'transparent', border: 'none',
                        borderBottom: '0.5px solid var(--wings-border)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,139,255,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => { setSelected(u); setSearch(u.nom); setResults([]); }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--wings-blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {u.nom[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)' }}>{u.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--wings-text-muted)' }}>{u.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginTop: 8, padding: '10px 12px',
                background: 'rgba(79,139,255,0.06)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--wings-blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {selected.nom[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)' }}>{selected.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--wings-text-muted)' }}>{selected.email}</div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wings-text-muted)', padding: 4, display: 'flex', transition: 'color 0.15s' }}
                  onClick={() => { setSelected(null); setSearch(""); }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'monospace',
              fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--wings-gold)',
              marginBottom: 10,
            }}>
              Permissions
            </label>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {PERMS_AFFICHÉES.map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '0.5px solid var(--wings-border)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--wings-text)' }}>{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={perms[key]}
                    onClick={() => setPerms(p => ({ ...p, [key]: !p[key] }))}
                    style={{
                      position: 'relative',
                      width: 36, height: 20,
                      borderRadius: 999,
                      border: 'none', cursor: 'pointer',
                      background: perms[key] ? 'var(--wings-blue)' : 'rgba(168,180,212,0.2)',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 2,
                      left: perms[key] ? 18 : 2,
                      width: 16, height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      transition: 'left 0.2s',
                      display: 'block',
                    }} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Pied */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '14px 24px',
          borderTop: '0.5px solid var(--wings-border)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', fontSize: 13,
              background: 'transparent',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 999,
              color: 'var(--wings-text-muted)',
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--wings-text-muted)';
              e.currentTarget.style.color = 'var(--wings-text)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--wings-border)';
              e.currentTarget.style.color = 'var(--wings-text-muted)';
            }}
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!selected || submitting}
            style={{
              padding: '8px 24px', fontSize: 13, fontWeight: 500,
              background: 'var(--wings-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              cursor: !selected || submitting ? 'not-allowed' : 'pointer',
              opacity: !selected || submitting ? 0.5 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (selected && !submitting) e.currentTarget.style.background = 'var(--wings-blue-dark)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--wings-blue)'; }}
          >
            {submitting ? "Envoi…" : "Partager"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composants utilitaires ────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
        Chargement…
      </div>
    </div>
  );
}

function ErrorState({ msg, onRetry }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#e57373', marginBottom: 16, fontSize: 14 }}>{msg}</p>
        <button
          onClick={onRetry}
          style={{
            padding: '8px 20px',
            background: 'var(--wings-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '10px 18px', borderRadius: 8,
      background: type === 'error' ? '#dc2626' : '#059669',
      color: '#fff', fontWeight: 600, fontSize: 14,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      {msg}
    </div>
  );
}
