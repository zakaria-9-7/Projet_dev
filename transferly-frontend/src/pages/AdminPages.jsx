import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ─── DONNÉES FICTIVES (à remplacer par vrais appels API) ───────
const MOCK_USERS = [
  { id: 1, nom: "Marie Dubois", email: "marie.dubois@inpt.ma", role: "Utilisateur", statut: "actif", quota: 2, quota_used: 1.2 },
  { id: 2, nom: "Jean Martin", email: "jean.martin@inpt.ma", role: "AdminEspace", statut: "actif", quota: 5, quota_used: 3.8 },
  { id: 3, nom: "Sophie Laurent", email: "sophie.laurent@inpt.ma", role: "Utilisateur", statut: "suspendu", quota: 2, quota_used: 0.4 },
  { id: 4, nom: "Pierre Rousseau", email: "pierre.rousseau@inpt.ma", role: "Utilisateur", statut: "actif", quota: 2, quota_used: 1.9 },
  { id: 5, nom: "Claire Dubois", email: "claire.dubois@inpt.ma", role: "AdminEspace", statut: "actif", quota: 10, quota_used: 6.1 },
  { id: 6, nom: "Thomas Bernard", email: "thomas.bernard@inpt.ma", role: "Utilisateur", statut: "actif", quota: 2, quota_used: 0.1 },
  { id: 7, nom: "Amina Tahri", email: "amina.tahri@inpt.ma", role: "Utilisateur", statut: "actif", quota: 2, quota_used: 1.7 },
  { id: 8, nom: "Youssef El Amrani", email: "youssef.elamrani@inpt.ma", role: "AdminGlobal", statut: "actif", quota: 50, quota_used: 12.3 },
];

const MOCK_LOGS = [
  { id: 1, user_email: "marie.dubois@inpt.ma", action: "upload", statut: "succes", date: new Date(Date.now() - 60000).toISOString(), detail: "rapport_Q3.pdf" },
  { id: 2, user_email: "jean.martin@inpt.ma", action: "download", statut: "succes", date: new Date(Date.now() - 300000).toISOString(), detail: "Budget_2024.xlsx" },
  { id: 3, user_email: "inconnu@externe.com", action: "login", statut: "echec", date: new Date(Date.now() - 600000).toISOString(), detail: "Tentative #3" },
  { id: 4, user_email: "sophie.laurent@inpt.ma", action: "suppression", statut: "succes", date: new Date(Date.now() - 900000).toISOString(), detail: "old_file.docx" },
  { id: 5, user_email: "pierre.rousseau@inpt.ma", action: "partage", statut: "succes", date: new Date(Date.now() - 1200000).toISOString(), detail: "Design_Assets.zip" },
  { id: 6, user_email: "inconnu@ext.com", action: "login", statut: "echec", date: new Date(Date.now() - 1500000).toISOString(), detail: "Tentative #1" },
  { id: 7, user_email: "claire.dubois@inpt.ma", action: "acl_modif", statut: "succes", date: new Date(Date.now() - 1800000).toISOString(), detail: "Espace Marketing" },
  { id: 8, user_email: "amina.tahri@inpt.ma", action: "upload", statut: "succes", date: new Date(Date.now() - 2100000).toISOString(), detail: "Logo_Final.png" },
  { id: 9, user_email: "youssef.elamrani@inpt.ma", action: "role_change", statut: "succes", date: new Date(Date.now() - 2400000).toISOString(), detail: "thomas.bernard → AdminEspace" },
  { id: 10, user_email: "thomas.bernard@inpt.ma", action: "login", statut: "succes", date: new Date(Date.now() - 2700000).toISOString(), detail: "MFA validé" },
  { id: 11, user_email: "marie.dubois@inpt.ma", action: "download", statut: "succes", date: new Date(Date.now() - 3000000).toISOString(), detail: "Contrat_Final.pdf" },
  { id: 12, user_email: "inconnu@hack.io", action: "login", statut: "echec", date: new Date(Date.now() - 3300000).toISOString(), detail: "Tentative #7" },
];

