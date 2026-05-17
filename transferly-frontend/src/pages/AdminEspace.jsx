/**
 * Partager un fichier — Admin Espace
 * Fichier : frontend/src/pages/AdminEspace.jsx
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import API from "../api/auth";
import AppLayout from "../components/AppLayout";

const C = {
  primary: "#00BCD4",
  primaryDark: "#0097A7",
  primaryLight: "#E0F7FA",
  card: "#FFFFFF",
  ink: "#212121",
  muted: "#757575",
  line: "#E0E0E0",
  red: "#F44336",
  green: "#4CAF50",
};

const PERM_COLS = [
  { key: "lecture",      label: "Peut consulter" },
  { key: "ecriture",    label: "Peut modifier" },
  { key: "suppression", label: "Peut supprimer" },
  { key: "partage",     label: "Peut partager" },
];

export default function AdminEspace() {
  const [searchParams] = useSearchParams();
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
  const [editModal, setEditModal]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fichiersRes, usersRes] = await Promise.all([
        API.get("/files/"),
        API.get("/users/list"),
      ]);
      const fichiersData = Array.isArray(fichiersRes.data) ? fichiersRes.data : (fichiersRes.data.files || []);
      const usersData    = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.users || []);
      setFichiers(fichiersData);
      setUsers(usersData);
      if (fichiersData.length > 0 && !selectedFichier) {
        setSelected(fichiersData[0]);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const fichierId = searchParams.get('fichier');
    if (fichierId && fichiers.length > 0) {
      const f = fichiers.find(x => x.id === parseInt(fichierId));
      if (f) setSelected(f);
    }
  }, [searchParams, fichiers]);

  useEffect(() => {
    if (!selectedFichier) return;
    setLoadingRules(true);
    API.get(`/acl/fichier/${selectedFichier.id}`)
      .then(r => setRules(r.data))
      .catch(() => setRules([]))
      .finally(() => setLoadingRules(false));
  }, [selectedFichier]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const togglePerm = async (ruleId, permKey, currentVal) => {
    setSaving(s => ({ ...s, [`${ruleId}-${permKey}`]: true }));
    try {
      const updated = (await API.put(`/acl/${ruleId}`, { [permKey]: !currentVal })).data;
      setRules(prev => prev.map(r => r.id === ruleId ? updated : r));
      showToast("Permission mise à jour");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(s => ({ ...s, [`${ruleId}-${permKey}`]: false })); }
  };

  const revoke = async (ruleId, userName) => {
    if (!window.confirm(`Retirer l'accès de ${userName} ?`)) return;
    try {
      await API.delete(`/acl/${ruleId}`);
      setRules(prev => prev.filter(r => r.id !== ruleId));
      showToast(`Accès de ${userName} retiré`);
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleAdd = async (targetUserId, perms) => {
    if (!selectedFichier) return;
    try {
      const newRule = (await API.post("/acl/", {
        user_id: targetUserId,
        fichier_id: selectedFichier.id,
        ...perms,
      })).data;
      setRules(prev => [...prev, newRule]);
      setAddModal(false);
      showToast("Accès partagé ✓");
    } catch (e) { showToast(e.message, "error"); }
  };

  if (loading) return <AppLayout><Loading /></AppLayout>;
  if (error) return <AppLayout><ErrorScreen msg={error} onRetry={load} /></AppLayout>;

  return (
    <AppLayout>
      <div style={S.page}>
        {toast && <Toast msg={toast.msg} type={toast.type} />}

        {/* En-tête */}
        <div style={S.pageHeader}>
          <div>
            <h1 style={S.pageTitle}>Partager un fichier</h1>
            <p style={S.pageSubtitle}>Choisissez avec qui partager ce fichier et ce qu&apos;ils peuvent faire</p>
          </div>
          <button style={S.addBtn} onClick={() => setAddModal(true)} disabled={!selectedFichier}>
            + Partager avec une personne
          </button>
        </div>

        {/* Encart fichier sélectionné */}
        {selectedFichier && (
          <div className="mb-6 flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {selectedFichier.nom || 'Fichier'}
              </p>
              <p className="text-xs text-slate-500">Gérez les personnes ayant accès à ce fichier</p>
            </div>
          </div>
        )}

        {/* Panneau permissions */}
        <div style={S.permPanel}>
          {!selectedFichier ? (
            <div style={S.empty}>Aucun fichier sélectionné</div>
          ) : (
            <>
              <div style={S.permHeader}>
                <div style={S.permTitle}>
                  Personnes ayant accès à
                  <span style={{ color: C.primary, marginLeft: 6 }}>{selectedFichier.nom}</span>
                </div>
                <div style={S.permSubtitle}>Cochez ce que chaque personne peut faire</div>
              </div>

              {loadingRules ? (
                <div style={{ padding: 20, color: C.muted, textAlign: "center" }}>Chargement…</div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr style={S.theadRow}>
                      <th style={S.th}>Personne</th>
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
                          Personne n&apos;a encore accès à ce fichier.
                          <br />Cliquez sur &quot;+ Partager avec une personne&quot; pour commencer.
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
                const updated = (await API.put(`/acl/${editModal.id}`, perms)).data;
                setRules(prev => prev.map(r => r.id === editModal.id ? updated : r));
                setEditModal(null);
                showToast("Permissions mises à jour ✓");
              } catch (e) { showToast(e.message, "error"); }
            }}
            onClose={() => setEditModal(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}

// ── Ligne du tableau ──────────────────────────────────────────────

function PermRow({ rule, isLast, saving, onToggle, onRevoke, onEdit }) {
  return (
    <tr style={{ borderBottom: isLast ? "none" : `1px solid ${C.line}` }}>
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

      <td style={{ ...S.td, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          <button style={S.textBtn} onClick={onEdit}>Modifier</button>
          <button style={{ ...S.textBtn, color: C.red }} onClick={onRevoke}>Retirer l&apos;accès</button>
        </div>
      </td>
    </tr>
  );
}

// ── Modale partage par email ──────────────────────────────────────

function AddPermModal({ users, existingIds, onConfirm, onClose }) {
  const [email, setEmail]           = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const defaultPerms = {
    lecture: true, ecriture: false, upload: false,
    download: true, suppression: false, partage: false,
  };

  const submit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    const user = users.find(u => u.email.toLowerCase() === trimmed);
    if (!user) {
      setEmailError("Aucun utilisateur trouvé avec cet email.");
      return;
    }
    if (existingIds.has(user.id)) {
      setEmailError("Cette personne a déjà accès à ce fichier.");
      return;
    }
    setSubmitting(true);
    await onConfirm(user.id, defaultPerms);
    setSubmitting(false);
  };

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.modal} onClick={e => e.stopPropagation()}>
        <div style={M.header}>
          <div style={M.title}>Partager avec une personne</div>
          <button style={M.close} onClick={onClose}>✕</button>
        </div>

        <div style={M.section}>
          <div style={M.label}>Adresse email</div>
          <input
            style={M.input}
            type="email"
            placeholder="exemple@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            autoFocus
          />
          {emailError && (
            <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{emailError}</div>
          )}
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
            La personne recevra un accès en lecture et téléchargement par défaut.
          </div>
        </div>

        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>Annuler</button>
          <button
            style={{ ...M.submitBtn, opacity: !email.trim() || submitting ? 0.5 : 1 }}
            onClick={submit}
            disabled={!email.trim() || submitting}
          >
            {submitting ? "Partage…" : "Partager"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modale édition ────────────────────────────────────────────────

function EditPermModal({ rule, onConfirm, onClose }) {
  const [perms, setPerms]         = useState({ ...rule.permissions });
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
          <div style={M.title}>Modifier les accès</div>
          <button style={M.close} onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: 16, color: C.muted, fontSize: 13 }}>
          Personne : <strong style={{ color: C.ink }}>{rule.user_nom}</strong>
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

const AVATAR_COLORS = ["#00BCD4","#4CAF50","#FF9800","#9C27B0","#F44336","#2196F3","#009688"];
function avatarColor(name) {
  let h = 0;
  for (const c of (name||"")) h = c.charCodeAt(0) + ((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Styles ────────────────────────────────────────────────────────

const S = {
  page: {
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
  permPanel: {
    background:"#fff", borderRadius:10,
    border:`1px solid ${C.line}`,
    overflow:"hidden",
    boxShadow:"0 1px 4px rgba(0,0,0,.06)",
  },
  permHeader: {
    padding:"20px 24px", borderBottom:`1px solid ${C.line}`,
  },
  permTitle: { fontSize:16, fontWeight:700, marginBottom:4 },
  permSubtitle: { fontSize:12, color: C.muted },
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
