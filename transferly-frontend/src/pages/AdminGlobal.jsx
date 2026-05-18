import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/auth";
import { formatAction } from "../utils/formatAction";
import { formatRelativeTime } from '../utils/formatTime';

// ─── CONFIG ────────────────────────────────────────────────────
const REFRESH_INTERVAL = 30000; // 30 secondes

// ─── PALETTE & STYLES ──────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0c10",
    color: "#e8eaf0",
    fontFamily: "'DM Mono', monospace",
    padding: "0",
  },
  sidebar: {
    position: "fixed",
    left: 0,
    top: 0,
    width: "220px",
    height: "100vh",
    background: "#0f1117",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    padding: "32px 0",
    zIndex: 100,
  },
  logo: {
    padding: "0 24px 32px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    marginBottom: "24px",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#fff",
    letterSpacing: "-0.5px",
  },
  logoAccent: { color: "#2dd4a0" },
  navItem: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 24px",
    fontSize: "12px",
    color: active ? "#2dd4a0" : "#6b7280",
    background: active ? "rgba(45,212,160,0.08)" : "transparent",
    borderLeft: active ? "2px solid #2dd4a0" : "2px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s",
    textDecoration: "none",
    letterSpacing: "0.04em",
  }),
  main: {
    marginLeft: "220px",
    padding: "40px 48px",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "40px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#fff",
    letterSpacing: "-0.5px",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "12px",
    color: "#6b7280",
    letterSpacing: "0.04em",
  },
  refreshBadge: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    border: "1px solid rgba(45,212,160,0.25)",
    borderRadius: "20px",
    background: "rgba(45,212,160,0.08)",
    fontSize: "11px",
    color: "#2dd4a0",
    letterSpacing: "0.04em",
  }),
  pulse: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#2dd4a0",
    animation: "pulse 1.5s ease infinite",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "32px",
  },
  metricCard: (color) => ({
    background: "#13161e",
    border: `1px solid ${color}30`,
    borderRadius: "12px",
    padding: "24px",
    position: "relative",
    overflow: "hidden",
  }),
  metricAccent: (color) => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "2px",
    background: color,
  }),
  metricLabel: {
    fontSize: "10px",
    color: "#6b7280",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "12px",
  },
  metricValue: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#fff",
    letterSpacing: "-1px",
    marginBottom: "4px",
  },
  metricSub: {
    fontSize: "11px",
    color: "#6b7280",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "32px",
  },
  card: {
    background: "#13161e",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "18px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: "11px",
    color: "#9ca3af",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: "500",
  },
  cardBody: {
    padding: "16px 24px",
  },
  logRow: (index) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
  }),
  logAction: (statut) => ({
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "4px",
    fontWeight: "500",
    letterSpacing: "0.04em",
    background: statut === "succes"
      ? "rgba(45,212,160,0.12)"
      : "rgba(248,113,113,0.12)",
    color: statut === "succes" ? "#2dd4a0" : "#f87171",
    border: `1px solid ${statut === "succes" ? "rgba(45,212,160,0.2)" : "rgba(248,113,113,0.2)"}`,
    flexShrink: 0,
  }),
  logText: {
    fontSize: "12px",
    color: "#9ca3af",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  logTime: {
    fontSize: "11px",
    color: "#4b5563",
    flexShrink: 0,
  },
  shortcutsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "32px",
  },
  shortcut: {
    background: "#13161e",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px",
    padding: "20px",
    cursor: "pointer",
    transition: "all 0.2s",
    textDecoration: "none",
    display: "block",
  },
  shortcutIcon: {
    fontSize: "20px",
    marginBottom: "10px",
  },
  shortcutLabel: {
    fontSize: "12px",
    color: "#fff",
    fontWeight: "500",
    marginBottom: "4px",
  },
  shortcutDesc: {
    fontSize: "11px",
    color: "#6b7280",
  },
  progressBar: (pct, color) => ({
    height: "6px",
    background: "rgba(255,255,255,0.06)",
    borderRadius: "3px",
    overflow: "hidden",
    marginTop: "8px",
  }),
  progressFill: (pct, color) => ({
    height: "100%",
    width: `${Math.min(pct, 100)}%`,
    background: color,
    borderRadius: "3px",
    transition: "width 0.8s ease",
  }),
  loader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "200px",
    color: "#4b5563",
    fontSize: "12px",
    letterSpacing: "0.08em",
  },
  countdown: {
    fontSize: "10px",
    color: "#4b5563",
    marginLeft: "6px",
  },
};

