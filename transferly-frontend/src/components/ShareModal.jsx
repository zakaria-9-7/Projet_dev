/**
 * IE-07 — Page "Fichiers partagés avec moi"
 * Fichier : frontend/src/pages/SharedWithMe.jsx
 *
 * Fidèle au prototype Figma : tableau avec colonnes
 * Nom du fichier | Partagé par | Date de partage | Permissions | Actions
 * Filtres : Toutes les permissions · Toutes les dates · Recherche par propriétaire
 */

import { useState, useEffect, useCallback } from "react";
import { formatRelativeTime as relativeDate } from '../utils/formatDate';
// ── Design tokens (fidèle au prototype : blanc/cyan/gris) ─────────
const C = {
  primary: "#00BCD4",      // cyan Transferly
  primaryDark: "#0097A7",
  primaryLight: "#E0F7FA",
  bg: "#F8F9FA",
  card: "#FFFFFF",
  ink: "#212121",
  muted: "#757575",
  line: "#E0E0E0",
  red: "#F44336",
  green: "#4CAF50",
  sidebar: "#FFFFFF",
  sidebarActive: "#E0F7FA",
  sidebarActiveBorder: "#00BCD4",
};

// Badges de permissions (fidèles au prototype)
const PERM_BADGES = {
  lecture:      { label: "Lecture",   color: "#E3F2FD", text: "#1565C0" },
  ecriture:     { label: "Écriture",  color: "#E8F5E9", text: "#2E7D32" },
  partage:      { label: "Partage",   color: "#FFF3E0", text: "#E65100" },
  download:     { label: "Téléchargement", color: "#F3E5F5", text: "#6A1B9A" },
  suppression:  { label: "Suppression",   color: "#FFEBEE", text: "#B71C1C" },
  upload:       { label: "Upload",         color: "#E8F5E9", text: "#1B5E20" },
};