// ─── UTILS ─────────────────────────────────────────────────────
const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const ROLES = ["AdminGlobal", "AdminEspace", "Utilisateur"];
const STATUTS = ["actif", "suspendu"];
const ROLE_COLORS = {
  AdminGlobal: { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.25)" },
  AdminEspace: { bg: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "rgba(96,165,250,0.25)" },
  Utilisateur: { bg: "rgba(45,212,160,0.12)", color: "#2dd4a0", border: "rgba(45,212,160,0.25)" },
};

// ─── STYLES ────────────────────────────────────────────────────
const S = {
  root: { minHeight: "100vh", background: "#080a0f", color: "#e2e4ed", fontFamily: "'DM Mono', monospace" },
  topbar: {
    height: "56px", background: "#0d0f16", borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", padding: "0 40px", gap: "32px",
    position: "sticky", top: 0, zIndex: 50,
  },
  topbarLogo: { fontSize: "15px", fontWeight: "700", color: "#fff", letterSpacing: "-0.5px", marginRight: "16px" },
  tab: (active) => ({
    fontSize: "11px", letterSpacing: "0.06em", padding: "6px 0",
    color: active ? "#fff" : "#4b5563",
    borderBottom: active ? "2px solid #2dd4a0" : "2px solid transparent",
    cursor: "pointer", transition: "all 0.15s", userSelect: "none",
  }),
  page: { padding: "32px 40px" },
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" },
  pageTitle: { fontSize: "20px", fontWeight: "700", color: "#fff", letterSpacing: "-0.5px" },
  pageSub: { fontSize: "11px", color: "#6b7280", marginTop: "3px" },
  filters: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  select: {
    background: "#13161e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px",
    color: "#9ca3af", fontSize: "11px", padding: "6px 10px", fontFamily: "'DM Mono', monospace",
    cursor: "pointer", outline: "none",
  },
  input: {
    background: "#13161e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px",
    color: "#e2e4ed", fontSize: "11px", padding: "6px 12px", fontFamily: "'DM Mono', monospace",
    outline: "none", width: "220px",
  },
  btn: (variant) => ({
    padding: "6px 14px", borderRadius: "6px", fontSize: "11px", cursor: "pointer",
    fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em", transition: "all 0.15s",
    border: variant === "primary" ? "none" : "1px solid rgba(255,255,255,0.1)",
    background: variant === "primary" ? "#2dd4a0" : variant === "danger" ? "rgba(248,113,113,0.15)" : "#13161e",
    color: variant === "primary" ? "#000" : variant === "danger" ? "#f87171" : "#9ca3af",
    fontWeight: variant === "primary" ? "600" : "400",
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  th: {
    padding: "10px 16px", textAlign: "left", fontSize: "10px", color: "#4b5563",
    letterSpacing: "0.08em", textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: "500",
  },
  td: { padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" },
  tr: (hover) => ({
    background: hover ? "rgba(255,255,255,0.02)" : "transparent",
    transition: "background 0.1s",
  }),
  badge: (color, bg, border) => ({
    display: "inline-block", fontSize: "10px", padding: "2px 8px", borderRadius: "4px",
    background: bg, color, border: `1px solid ${border}`, fontWeight: "500", letterSpacing: "0.04em",
  }),
  card: {
    background: "#0d0f16", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px", overflow: "hidden",
  },
  modal: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modalBox: {
    background: "#13161e", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px", padding: "32px", width: "420px", maxWidth: "90vw",
  },
  modalTitle: { fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "20px" },
  label: { fontSize: "10px", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px", display: "block" },
  formInput: {
    width: "100%", background: "#0d0f16", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px", color: "#e2e4ed", fontSize: "12px", padding: "8px 12px",
    fontFamily: "'DM Mono', monospace", outline: "none", marginBottom: "16px",
  },
  quotaBar: (pct) => ({
    height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px",
    overflow: "hidden", marginTop: "4px", width: "120px",
  }),
  quotaFill: (pct) => ({
    height: "100%", borderRadius: "2px", transition: "width 0.5s ease",
    width: `${Math.min(pct, 100)}%`,
    background: pct > 85 ? "#f87171" : pct > 60 ? "#f59e0b" : "#2dd4a0",
  }),
  pagination: { display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end", padding: "16px 24px" },
  pageBtn: (active) => ({
    width: "28px", height: "28px", borderRadius: "4px", fontSize: "11px",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)",
    background: active ? "#2dd4a0" : "#13161e",
    color: active ? "#000" : "#9ca3af", fontWeight: active ? "600" : "400",
  }),
  exportBtn: {
    padding: "6px 14px", borderRadius: "6px", fontSize: "11px", cursor: "pointer",
    fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em",
    background: "rgba(96,165,250,0.12)", color: "#60a5fa",
    border: "1px solid rgba(96,165,250,0.25)", fontWeight: "500",
  },
};

// ─── MODAL MODIFICATION UTILISATEUR ────────────────────────────
const UserModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({ role: user.role, statut: user.statut });

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalTitle}>Modifier — {user.nom}</div>

        <label style={S.label}>Rôle</label>
        <select style={{ ...S.formInput }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <label style={S.label}>Statut</label>
        <select style={{ ...S.formInput }} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
          {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
          <button style={S.btn("ghost")} onClick={onClose}>Annuler</button>
          <button style={S.btn("primary")} onClick={() => { onSave(user.id, form); onClose(); }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE UTILISATEURS ─────────────────────────────────────────
const PageUsers = () => {
  const [users, setUsers] = useState(MOCK_USERS);
  const [filterRole, setFilterRole] = useState("tous");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  const filtered = users.filter((u) => {
    const matchRole = filterRole === "tous" || u.role === filterRole;
    const matchStatut = filterStatut === "tous" || u.statut === filterStatut;
    const matchSearch = u.nom.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchStatut && matchSearch;
  });

  const handleSave = (id, form) => {
    // TODO: appeler PUT /admin/users/${id} et PUT /admin/users/${id}/role
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...form } : u));
  };

  const handleDelete = (id) => {
    // TODO: appeler DELETE /admin/users/${id}
    if (window.confirm("Supprimer cet utilisateur et toutes ses données ?")) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const handleSuspend = (id) => {
    // TODO: appeler PUT /admin/users/${id} avec statut suspendu/actif
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, statut: u.statut === "actif" ? "suspendu" : "actif" } : u));
  };

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <div style={S.pageTitle}>Utilisateurs</div>
          <div style={S.pageSub}>{filtered.length} résultat{filtered.length !== 1 ? "s" : ""} · {users.length} total</div>
        </div>
        <div style={S.filters}>
          <input style={S.input} placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={S.select} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="tous">Tous les rôles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select style={S.select} value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
            <option value="tous">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="suspendu">Suspendu</option>
          </select>
        </div>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Utilisateur</th>
              <th style={S.th}>Rôle</th>
              <th style={S.th}>Statut</th>
              <th style={S.th}>Quota</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const rc = ROLE_COLORS[user.role];
              const pct = Math.round((user.quota_used / user.quota) * 100);
              return (
                <tr
                  key={user.id}
                  style={S.tr(hoveredRow === user.id)}
                  onMouseEnter={() => setHoveredRow(user.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={S.td}>
                    <div style={{ color: "#e2e4ed", fontWeight: "500" }}>{user.nom}</div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{user.email}</div>
                  </td>
                  <td style={S.td}>
                    <span style={S.badge(rc.color, rc.bg, rc.border)}>{user.role}</span>
                  </td>
                  <td style={S.td}>
                    <span style={S.badge(
                      user.statut === "actif" ? "#2dd4a0" : "#f87171",
                      user.statut === "actif" ? "rgba(45,212,160,0.1)" : "rgba(248,113,113,0.1)",
                      user.statut === "actif" ? "rgba(45,212,160,0.2)" : "rgba(248,113,113,0.2)"
                    )}>{user.statut}</span>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>{user.quota_used} / {user.quota} Go · {pct}%</div>
                    <div style={S.quotaBar(pct)}><div style={S.quotaFill(pct)} /></div>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={S.btn("ghost")} onClick={() => setEditUser(user)}>Modifier</button>
                      <button style={S.btn("ghost")} onClick={() => handleSuspend(user.id)}>
                        {user.statut === "actif" ? "Suspendre" : "Réactiver"}
                      </button>
                      <button style={S.btn("danger")} onClick={() => handleDelete(user.id)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editUser && <UserModal user={editUser} onClose={() => setEditUser(null)} onSave={handleSave} />}
    </div>
  );
};

// ─── PAGE QUOTAS ───────────────────────────────────────────────
const PageQuotas = () => {
  const [users, setUsers] = useState(MOCK_USERS);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [hoveredRow, setHoveredRow] = useState(null);

  const handleQuotaSave = (id) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) return;
    // TODO: appeler PUT /admin/users/${id}/quota avec { quota: val }
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, quota: val } : u));
    setEditingId(null);
  };

  const sorted = [...users].sort((a, b) => (b.quota_used / b.quota) - (a.quota_used / a.quota));

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <div style={S.pageTitle}>Quotas de stockage</div>
          <div style={S.pageSub}>Modification inline · Quota par défaut 2 Go</div>
        </div>
        <div style={{ fontSize: "11px", color: "#6b7280" }}>
          Total consommé : {users.reduce((a, u) => a + u.quota_used, 0).toFixed(1)} Go
          {" / "}
          {users.reduce((a, u) => a + u.quota, 0)} Go alloués
        </div>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Utilisateur</th>
              <th style={S.th}>Rôle</th>
              <th style={S.th}>Consommé</th>
              <th style={S.th}>Quota alloué</th>
              <th style={S.th}>Utilisation</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((user) => {
              const pct = Math.round((user.quota_used / user.quota) * 100);
              const rc = ROLE_COLORS[user.role];
              return (
                <tr
                  key={user.id}
                  style={S.tr(hoveredRow === user.id)}
                  onMouseEnter={() => setHoveredRow(user.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={S.td}>
                    <div style={{ color: "#e2e4ed", fontWeight: "500" }}>{user.nom}</div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{user.email}</div>
                  </td>
                  <td style={S.td}>
                    <span style={S.badge(rc.color, rc.bg, rc.border)}>{user.role}</span>
                  </td>
                  <td style={S.td}>
                    <span style={{ color: "#e2e4ed" }}>{user.quota_used} Go</span>
                  </td>
                  <td style={S.td}>
                    {editingId === user.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          style={{ ...S.input, width: "80px", padding: "4px 8px" }}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") handleQuotaSave(user.id); if (e.key === "Escape") setEditingId(null); }}
                        />
                        <span style={{ fontSize: "11px", color: "#6b7280" }}>Go</span>
                        <button style={S.btn("primary")} onClick={() => handleQuotaSave(user.id)}>✓</button>
                        <button style={S.btn("ghost")} onClick={() => setEditingId(null)}>✕</button>
                      </div>
                    ) : (
                      <span
                        style={{ color: "#e2e4ed", cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.2)" }}
                        onClick={() => { setEditingId(user.id); setEditValue(String(user.quota)); }}
                      >
                        {user.quota} Go
                      </span>
                    )}
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ ...S.quotaBar(pct), width: "100px" }}>
                        <div style={S.quotaFill(pct)} />
                      </div>
                      <span style={{ fontSize: "11px", color: pct > 85 ? "#f87171" : "#6b7280", minWidth: "36px" }}>
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td style={S.td}>
                    {pct > 85 && (
                      <span style={{ fontSize: "10px", color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                        CRITIQUE
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── PAGE JOURNAUX ─────────────────────────────────────────────
const PageLogs = () => {
  const [logs] = useState(MOCK_LOGS);
  const [filterAction, setFilterAction] = useState("tous");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const actions = ["tous", ...new Set(logs.map((l) => l.action))];

  const filtered = logs.filter((l) => {
    const matchAction = filterAction === "tous" || l.action === filterAction;
    const matchStatut = filterStatut === "tous" || l.statut === filterStatut;
    const matchSearch = l.user_email.toLowerCase().includes(search.toLowerCase()) || l.detail.toLowerCase().includes(search.toLowerCase());
    return matchAction && matchStatut && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const exportCSV = () => {
    // TODO: appeler GET /logs/?export=csv depuis ZT-02
    const header = "id,user_email,action,statut,date,detail";
    const rows = filtered.map((l) => `${l.id},${l.user_email},${l.action},${l.statut},${l.date},${l.detail}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "transferly_logs.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <div style={S.pageTitle}>Journaux système</div>
          <div style={S.pageSub}>{filtered.length} entrée{filtered.length !== 1 ? "s" : ""} · Historique complet des actions</div>
        </div>
        <div style={S.filters}>
          <input style={S.input} placeholder="Rechercher..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select style={S.select} value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}>
            {actions.map((a) => <option key={a} value={a}>{a === "tous" ? "Toutes les actions" : a}</option>)}
          </select>
          <select style={S.select} value={filterStatut} onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}>
            <option value="tous">Tous les statuts</option>
            <option value="succes">Succès</option>
            <option value="echec">Échec</option>
          </select>
          <button style={S.exportBtn} onClick={exportCSV}>↓ EXPORT CSV</button>
        </div>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>#</th>
              <th style={S.th}>Utilisateur</th>
              <th style={S.th}>Action</th>
              <th style={S.th}>Statut</th>
              <th style={S.th}>Détail</th>
              <th style={S.th}>Date & Heure</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((log) => (
              <tr key={log.id}>
                <td style={{ ...S.td, color: "#4b5563", fontSize: "11px" }}>{log.id}</td>
                <td style={S.td}>
                  <span style={{ color: "#e2e4ed", fontSize: "12px" }}>{log.user_email}</span>
                </td>
                <td style={S.td}>
                  <span style={{
                    fontSize: "10px", padding: "2px 8px", borderRadius: "4px",
                    background: "rgba(255,255,255,0.06)", color: "#9ca3af",
                    border: "1px solid rgba(255,255,255,0.08)", letterSpacing: "0.04em",
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={S.td}>
                  <span style={S.badge(
                    log.statut === "succes" ? "#2dd4a0" : "#f87171",
                    log.statut === "succes" ? "rgba(45,212,160,0.1)" : "rgba(248,113,113,0.1)",
                    log.statut === "succes" ? "rgba(45,212,160,0.2)" : "rgba(248,113,113,0.2)"
                  )}>{log.statut}</span>
                </td>
                <td style={{ ...S.td, color: "#6b7280", fontSize: "11px" }}>{log.detail}</td>
                <td style={{ ...S.td, color: "#4b5563", fontSize: "11px" }}>{formatTime(log.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={S.pagination}>
          <span style={{ fontSize: "11px", color: "#4b5563", marginRight: "8px" }}>
            Page {page} / {totalPages}
          </span>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <div key={p} style={S.pageBtn(p === page)} onClick={() => setPage(p)}>{p}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────
const AdminPages = () => {
  const [activeTab, setActiveTab] = useState("users");

  const tabs = [
    { id: "users", label: "UTILISATEURS" },
    { id: "quotas", label: "QUOTAS" },
    { id: "logs", label: "JOURNAUX" },
  ];

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        select option { background: #13161e; color: #e2e4ed; }
        input::placeholder { color: #4b5563; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0d0f16; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 2px; }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* Topbar */}
      <div style={S.topbar}>
        <div style={S.topbarLogo}>
          &lt; Trans<span style={{ color: "#2dd4a0" }}>ferly</span> /&gt;
        </div>
        {tabs.map((tab) => (
          <div key={tab.id} style={S.tab(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#4b5563" }}>
          {/* TODO: afficher g.user.email depuis le contexte auth */}
          admin@transferly.ma
        </div>
      </div>

      {/* Contenu */}
      {activeTab === "users" && <PageUsers />}
      {activeTab === "quotas" && <PageQuotas />}
      {activeTab === "logs" && <PageLogs />}
    </div>
  );
};

export default AdminPages;
