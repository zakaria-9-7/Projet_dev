/**
 * IE-06 — Gestion des Permissions (ACL) — Admin Espace
 * Fichier : frontend/src/pages/AdminEspace.jsx
 *
 * Fidèle au prototype Figma :
 * - Arborescence dossiers/fichiers à gauche
 * - Tableau permissions à droite (Utilisateur/Groupe | Lecture | Écriture | Suppression | Partage | Actions)
 * - Bouton "+ Ajouter une permission"
 * - Actions : Modifier · Révoquer
 */

import { useState, useEffect, useCallback } from "react";

const C = {
  primary: "#00BCD4",
  primaryDark: "#0097A7",
  primaryLight: "#E0F7FA",
  bg: "#F8F9FA",
  card: "#FFFFFF",
  ink: "#212121",
  muted: "#757575",
  line: "#E0E0E0",
  red: "#F44336",
  redLight: "#FFEBEE",
  green: "#4CAF50",
  sidebarActive: "#E0F7FA",
};

// Permissions affichées dans le tableau (fidèles au prototype)
const PERM_COLS = [
  { key: "lecture",      label: "Lecture" },
  { key: "ecriture",    label: "Écriture" },
  { key: "suppression", label: "Suppression" },
  { key: "partage",     label: "Partage" },
];

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