// ─── UTILS ─────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const mb = Number(bytes);
  if (mb < 0.001) return `${(mb * 1024 * 1024).toFixed(0)} KB`;
  if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};



// ─── HOOKS ─────────────────────────────────────────────────────
const useDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, usersRes, filesRes] = await Promise.all([
        API.get("/logs/?limit=100"),
        API.get("/admin/users"),
        API.get("/files/"),
      ]);
      const logsData  = logsRes.data;
      const usersData = usersRes.data;
      const filesData = filesRes.data.files || [];

      const espaceConsomme    = usersData.reduce((s, u) => s + (u.quota_utilise || 0) * 1024 ** 3, 0);
      const espaceTotal       = usersData.reduce((s, u) => s + (u.quota         || 0) * 1024 ** 3, 0);
      const tentativesEchecs  = logsData.filter(l => l.statut === "echec").length;

      setMetrics({
        users_actifs:      usersData.length,
        espace_consomme:   espaceConsomme,
        espace_total:      espaceTotal || 500 * 1024 ** 3,
        total_fichiers:    filesData.length,
        tentatives_echecs: tentativesEchecs,
      });
      setLogs(logsData.slice(0, 10));
    } catch (err) {
      console.error("Erreur fetch dashboard:", err);
    } finally {
      setLoading(false);
      setCountdown(30);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return { metrics, logs, loading, countdown, refresh: fetchData };
};

// ─── COMPOSANTS ────────────────────────────────────────────────
const MetricCard = ({ label, value, sub, color, progress }) => (
  <div style={styles.metricCard(color)}>
    <div style={styles.metricAccent(color)} />
    <div style={styles.metricLabel}>{label}</div>
    <div style={styles.metricValue}>{value}</div>
    {sub && <div style={styles.metricSub}>{sub}</div>}
    {progress !== undefined && (
      <div style={styles.progressBar(progress, color)}>
        <div style={styles.progressFill(progress, color)} />
      </div>
    )}
  </div>
);

const LogRow = ({ log, index }) => (
  <div style={styles.logRow(index)}>
    <span style={styles.logAction(log.statut)}>{log.statut}</span>
    <span style={styles.logText}>
      <span style={{ color: "#e8eaf0" }}>{log.user_email}</span>
      {" — "}
      {formatAction(log.action)}
    </span>
    <span style={styles.logTime}>{formatTime(log.date)}</span>
  </div>
);

