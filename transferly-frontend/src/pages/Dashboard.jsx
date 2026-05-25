import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, HardDrive, FileText, FolderOpen, AlertTriangle,
  Upload, Plus, ArrowRight, Download, Share,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { colorFromName } from '../utils/colorFromName';
import { getFileTypeColor } from '../utils/fileType';
import { formatRelativeTime } from '../utils/formatTime';

/* ── Styles partagés ──────────────────────────────────────── */
const colHeaderStyle = {
  fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px',
  color: 'var(--wings-text-muted)', opacity: 0.6, textTransform: 'uppercase',
};

const cardBase = {
  background: 'var(--wings-surface)',
  border: '0.5px solid var(--wings-border)',
  borderRadius: 14, padding: 20,
};

/* ── Label de section (chip mono) ────────────────────────── */
function SectionLabel({ text, color }) {
  return (
    <span style={{
      fontFamily: 'monospace', fontSize: '9px', letterSpacing: '3px',
      textTransform: 'uppercase', color,
      border: `0.5px solid ${color}`, borderRadius: 4,
      padding: '2px 6px', marginLeft: 12, verticalAlign: 'middle', opacity: 0.85,
    }}>
      {text}
    </span>
  );
}

/* ── Donut SVG (sans dépendance externe) ─────────────────── */
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0 || data.length === 0) {
    return (
      <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13, fontStyle: 'italic' }}>
        Pas assez de données
      </div>
    );
  }

  const SIZE = 110, CX = 55, CY = 55, R = 42, IR = 26;
  let angle = -Math.PI / 2;

  const segments = data.filter(d => d.value > 0).map(d => {
    const frac = d.value / total;
    const a0 = angle;
    angle += frac * 2 * Math.PI;
    const a1 = angle;
    const large = frac > 0.5 ? 1 : 0;
    const path = [
      `M ${CX + R * Math.cos(a0)} ${CY + R * Math.sin(a0)}`,
      `A ${R} ${R} 0 ${large} 1 ${CX + R * Math.cos(a1)} ${CY + R * Math.sin(a1)}`,
      `L ${CX + IR * Math.cos(a1)} ${CY + IR * Math.sin(a1)}`,
      `A ${IR} ${IR} 0 ${large} 0 ${CX + IR * Math.cos(a0)} ${CY + IR * Math.sin(a0)}`,
      'Z',
    ].join(' ');
    return { ...d, path, pct: Math.round(frac * 100) };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
        {segments.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--wings-text)', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span style={{ fontSize: 11, color: 'var(--wings-text-muted)', fontFamily: 'monospace' }}>
              {s.value} ({s.pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────── */
function StatCard({ icon: Icon, iconColor, iconBg, label, value, suffix, bar, barPct, barLabel }) {
  return (
    <div style={cardBase}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={16} color={iconColor} />
        </div>
        <span style={{ ...colHeaderStyle, opacity: 0.45, textAlign: 'right', maxWidth: 120 }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, color: 'var(--wings-text)', fontWeight: 400, lineHeight: 1 }}>
        {value}
        {suffix && <span style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'var(--wings-text-muted)', marginLeft: 5 }}>{suffix}</span>}
      </div>
      {bar && (
        <>
          <div style={{ marginTop: 10, height: 4, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${Math.min(100, barPct ?? 0)}%`,
              background: (barPct ?? 0) >= 90 ? '#e57373' : (barPct ?? 0) >= 80 ? 'var(--wings-gold)' : 'var(--wings-blue)',
              transition: 'width 0.4s',
            }} />
          </div>
          {barLabel && <div style={{ color: 'var(--wings-text-muted)', fontSize: 11, marginTop: 4 }}>{barLabel}</div>}
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   SECTION ADMIN
   ════════════════════════════════════════════════ */
function AdminSection({ allUsers, adminFiles, espacesCount, navigate }) {
  const totalUsers = allUsers.length;
  const totalFiles = adminFiles.length;
  const storageMb  = adminFiles.reduce((s, f) => s + (f.taille || 0), 0);
  const storageGo  = (storageMb / 1024).toFixed(2);

  // Répartition des types de fichiers
  const fileTypeData = useMemo(() => {
    const counts = {};
    adminFiles.forEach(f => {
      const ext = (f.nom || '').split('.').pop()?.toUpperCase() || 'AUTRE';
      counts[ext] = (counts[ext] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6);
    const otherCount = sorted.slice(6).reduce((sum, [, c]) => sum + c, 0);
    if (otherCount > 0) top.push(['AUTRES', otherCount]);
    return top.map(([type, count]) => ({
      name: type,
      value: count,
      color: getFileTypeColor(`x.${type.toLowerCase()}`).color,
    }));
  }, [adminFiles]);

  // Alertes quota (>= 80%)
  const alerts = allUsers.filter(u => u.quota > 0 && (u.quota_utilise / u.quota) >= 0.8);

  const adminCards = [
    { icon: Users,      iconColor: 'var(--wings-blue)',  iconBg: 'rgba(79,139,255,0.1)',  label: 'Utilisateurs inscrits', value: totalUsers },
    { icon: FileText,   iconColor: 'var(--wings-gold)',  iconBg: 'rgba(255,193,7,0.1)',   label: 'Fichiers stockés',      value: totalFiles },
    { icon: HardDrive,  iconColor: '#c97b63',             iconBg: 'rgba(201,123,99,0.1)', label: 'Stockage utilisé',      value: storageGo, suffix: 'Go' },
    { icon: FolderOpen, iconColor: '#6b9b78',             iconBg: 'rgba(107,155,120,0.1)',label: 'Espaces actifs',        value: espacesCount },
  ];

  const shortcuts = [
    { to: '/admin-users',        Icon: Users,      label: 'Utilisateurs' },
    { to: '/admin-espaces-all',  Icon: FolderOpen, label: 'Espaces' },
    { to: '/admin-fichiers-all', Icon: FileText,   label: 'Fichiers' },
    { to: '/admin-quotas',       Icon: HardDrive,  label: 'Quotas' },
  ];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
          Administration plateforme
          <SectionLabel text="ADMIN" color="var(--wings-gold)" />
        </h2>
      </div>

      {/* Cards stats (4 colonnes) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {adminCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Répartition fichiers + Alertes quota */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <div style={cardBase}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
              Répartition des fichiers
            </h3>
            <p style={{ fontSize: 11, color: 'var(--wings-text-muted)', fontStyle: 'italic', margin: '3px 0 0' }}>
              Par type d'extension
            </p>
          </div>
          {fileTypeData.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
              Aucun fichier sur la plateforme
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={fileTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {fileTypeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--wings-surface)',
                      border: '0.5px solid var(--wings-border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value, name) => [`${value} fichier${value > 1 ? 's' : ''}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 16, flex: 1 }}>
                {fileTypeData.map(({ name, value, color }) => {
                  const total = fileTypeData.reduce((s, d) => s + d.value, 0);
                  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--wings-text)', fontWeight: 500, minWidth: 50 }}>{name}</span>
                      <span style={{ color: 'var(--wings-text)', fontFamily: 'monospace' }}>{value}</span>
                      <span style={{ color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11 }}>({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ ...cardBase, border: '0.5px solid rgba(229,115,115,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={14} style={{ color: '#e57373', flexShrink: 0 }} />
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
              Quotas élevés
            </h3>
          </div>
          {alerts.length === 0 ? (
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
              Tous les utilisateurs sont sous 80 %
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alerts.slice(0, 6).map(u => {
                const pct = Math.round((u.quota_utilise / u.quota) * 100);
                const barColor = pct >= 90 ? '#e57373' : 'var(--wings-gold)';
                return (
                  <div key={u.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--wings-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {u.nom || u.email}
                      </span>
                      <span style={{ fontSize: 11, color: barColor, fontFamily: 'monospace', flexShrink: 0 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: barColor, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Raccourcis admin (4 colonnes) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {shortcuts.map(({ to, Icon, label }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 14, background: 'transparent',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 12, cursor: 'pointer',
              color: 'var(--wings-text)', fontSize: 13,
              transition: 'all 0.15s', textAlign: 'left',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--wings-gold)';
              e.currentTarget.style.background = 'rgba(255,193,7,0.04)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--wings-border)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Icon size={14} style={{ color: 'var(--wings-text-muted)', flexShrink: 0 }} />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════
   SECTION USER
   ════════════════════════════════════════════════ */
function UserSection({ email, myFiles, myEspaces, sharedWithMe, quota, navigate }) {
  const initial  = (email || '?')[0].toUpperCase();
  const pct      = Math.round(quota.pourcentage_utilise ?? 0);
  const usedGb   = (quota.quota_utilise_gb ?? 0).toFixed(2);
  const totalGb  = quota.quota_total_gb ?? 0;

  // Répartition par type de fichier
  const typeCounts = myFiles.reduce((acc, f) => {
    const ext = (f.nom?.split('.').pop() || 'autre').toLowerCase();
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([ext, count]) => {
      const c = getFileTypeColor(`f.${ext}`);
      return { label: ext.toUpperCase(), value: count, color: c.color };
    });

  // 5 derniers fichiers triés par date
  const recentFiles = [...myFiles]
    .sort((a, b) => new Date(b.date_creation || 0) - new Date(a.date_creation || 0))
    .slice(0, 5);

  const userCards = [
    {
      icon: FileText,   iconColor: 'var(--wings-blue)',  iconBg: 'rgba(79,139,255,0.1)',
      label: 'Fichiers personnels', value: myFiles.length,
    },
    {
      icon: HardDrive,  iconColor: '#c97b63',             iconBg: 'rgba(201,123,99,0.1)',
      label: 'Stockage utilisé', value: usedGb, suffix: `/ ${totalGb} Go`,
      bar: true, barPct: pct, barLabel: `${pct} % utilisé`,
    },
    {
      icon: FolderOpen, iconColor: 'var(--wings-gold)',  iconBg: 'rgba(255,193,7,0.1)',
      label: 'Espaces collaboratifs', value: myEspaces.length,
    },
  ];

  const handleDownload = async (f) => {
    try {
      const res = await API.get(`/files/${f.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = f.nom; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silently ignore */ }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
          Mon espace
          <SectionLabel text="USER" color="var(--wings-blue)" />
        </h2>
      </div>

      {/* Avatar + identité */}
      <div style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'var(--wings-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400 }}>{initial}</span>
        </div>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: 'var(--wings-text)', fontWeight: 400 }}>
            {email?.split('@')[0] || 'Utilisateur'}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--wings-text-muted)', marginTop: 3 }}>
            {email}
          </div>
        </div>
      </div>

      {/* Stat cards (3 colonnes) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {userCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Répartition types + Derniers fichiers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={cardBase}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 16 }}>
            Répartition par type
          </h3>
          {myFiles.length < 3 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13, fontStyle: 'italic' }}>
              Pas assez de données
            </div>
          ) : (
            <DonutChart data={typeData} />
          )}
        </div>

        <div style={cardBase}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 16 }}>
            Mes derniers fichiers
          </h3>
          {recentFiles.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13, fontStyle: 'italic' }}>
              Aucun fichier
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentFiles.map(f => {
                const fc = getFileTypeColor(f.nom);
                const mb = f.taille ?? 0;
                const sizeStr = mb < 0.01 ? `${(mb * 1024).toFixed(0)} Ko` : `${mb.toFixed(1)} Mo`;
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, background: fc.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <FileText size={12} color={fc.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--wings-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.nom}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--wings-text-muted)', fontFamily: 'monospace' }}>
                        {sizeStr} · {formatRelativeTime(f.date_creation)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(f)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--wings-text-muted)', flexShrink: 0, display: 'flex' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-blue)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                    >
                      <Download size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mes espaces récents + Partagés avec moi */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={cardBase}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 16 }}>
            Mes espaces
          </h3>
          {myEspaces.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13, fontStyle: 'italic' }}>
              Aucun espace
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myEspaces.slice(0, 4).map(esp => {
                const pal = colorFromName(esp.nom);
                return (
                  <div
                    key={esp.id}
                    onClick={() => navigate(`/espace/${esp.id}`)}
                    role="button"
                    tabIndex={0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      border: '0.5px solid var(--wings-border)',
                      borderRadius: 10, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={ev => {
                      ev.currentTarget.style.borderColor = pal.accent;
                      ev.currentTarget.style.background = pal.faint;
                    }}
                    onMouseLeave={ev => {
                      ev.currentTarget.style.borderColor = 'var(--wings-border)';
                      ev.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: pal.faint, border: `0.5px solid ${pal.accent}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <FolderOpen size={13} style={{ color: pal.accent }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--wings-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {esp.nom}
                      </div>
                      {esp.nb_fichiers !== undefined && (
                        <div style={{ fontSize: 11, color: 'var(--wings-text-muted)', fontFamily: 'monospace' }}>
                          {esp.nb_fichiers} fichier{esp.nb_fichiers !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <ArrowRight size={12} style={{ color: 'var(--wings-text-muted)', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={cardBase}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 16 }}>
            Partagés avec moi
          </h3>
          {sharedWithMe.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13, fontStyle: 'italic' }}>
              Personne ne t'a partagé de fichier
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sharedWithMe.slice(0, 5).map(f => {
                const fc = getFileTypeColor(f.nom);
                const by = f.shared_by || f.user_email || f.partageur_email || null;
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, background: fc.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <FileText size={12} color={fc.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--wings-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.nom}
                      </div>
                      {by && (
                        <div style={{ fontSize: 11, color: 'var(--wings-text-muted)' }}>
                          Partagé par {by}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </section>
  );
}

/* ════════════════════════════════════════════════
   ROOT — Dashboard adaptatif
   ════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate    = useNavigate();
  const role        = localStorage.getItem('role');
  const email       = localStorage.getItem('email') || '';
  const isAdmin     = role === 'AdminGlobal';

  const [allUsers,     setAllUsers]     = useState([]);
  const [adminFiles,   setAdminFiles]   = useState([]);
  const [espacesCount, setEspacesCount] = useState(0);
  const [myFiles,      setMyFiles]      = useState([]);
  const [myEspaces,    setMyEspaces]    = useState([]);
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [quota,        setQuota]        = useState({ quota_utilise_gb: 0, quota_total_gb: 0, pourcentage_utilise: 0 });

  // Données admin (seulement si AdminGlobal)
  useEffect(() => {
    if (!isAdmin) return;
    API.get('/admin/users?per_page=200')
      .then(r => setAllUsers(r.data.users || []))
      .catch(() => {});
    API.get('/admin/files')
      .then(r => setAdminFiles(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    API.get('/admin/espaces')
      .then(r => {
        const list = r.data.espaces || (Array.isArray(r.data) ? r.data : []);
        setEspacesCount(list.length);
      })
      .catch(() => {});
  }, [isAdmin]);

  // Données utilisateur (toujours)
  useEffect(() => {
    API.get('/files/')
      .then(r => setMyFiles(Array.isArray(r.data) ? r.data : (r.data?.files || [])))
      .catch(() => {});
    API.get('/espaces/all-mine')
      .then(r => setMyEspaces(Array.isArray(r.data) ? r.data : (r.data?.espaces || [])))
      .catch(() => {});
    API.get('/files/shared-with-me')
      .then(r => setSharedWithMe(Array.isArray(r.data) ? r.data : (r.data?.files || [])))
      .catch(() => {});
    API.get('/quota/me')
      .then(r => setQuota(r.data || {}))
      .catch(() => {});
  }, []);

  return (
    <AppLayout>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {isAdmin && (
          <AdminSection
            allUsers={allUsers}
            adminFiles={adminFiles}
            espacesCount={espacesCount}
            navigate={navigate}
          />
        )}
        <UserSection
          email={email}
          myFiles={myFiles}
          myEspaces={myEspaces}
          sharedWithMe={sharedWithMe}
          quota={quota}
          navigate={navigate}
        />
      </div>
    </AppLayout>
  );
}