export default function AdminEspace() {
  const [fichiers, setFichiers]         = useState([]);
  const [selectedFichier, setSelected]  = useState(null);
  const [rules, setRules]               = useState([]);
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadingRules, setLoadingRules] = useState(false);
  const [saving, setSaving]             = useState({});
  const [error, setError]               = useState(null);
  const [toast, setToast]               = useState(null);
  const [addModal, setAddModal]         = useState(false);
  const [editModal, setEditModal]       = useState(null); // rule à éditer

  // Charger les fichiers et la liste des users
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fichiersData, usersData] = await Promise.all([
        API("/files/"),
        API("/admin/users"),
      ]);
      setFichiers(fichiersData);
      setUsers(usersData);
      // Sélectionner le premier fichier par défaut
      if (fichiersData.length > 0 && !selectedFichier) {
        setSelected(fichiersData[0]);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Charger les règles ACL du fichier sélectionné
  useEffect(() => {
    if (!selectedFichier) return;
    setLoadingRules(true);
    API(`/acl/fichier/${selectedFichier.id}`)
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setLoadingRules(false));
  }, [selectedFichier]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Modifier une permission via le tableau de cases à cocher
  const togglePerm = async (ruleId, permKey, currentVal) => {
    setSaving(s => ({ ...s, [`${ruleId}-${permKey}`]: true }));
    try {
      const updated = await API(`/acl/${ruleId}`, {
        method: "PUT",
        body: JSON.stringify({ [permKey]: !currentVal }),
      });
      setRules(prev => prev.map(r => r.id === ruleId ? updated : r));
      showToast("Permission mise à jour");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(s => ({ ...s, [`${ruleId}-${permKey}`]: false })); }
  };

  // Révoquer une règle ACL complète
  const revoke = async (ruleId, userName) => {
    if (!window.confirm(`Révoquer tous les accès de ${userName} ?`)) return;
    try {
      await API(`/acl/${ruleId}`, { method: "DELETE" });
      setRules(prev => prev.filter(r => r.id !== ruleId));
      showToast(`Accès de ${userName} révoqué`);
    } catch (e) { showToast(e.message, "error"); }
  };

  // Ajouter une permission
  const handleAdd = async (targetUserId, perms) => {
    if (!selectedFichier) return;
    try {
      const newRule = await API("/acl/", {
        method: "POST",
        body: JSON.stringify({
          user_id: targetUserId,
          fichier_id: selectedFichier.id,
          ...perms,
        }),
      });
      setRules(prev => [...prev, newRule]);
      setAddModal(false);
      showToast("Permission ajoutée ✓");
    } catch (e) { showToast(e.message, "error"); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorScreen msg={error} onRetry={load} />;

  return (
    <div style={S.page}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* En-tête */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Gestion des Permissions (ACL)</h1>
          <p style={S.pageSubtitle}>Gérer les droits d&apos;accès aux fichiers et dossiers</p>
        </div>
        <button style={S.addBtn} onClick={() => setAddModal(true)}
          disabled={!selectedFichier}>
          + Ajouter une permission
        </button>
      </div>

      <div style={S.layout}>
        {/* Arborescence gauche — fidèle au prototype */}
        <div style={S.tree}>
          <div style={S.treeTitle}>Arborescence</div>
          {fichiers.length === 0
            ? <div style={{ color: C.muted, fontSize: 13, padding: "12px 0" }}>Aucun fichier</div>
            : fichiers.map(f => (
              <TreeItem
                key={f.id}
                fichier={f}
                selected={selectedFichier?.id === f.id}
                onClick={() => setSelected(f)}
              />
            ))
          }
        </div>

        {/* Panneau permissions droite */}
        <div style={S.permPanel}>
          {!selectedFichier ? (
            <div style={S.empty}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👈</div>
              Sélectionnez un fichier
            </div>
          ) : (
            <>
              <div style={S.permHeader}>
                <div>
                  <div style={S.permTitle}>
                    Permissions pour :
                    <span style={{ color: C.primary, marginLeft: 6 }}>
                      {selectedFichier.nom}
                    </span>
                  </div>
                  <div style={S.permSubtitle}>
                    Gérer qui peut accéder à cet élément
                  </div>
                </div>
              </div>

              {loadingRules ? (
                <div style={{ padding: 20, color: C.muted, textAlign: "center" }}>Chargement…</div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr style={S.theadRow}>
                      <th style={S.th}>Utilisateur/Groupe</th>
                      {PERM_COLS.map(p => (
                        <th key={p.key} style={{ ...S.th, textAlign: "center" }}>{p.label}</th>
                      ))}
                      <th style={{ ...S.th, textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "32px 0", textAlign: "center", color: C.muted, fontSize: 13 }}>
                          Aucune règle ACL pour ce fichier.
                          <br />Cliquez sur &quot;+ Ajouter une permission&quot; pour commencer.
                        </td>
                      </tr>
                    ) : rules.map((rule, i) => (
                      <PermRow
                        key={rule.id}
                        rule={rule}
                        isLast={i === rules.length - 1}
                        saving={saving}
                        onToggle={togglePerm}
                        onRevoke={() => revoke(rule.id, rule.user_nom)}
                        onEdit={() => setEditModal(rule)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modale ajout */}
      {addModal && (
        <AddPermModal
          users={users}
          existingIds={new Set(rules.map(r => r.user_id))}
          onConfirm={handleAdd}
          onClose={() => setAddModal(false)}
        />
      )}

      {/* Modale édition */}
      {editModal && (
        <EditPermModal
          rule={editModal}
          onConfirm={async (perms) => {
            try {
              const updated = await API(`/acl/${editModal.id}`, {
                method: "PUT",
                body: JSON.stringify(perms),
              });
              setRules(prev => prev.map(r => r.id === editModal.id ? updated : r));
              setEditModal(null);
              showToast("Permissions mises à jour ✓");
            } catch (e) { showToast(e.message, "error"); }
          }}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}

// ── Composant ligne du tableau ─────────────────────────────────────

function PermRow({ rule, isLast, saving, onToggle, onRevoke, onEdit }) {
  return (
    <tr style={{ borderBottom: isLast ? "none" : `1px solid ${C.line}` }}>
      {/* Utilisateur */}
      <td style={S.td}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...S.avatar, background: avatarColor(rule.user_nom || "?") }}>
            {(rule.user_nom || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{rule.user_nom || "—"}</div>
            {rule.user_email && (
              <div style={{ fontSize: 11, color: C.muted }}>{rule.user_email}</div>
            )}
          </div>
        </div>
      </td>

      {/* Cases à cocher par permission */}
      {PERM_COLS.map(p => {
        const val = rule.permissions[p.key];
        const key = `${rule.id}-${p.key}`;
        return (
          <td key={p.key} style={{ ...S.td, textAlign: "center" }}>
            <button
              style={{
                ...S.checkbox,
                background: val ? C.primary : "#fff",
                borderColor: val ? C.primary : C.line,
              }}
              onClick={() => onToggle(rule.id, p.key, val)}
              disabled={!!saving[key]}
              title={`${val ? "Retirer" : "Accorder"} : ${p.label}`}
            >
              {val && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </td>
        );
      })}

      {/* Actions */}
      <td style={{ ...S.td, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          <button style={S.textBtn} onClick={onEdit}>Modifier</button>
          <button style={{ ...S.textBtn, color: C.red }} onClick={onRevoke}>Révoquer</button>
        </div>
      </td>
    </tr>
  );
}

// ── Arborescence item ─────────────────────────────────────────────

function TreeItem({ fichier, selected, onClick }) {
  const ext = (fichier.nom || "").split(".").pop().toLowerCase();
  const isFolder = !ext || ext === fichier.nom;

  return (
    <div style={{
      ...S.treeItem,
      background: selected ? C.sidebarActive : "transparent",
      borderLeft: selected ? `3px solid ${C.primary}` : "3px solid transparent",
      color: selected ? C.primary : C.ink,
      fontWeight: selected ? 600 : 400,
    }} onClick={onClick}>
      <span style={{ marginRight: 8 }}>{isFolder ? "📁" : fileIcon(fichier.nom)}</span>
      <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {fichier.nom}
      </span>
    </div>
  );
}

// ── Modale ajout ──────────────────────────────────────────────────

function AddPermModal({ users, existingIds, onConfirm, onClose }) {
  const available = users.filter(u => !existingIds.has(u.id));
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [perms, setPerms] = useState({
    lecture: true, ecriture: false, upload: false,
    download: true, suppression: false, partage: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const filtered = available.filter(u =>
    u.nom.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    await onConfirm(selected.id, perms);
    setSubmitting(false);
  };

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.modal} onClick={e => e.stopPropagation()}>
        <div style={M.header}>
          <div style={M.title}>Ajouter une permission</div>
          <button style={M.close} onClick={onClose}>✕</button>
        </div>

        <div style={M.section}>
          <div style={M.label}>Sélectionner un utilisateur</div>
          <input style={M.input} placeholder="Rechercher..."
            value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          <div style={M.userList}>
            {filtered.length === 0
              ? <div style={{ padding: 12, color: C.muted, fontSize: 13, textAlign: "center" }}>
                  Aucun utilisateur disponible
                </div>
              : filtered.map(u => (
                <div key={u.id} style={{
                  ...M.userItem,
                  background: selected?.id === u.id ? C.primaryLight : "transparent",
                }} onClick={() => setSelected(u)}>
                  <div style={{ ...S.avatar, background: avatarColor(u.nom), width: 30, height: 30, fontSize: 12 }}>
                    {u.nom[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.nom}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{u.email}</div>
                  </div>
                  {selected?.id === u.id && <span style={{ marginLeft: "auto", color: C.primary }}>✓</span>}
                </div>
              ))
            }
          </div>
        </div>

        <div style={M.section}>
          <div style={M.label}>Permissions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PERM_COLS.map(p => (
              <label key={p.key} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 6,
                border: `1px solid ${perms[p.key] ? C.primary : C.line}`,
                background: perms[p.key] ? C.primaryLight : "#fff",
                cursor: "pointer", fontSize: 13,
                color: perms[p.key] ? C.primaryDark : C.ink,
              }}>
                <input type="checkbox" checked={perms[p.key]} style={{ display: "none" }}
                  onChange={e => setPerms(prev => ({ ...prev, [p.key]: e.target.checked }))} />
                {perms[p.key] ? "☑" : "☐"} {p.label}
              </label>
            ))}
          </div>
        </div>

        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>Annuler</button>
          <button style={{ ...M.submitBtn, opacity: !selected || submitting ? 0.5 : 1 }}
            onClick={submit} disabled={!selected || submitting}>
            {submitting ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modale édition ────────────────────────────────────────────────

function EditPermModal({ rule, onConfirm, onClose }) {
  const [perms, setPerms] = useState({ ...rule.permissions });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    await onConfirm(perms);
    setSubmitting(false);
  };

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={{ ...M.modal, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={M.header}>
          <div style={M.title}>Modifier les permissions</div>
          <button style={M.close} onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: 16, color: C.muted, fontSize: 13 }}>
          Utilisateur : <strong style={{ color: C.ink }}>{rule.user_nom}</strong>
        </div>

        <div style={M.section}>
          {PERM_COLS.map(p => (
            <div key={p.key} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: `1px solid ${C.line}`,
            }}>
              <span style={{ fontSize: 14 }}>{p.label}</span>
              <button
                style={{
                  ...S.checkbox,
                  background: perms[p.key] ? C.primary : "#fff",
                  borderColor: perms[p.key] ? C.primary : C.line,
                }}
                onClick={() => setPerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
              >
                {perms[p.key] && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>

        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>Annuler</button>
          <button style={{ ...M.submitBtn, opacity: submitting ? 0.5 : 1 }}
            onClick={submit} disabled={submitting}>
            {submitting ? "Sauvegarde…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Utilitaires ───────────────────────────────────────────────────

function Loading() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
      <div style={{ textAlign:"center", color: C.muted }}>
        <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>Chargement…
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ color: C.red, marginBottom:16 }}>{msg}</div>
        <button style={{ padding:"10px 24px", background:C.primary, border:"none", borderRadius:6, color:"#fff", cursor:"pointer" }}
          onClick={onRetry}>Réessayer</button>
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

function fileIcon(nom) {
  const ext = (nom || "").split(".").pop().toLowerCase();
  const map = { pdf:"📄", jpg:"🖼", jpeg:"🖼", png:"🖼", xlsx:"📊", xls:"📊", doc:"📝", docx:"📝", zip:"🗜" };
  return map[ext] || "📄";
}

const AVATAR_COLORS = ["#00BCD4","#4CAF50","#FF9800","#9C27B0","#F44336","#2196F3","#009688"];
function avatarColor(name) {
  let h = 0;
  for (const c of (name||"")) h = c.charCodeAt(0) + ((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Styles ────────────────────────────────────────────────────────

const S = {
  page: {
    background: C.bg, minHeight:"100vh", padding:"32px 40px",
    fontFamily:"'DM Sans','Segoe UI',sans-serif", color: C.ink,
  },
  pageHeader: {
    display:"flex", justifyContent:"space-between", alignItems:"flex-start",
    marginBottom:24,
  },
  pageTitle: { fontSize:28, fontWeight:700, margin:"0 0 4px", letterSpacing:"-0.01em" },
  pageSubtitle: { fontSize:14, color: C.muted, margin:0 },
  addBtn: {
    padding:"10px 20px", background: C.primary,
    border:"none", borderRadius:6, color:"#fff",
    fontSize:13, fontWeight:600, cursor:"pointer",
    whiteSpace:"nowrap",
  },
  layout: {
    display:"grid", gridTemplateColumns:"220px 1fr", gap:20, alignItems:"start",
  },
  tree: {
    background:"#fff", borderRadius:10,
    border:`1px solid ${C.line}`, padding:16,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)",
  },
  treeTitle: {
    fontSize:11, fontWeight:700, textTransform:"uppercase",
    letterSpacing:"0.08em", color: C.muted, marginBottom:12,
  },
  treeItem: {
    display:"flex", alignItems:"center",
    padding:"8px 10px", borderRadius:6, cursor:"pointer",
    transition:"all .1s", marginBottom:2,
  },
  permPanel: {
    background:"#fff", borderRadius:10,
    border:`1px solid ${C.line}`,
    overflow:"hidden",
    boxShadow:"0 1px 4px rgba(0,0,0,.06)",
  },
  permHeader: {
    padding:"20px 24px", borderBottom:`1px solid ${C.line}`,
    background:"#fff",
  },
  permTitle: { fontSize:16, fontWeight:700 },
  permSubtitle: { fontSize:12, color: C.muted, marginTop:2 },
  table: { width:"100%", borderCollapse:"collapse" },
  theadRow: { background:"#FAFAFA", borderBottom:`1px solid ${C.line}` },
  th: {
    padding:"12px 16px", textAlign:"left",
    fontSize:12, fontWeight:600, color: C.muted,
    textTransform:"uppercase", letterSpacing:"0.05em",
  },
  td: { padding:"14px 16px", verticalAlign:"middle" },
  avatar: {
    width:36, height:36, borderRadius:"50%",
    display:"flex", alignItems:"center", justifyContent:"center",
    color:"#fff", fontSize:14, fontWeight:700, flexShrink:0,
  },
  checkbox: {
    width:22, height:22, borderRadius:4,
    border:"2px solid", display:"flex", alignItems:"center", justifyContent:"center",
    cursor:"pointer", padding:0, transition:"all .15s", background:"#fff",
  },
  textBtn: {
    background:"none", border:"none", cursor:"pointer",
    fontSize:13, fontWeight:600, color: C.primary, padding:"4px 8px",
  },
  empty: {
    padding:"60px 0", textAlign:"center", color: C.muted, fontSize:14,
  },
};

const M = {
  overlay: {
    position:"fixed", inset:0, background:"rgba(0,0,0,.4)",
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:1000, backdropFilter:"blur(2px)",
  },
  modal: {
    background:"#fff", borderRadius:12, padding:28,
    width:"100%", maxWidth:460,
    maxHeight:"90vh", overflowY:"auto",
    boxShadow:"0 20px 60px rgba(0,0,0,.15)",
  },
  header: {
    display:"flex", justifyContent:"space-between",
    alignItems:"center", marginBottom:20,
  },
  title: { fontSize:18, fontWeight:700 },
  close: { background:"none", border:"none", fontSize:18, cursor:"pointer", color: C.muted },
  section: { marginBottom:20 },
  label: {
    fontSize:12, fontWeight:600, color: C.muted,
    textTransform:"uppercase", letterSpacing:"0.06em",
    marginBottom:8, display:"block",
  },
  input: {
    width:"100%", padding:"10px 12px",
    border:`1.5px solid ${C.line}`, borderRadius:6,
    fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit",
  },
  userList: {
    border:`1px solid ${C.line}`, borderRadius:6, marginTop:8,
    maxHeight:180, overflowY:"auto",
  },
  userItem: {
    display:"flex", alignItems:"center", gap:10,
    padding:"10px 14px", cursor:"pointer",
    borderBottom:`1px solid ${C.line}`,
  },
  footer: { display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 },
  cancelBtn: {
    padding:"10px 20px", background:"transparent",
    border:`1px solid ${C.line}`, borderRadius:6,
    fontSize:14, cursor:"pointer", fontFamily:"inherit",
  },
  submitBtn: {
    padding:"10px 24px", background: C.primary,
    border:"none", borderRadius:6, color:"#fff",
    fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
  },
};