const API = async (path, options = {}) => {
  const token = localStorage.getItem("jwt_token");
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export default function SharedWithMe() {
  const [fichiers, setFichiers]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [filtrePerms, setFiltrePerms]   = useState("all");
  const [filtreDates, setFiltreDates]   = useState("all");
  const [searchOwner, setSearchOwner]   = useState("");
  const [shareModal, setShareModal]     = useState(null);
  const [toast, setToast]               = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFichiers(await API("/files/shared-with-me"));
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
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`/api/files/${f.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Téléchargement refusé");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = f.nom; a.click();
      URL.revokeObjectURL(url);
      showToast(`"${f.nom}" téléchargé`);
    } catch (e) { showToast(e.message, "error"); }
  };

  // Filtrage selon le prototype
  const affichés = fichiers.filter(f => {
    const perms = f.mes_permissions || {};
    if (filtrePerms === "lecture"  && !perms.lecture)  return false;
    if (filtrePerms === "ecriture" && !perms.ecriture) return false;
    if (filtrePerms === "partage"  && !perms.partage)  return false;
    const owner = (f.proprietaire_nom || "").toLowerCase();
    if (searchOwner && !owner.includes(searchOwner.toLowerCase())) return false;
    if (filtreDates === "today") {
      const d = new Date(f.date_creation);
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

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState msg={error} onRetry={load} />;

  return (
    <div style={S.page}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* En-tête */}
      <div style={S.pageHeader}>
        <h1 style={S.pageTitle}>Fichiers partagés avec moi</h1>
        <p style={S.pageSubtitle}>
          Fichiers que d&apos;autres utilisateurs ont partagé avec vous
        </p>
      </div>

      {/* Barre de filtres — fidèle au prototype */}
      <div style={S.filterBar}>
        {/* Filtre permissions */}
        <select
          style={S.filterSelect}
          value={filtrePerms}
          onChange={e => setFiltrePerms(e.target.value)}
        >
          <option value="all">Toutes les permissions</option>
          <option value="lecture">Lecture</option>
          <option value="ecriture">Écriture</option>
          <option value="partage">Partage</option>
        </select>

        {/* Filtre dates */}
        <select
          style={S.filterSelect}
          value={filtreDates}
          onChange={e => setFiltreDates(e.target.value)}
        >
          <option value="all">Toutes les dates</option>
          <option value="today">Aujourd&apos;hui</option>
          <option value="week">Cette semaine</option>
        </select>

        {/* Recherche par propriétaire */}
        <input
          style={S.searchInput}
          placeholder="Rechercher par propriétaire..."
          value={searchOwner}
          onChange={e => setSearchOwner(e.target.value)}
        />
      </div>

      {/* Tableau — fidèle au prototype */}
      <div style={S.tableCard}>
        {affichés.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 600 }}>Aucun fichier partagé</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
              Les fichiers partagés avec vous apparaîtront ici.
            </div>
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr style={S.theadRow}>
                <th style={S.th}>Nom du fichier</th>
                <th style={S.th}>Partagé par</th>
                <th style={S.th}>Date de partage</th>
                <th style={S.th}>Permissions</th>
                <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {affichés.map((f, i) => (
                <FichierRow
                  key={f.id}
                  fichier={f}
                  isLast={i === affichés.length - 1}
                  onDownload={() => handleDownload(f)}
                  onShare={() => setShareModal(f)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {shareModal && (
        <ShareModal
          fichier={shareModal}
          onClose={() => setShareModal(null)}
          onSuccess={(msg) => { showToast(msg); setShareModal(null); }}
        />
      )}
    </div>
  );
}

// ── Ligne tableau ─────────────────────────────────────────────────

function FichierRow({ fichier, isLast, onDownload, onShare }) {
  const perms = fichier.mes_permissions || {};
  const activePerms = Object.entries(perms)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <tr style={{ ...S.tr, borderBottom: isLast ? "none" : `1px solid ${C.line}` }}>
      {/* Nom */}
      <td style={S.td}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={S.fileIcon}>{fileIcon(fichier.nom)}</span>
          <span style={{ fontWeight: 500, fontSize: 14, color: C.ink }}>
            {fichier.nom}
          </span>
        </div>
      </td>

      {/* Partagé par */}
      <td style={S.td}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            ...S.avatar,
            background: avatarColor(fichier.proprietaire_nom || "?"),
          }}>
            {(fichier.proprietaire_nom || "?")[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 14 }}>{fichier.proprietaire_nom || "—"}</span>
        </div>
      </td>

      {/* Date */}
      <td style={{ ...S.td, color: C.muted, fontSize: 13 }}>
        {relativeDate(fichier.date_creation)}
      </td>

      {/* Permissions — badges fidèles au prototype */}
      <td style={S.td}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {activePerms.length === 0
            ? <span style={{ color: C.muted, fontSize: 12 }}>Aucune</span>
            : activePerms.map(p => {
              const badge = PERM_BADGES[p];
              if (!badge) return null;
              return (
                <span key={p} style={{
                  ...S.permBadge,
                  background: badge.color,
                  color: badge.text,
                }}>
                  {badge.label}
                </span>
              );
            })
          }
        </div>
      </td>

      {/* Actions */}
      <td style={{ ...S.td, textAlign: "right" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {perms.download && (
            <button style={S.actionIconBtn} onClick={onDownload} title="Télécharger">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </button>
          )}
          {perms.partage && (
            <button style={S.actionIconBtn} onClick={onShare} title="Partager">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════
// COMPOSANT SHAREMODAL (export nommé)
// ══════════════════════════════════════════════════════════════════

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
        setResults(await API(`/users/search?q=${encodeURIComponent(search)}`));
      } catch { setResults([]); }
      finally { setLoadingU(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await API(`/files/${fichier.id}/share`, {
        method: "POST",
        body: JSON.stringify({ target_user_id: selected.id, permissions: perms }),
      });
      onSuccess?.(`Fichier partagé avec ${selected.nom} ✓`);
    } catch (e) { onSuccess?.(e.message, "error"); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={SM.overlay} onClick={onClose}>
      <div style={SM.modal} onClick={e => e.stopPropagation()}>
        <div style={SM.header}>
          <div style={SM.title}>Partager "{fichier.nom}"</div>
          <button style={SM.close} onClick={onClose}>✕</button>
        </div>

        {/* Recherche */}
        <div style={SM.section}>
          <div style={SM.label}>Destinataire</div>
          <input style={SM.input} placeholder="Rechercher un utilisateur..."
            value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} autoFocus />
          {search.length >= 2 && !selected && (
            <div style={SM.dropdown}>
              {loadingU && <div style={SM.dropMsg}>Recherche…</div>}
              {!loadingU && results.length === 0 && <div style={SM.dropMsg}>Aucun résultat</div>}
              {results.map(u => (
                <div key={u.id} style={SM.dropItem} onClick={() => { setSelected(u); setSearch(u.nom); setResults([]); }}>
                  <div style={{ ...SM.avatar, background: avatarColor(u.nom) }}>{u.nom[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.nom}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selected && (
            <div style={SM.selectedUser}>
              <div style={{ ...SM.avatar, background: avatarColor(selected.nom) }}>{selected.nom[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{selected.nom}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{selected.email}</div>
              </div>
              <button style={SM.clearBtn} onClick={() => { setSelected(null); setSearch(""); }}>✕</button>
            </div>
          )}
        </div>

        {/* Permissions */}
        <div style={SM.section}>
          <div style={SM.label}>Permissions</div>
          {Object.entries(PERM_BADGES).filter(([k]) => k !== "upload" && k !== "suppression").map(([key, badge]) => (
            <label key={key} style={SM.permRow}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ ...SM.permChip, background: badge.color, color: badge.text }}>
                  {badge.label}
                </span>
              </div>
              <div style={{ ...SM.toggle, background: perms[key] ? C.primary : C.line }}
                onClick={() => setPerms(p => ({ ...p, [key]: !p[key] }))}>
                <div style={{ ...SM.knob, transform: perms[key] ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </label>
          ))}
        </div>

        <div style={SM.footer}>
          <button style={SM.cancelBtn} onClick={onClose}>Annuler</button>
          <button style={{ ...SM.submitBtn, opacity: !selected || submitting ? 0.5 : 1 }}
            onClick={submit} disabled={!selected || submitting}>
            {submitting ? "Envoi…" : "Partager"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Petits composants ─────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
      <div style={{ textAlign:"center", color: C.muted }}>
        <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
        Chargement…
      </div>
    </div>
  );
}

function ErrorState({ msg, onRetry }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ color: C.red, marginBottom:16 }}>{msg}</div>
        <button style={{ ...S.primaryBtn }} onClick={onRetry}>Réessayer</button>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:9999,
      padding:"12px 20px", borderRadius:8,
      background: type === "error" ? C.red : C.green,
      color:"#fff", fontWeight:600, fontSize:14,
      boxShadow:"0 4px 16px rgba(0,0,0,.15)",
    }}>
      {type === "error" ? "✕" : "✓"} {msg}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function fileIcon(nom) {
  const ext = (nom || "").split(".").pop().toLowerCase();
  const map = { pdf:"📄", jpg:"🖼", jpeg:"🖼", png:"🖼", xlsx:"📊", xls:"📊",
                doc:"📝", docx:"📝", zip:"🗜", rar:"🗜", mp4:"🎬", mp3:"🎵",
                pptx:"📊", ppt:"📊" };
  return map[ext] || "📄";
}

function relativeDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso), now = new Date(), diff = (now - d) / 1000;
  if (diff < 3600) return `Il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff/3600)} heure${Math.floor(diff/3600) > 1 ? "s" : ""}`;
  if (diff < 172800) return "Hier";
  if (diff < 604800) return `Il y a ${Math.floor(diff/86400)} jours`;
  return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
}

const AVATAR_COLORS = ["#00BCD4","#4CAF50","#FF9800","#9C27B0","#F44336","#2196F3","#009688"];
function avatarColor(name) {
  let hash = 0;
  for (const c of (name || "")) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Styles ────────────────────────────────────────────────────────

const S = {
  page: {
    background: C.bg, minHeight: "100vh", padding: "32px 40px",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: C.ink,
  },
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em" },
  pageSubtitle: { fontSize: 14, color: C.muted, margin: 0 },
  filterBar: {
    display: "flex", alignItems: "center", gap: 12,
    marginBottom: 20, flexWrap: "wrap",
  },
  filterSelect: {
    padding: "8px 12px", border: `1px solid ${C.line}`,
    borderRadius: 6, fontSize: 13, background: "#fff",
    color: C.ink, cursor: "pointer", outline: "none",
    minWidth: 160,
  },
  searchInput: {
    padding: "8px 14px", border: `1px solid ${C.line}`,
    borderRadius: 6, fontSize: 13, outline: "none",
    flex: 1, minWidth: 200,
    fontFamily: "inherit",
  },
  tableCard: {
    background: "#fff", borderRadius: 10,
    border: `1px solid ${C.line}`,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  theadRow: { background: "#FAFAFA", borderBottom: `1px solid ${C.line}` },
  th: {
    padding: "12px 16px", textAlign: "left",
    fontSize: 12, fontWeight: 600, color: C.muted,
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  tr: { transition: "background .1s" },
  td: { padding: "14px 16px", verticalAlign: "middle" },
  fileIcon: { fontSize: 18 },
  avatar: {
    width: 32, height: 32, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  permBadge: {
    display: "inline-block", padding: "3px 8px",
    borderRadius: 4, fontSize: 11, fontWeight: 600,
  },
  actionIconBtn: {
    width: 32, height: 32, borderRadius: 6,
    border: `1px solid ${C.line}`, background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: C.muted, transition: "all .15s",
  },
  primaryBtn: {
    padding: "10px 24px", background: C.primary,
    border: "none", borderRadius: 6, color: "#fff",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  empty: {
    padding: "80px 0", textAlign: "center", color: C.muted,
  },
};

const SM = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, backdropFilter: "blur(2px)",
  },
  modal: {
    background: "#fff", borderRadius: 12, padding: 28,
    width: "100%", maxWidth: 460,
    maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,.15)",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 24,
  },
  title: { fontSize: 18, fontWeight: 700 },
  close: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted },
  section: { marginBottom: 20 },
  label: {
    fontSize: 12, fontWeight: 600, color: C.muted,
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
    display: "block",
  },
  input: {
    width: "100%", padding: "10px 12px",
    border: `1.5px solid ${C.line}`, borderRadius: 6,
    fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  },
  dropdown: {
    border: `1px solid ${C.line}`, borderRadius: 6, marginTop: 4,
    maxHeight: 180, overflowY: "auto", background: "#fff",
    boxShadow: "0 4px 16px rgba(0,0,0,.1)",
  },
  dropMsg: { padding: "10px 14px", fontSize: 13, color: C.muted, textAlign: "center" },
  dropItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", cursor: "pointer",
    borderBottom: `1px solid ${C.line}`,
  },
  selectedUser: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", marginTop: 8,
    background: C.primaryLight, border: `1px solid ${C.primary}`,
    borderRadius: 6,
  },
  avatar: {
    width: 32, height: 32, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  clearBtn: { background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14 },
  permRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 0", borderBottom: `1px solid ${C.line}`, cursor: "pointer",
  },
  permChip: {
    padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600,
  },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0,
  },
  knob: {
    position: "absolute", top: 2, width: 20, height: 20,
    borderRadius: "50%", background: "#fff",
    boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "transform .2s",
  },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  cancelBtn: {
    padding: "10px 20px", background: "transparent",
    border: `1px solid ${C.line}`, borderRadius: 6,
    fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  },
  submitBtn: {
    padding: "10px 24px", background: C.primary,
    border: "none", borderRadius: 6, color: "#fff",
    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
};