const Shortcut = ({ icon, label, desc, onClick }) => (
  <div style={styles.shortcut} onClick={onClick}>
    <div style={styles.shortcutIcon}>{icon}</div>
    <div style={styles.shortcutLabel}>{label}</div>
    <div style={styles.shortcutDesc}>{desc}</div>
  </div>
);

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────
const AdminGlobal = ({ onNavigate }) => {
  const { metrics, logs, loading, countdown, refresh } = useDashboard();
  const [activeNav, setActiveNav] = useState("dashboard");
  const navigate = useNavigate();

  const [adminEmail, setAdminEmail] = useState(localStorage.getItem('email') || '');
  const [adminRole,  setAdminRole]  = useState(localStorage.getItem('role')  || '');

  useEffect(() => {
    if (!adminEmail) {
      API.get('/me')
        .then(res => {
          const { email, role } = res.data;
          if (email) { setAdminEmail(email); localStorage.setItem('email', email); }
          if (role)  { setAdminRole(role);   localStorage.setItem('role',  role);  }
        })
        .catch(() => {});
    }
  }, [adminEmail]);

  const navItems = [
    { id: "dashboard", label: "TABLEAU DE BORD", icon: "▦" },
    { id: "users", label: "UTILISATEURS", icon: "◈" },
    { id: "espaces", label: "ESPACES", icon: "◉" },
    { id: "logs", label: "JOURNAUX", icon: "◫" },
  ];

  const pctEspace = metrics
    ? Math.round((metrics.espace_consomme / metrics.espace_total) * 100)
    : 0;

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f1117; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 2px; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoText}>
            &lt; Trans<span style={styles.logoAccent}>ferly</span> /&gt;
          </div>
          <div style={{ fontSize: "10px", color: "#4b5563", marginTop: "4px", letterSpacing: "0.06em" }}>
            ADMIN GLOBAL
          </div>
        </div>

        {navItems.map((item) => (
          <div
            key={item.id}
            style={styles.navItem(activeNav === item.id)}
            onClick={() => {
              setActiveNav(item.id);
              onNavigate && onNavigate(item.id);
            }}
          >
            <span style={{ fontSize: "14px" }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        <div style={{ marginTop: "auto", padding: "24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: "10px", color: "#4b5563", letterSpacing: "0.06em" }}>
            CONNECTÉ EN TANT QUE
          </div>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
            {adminEmail || '—'}
          </div>
          {adminRole && (
            <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
              {adminRole}
            </div>
          )}
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <main style={styles.main}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Tableau de bord</div>
            <div style={styles.subtitle}>
              Vue globale de la plateforme · Actualisation toutes les 30s
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={styles.refreshBadge(true)}>
              <div style={styles.pulse} />
              LIVE
              <span style={styles.countdown}>{countdown}s</span>
            </div>
            <button
              onClick={refresh}
              style={{
                padding: "6px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                color: "#9ca3af",
                fontSize: "11px",
                cursor: "pointer",
                letterSpacing: "0.04em",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              ↻ RAFRAÎCHIR
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.loader}>CHARGEMENT DES DONNÉES...</div>
        ) : (
          <>
            {/* ── Métriques ── */}
            <div style={styles.metricsGrid}>
              <MetricCard
                label="UTILISATEURS ACTIFS"
                value={metrics?.users_actifs ?? "—"}
                sub="sur la plateforme"
                color="#2dd4a0"
              />
              <MetricCard
                label="ESPACE CONSOMMÉ"
                value={formatBytes(metrics?.espace_consomme)}
                sub={`sur ${formatBytes(metrics?.espace_total)} · ${pctEspace}%`}
                color="#60a5fa"
                progress={pctEspace}
              />
              <MetricCard
                label="TOTAL FICHIERS"
                value={metrics?.total_fichiers?.toLocaleString() ?? "—"}
                sub="stockés sur la plateforme"
                color="#a78bfa"
              />
              <MetricCard
                label="TENTATIVES ÉCHOUÉES"
                value={metrics?.tentatives_echecs ?? "—"}
                sub="dans les dernières 24h"
                color="#f87171"
              />
            </div>

            {/* ── Raccourcis ── */}
            <div style={styles.shortcutsGrid}>
              <Shortcut
                icon="◈"
                label="Gérer les utilisateurs"
                desc="Créer, modifier, supprimer des comptes"
                onClick={() => { setActiveNav("users"); onNavigate && onNavigate("users"); }}
              />
              <Shortcut
                icon="◉"
                label="Gestion des espaces"
                desc="Superviser et modérer les espaces collaboratifs"
                onClick={() => navigate('/admin-espaces-all')}
              />
              <Shortcut
                icon="◫"
                label="Consulter les journaux"
                desc="Historique complet des actions"
                onClick={() => { setActiveNav("logs"); onNavigate && onNavigate("logs"); }}
              />
            </div>

            {/* ── Activité récente ── */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>ACTIVITÉ RÉCENTE</span>
                <span style={{ fontSize: "11px", color: "#4b5563" }}>
                  10 dernières actions
                </span>
              </div>
              <div style={styles.cardBody}>
                {logs.length === 0 ? (
                  <div style={{ ...styles.logTime, padding: "20px 0" }}>
                    Aucune activité récente
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <LogRow key={log.id} log={log} index={i} />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminGlobal;
