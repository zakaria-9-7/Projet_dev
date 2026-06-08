import { useState, useEffect, useCallback } from 'react';
import { HardDrive, RefreshCw, X, CheckCircle2, FolderOpen } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import SearchBar from '../components/SearchBar';
import { useDebounced } from '../hooks/useDebounced';

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 12,
      background: type === 'success' ? '#059669' : '#dc2626',
      color: '#fff', fontSize: 13, fontWeight: 500,
    }}>
      {type === 'success' ? <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> : <X size={14} style={{ flexShrink: 0 }} />}
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, opacity: 0.8 }}>
        <X size={13} />
      </button>
    </div>
  );
}

function QuotaBar({ used, total }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const barColor = pct >= 80 ? 'var(--wings-gold)' : 'var(--wings-blue)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(168,180,212,0.1)' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          width: `${pct}%`,
          background: barColor,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--wings-text-muted)', fontFamily: 'monospace', flexShrink: 0, minWidth: 38, textAlign: 'right' }}>
        {pct.toFixed(0)} %
      </span>
    </div>
  );
}

function QuotaLegend({ count, label }) {
  return (
    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-6 text-xs text-slate-400 dark:text-slate-500">
      <span>{count} {label}{count !== 1 ? 's' : ''}</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> &lt; 70 %</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 70 – 90 %</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &gt; 90 %</span>
    </div>
  );
}

export default function AdminQuotas() {
  const [tab,     setTab]     = useState('users');  // 'users' | 'espaces'
  const [users,   setUsers]   = useState([]);
  const [espaces, setEspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [inputs,     setInputs]     = useState({});   // id → quota string
  const [saving,     setSaving]     = useState({});
  const [toast,      setToast]      = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounced(searchTerm, 300);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/admin/users?per_page=200');
      const list = res.data.users ?? [];
      setUsers(list);
      setInputs(prev => ({ ...prev, ...Object.fromEntries(list.map(u => [`u_${u.id}`, String(u.quota ?? 2)])) }));
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEspaces = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/admin/espaces/quotas');
      const list = res.data ?? [];
      setEspaces(list);
      setInputs(prev => ({ ...prev, ...Object.fromEntries(list.map(e => [`e_${e.id}`, String(e.quota ?? 0)])) }));
    } catch {
      setError('Impossible de charger les espaces.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    else fetchEspaces();
  }, [tab, fetchUsers, fetchEspaces]);

  const handleUpdateUser = async (user) => {
    const newQuota = parseFloat(inputs[`u_${user.id}`]);
    if (isNaN(newQuota) || newQuota <= 0) { showToast('Quota invalide (doit être > 0).', 'error'); return; }
    setSaving(s => ({ ...s, [`u_${user.id}`]: true }));
    try {
      await API.put(`/admin/users/${user.id}/quota`, { quota: newQuota });
      showToast(`Quota de ${user.nom || user.email} mis à jour (${newQuota} Go).`);
      await fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Échec de la mise à jour.', 'error');
    } finally {
      setSaving(s => ({ ...s, [`u_${user.id}`]: false }));
    }
  };

  const handleUpdateEspace = async (espace) => {
    const newQuota = parseFloat(inputs[`e_${espace.id}`]);
    if (isNaN(newQuota) || newQuota < 0) { showToast('Quota invalide (≥ 0, 0 = illimité).', 'error'); return; }
    setSaving(s => ({ ...s, [`e_${espace.id}`]: true }));
    try {
      await API.put(`/admin/espaces/${espace.id}/quota`, { quota: newQuota });
      showToast(`Quota de l'espace "${espace.nom}" mis à jour (${newQuota === 0 ? 'illimité' : newQuota + ' Go'}).`);
      await fetchEspaces();
    } catch (err) {
      showToast(err.response?.data?.error || 'Échec de la mise à jour.', 'error');
    } finally {
      setSaving(s => ({ ...s, [`e_${espace.id}`]: false }));
    }
  };

  const fmt = (val) => `${(val ?? 0).toFixed(2)} Go`;

  const filteredUsers = users.filter(u => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      (u.nom   || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const filteredEspaces = espaces.filter(e => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      (e.nom         || '').toLowerCase().includes(q) ||
      (e.admin_nom   || '').toLowerCase().includes(q) ||
      (e.admin_email || '').toLowerCase().includes(q)
    );
  });

  const colHeaderStyle = {
    fontFamily: 'monospace',
    fontSize: '10px',
    letterSpacing: '2px',
    color: 'var(--wings-text-muted)',
    opacity: 0.6,
    textTransform: 'uppercase',
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,193,7,0.1)',
              border: '0.5px solid rgba(255,193,7,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <HardDrive size={20} style={{ color: 'var(--wings-gold)' }} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
                Gestion des quotas
              </h1>
              <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
                Consultez et ajustez l'espace de stockage alloué
              </p>
            </div>
          </div>
          <button
            onClick={() => tab === 'users' ? fetchUsers() : fetchEspaces()}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: 'transparent',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 999, color: 'var(--wings-text-muted)',
              fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1, flexShrink: 0,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>

        {/* Recherche */}
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Rechercher un utilisateur ou un espace…"
        />

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--wings-border)', marginBottom: 16 }}>
          {[
            { id: 'users',   label: 'Utilisateurs', Icon: HardDrive },
            { id: 'espaces', label: 'Espaces',      Icon: FolderOpen },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === id ? '2px solid var(--wings-gold)' : '2px solid transparent',
                color: tab === id ? 'var(--wings-text)' : 'var(--wings-text-muted)',
                fontSize: 13,
                fontWeight: tab === id ? 500 : 400,
                cursor: 'pointer',
                marginBottom: '-0.5px',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: 'rgba(229,115,115,0.08)',
            border: '0.5px solid rgba(229,115,115,0.3)',
            color: '#e57373',
          }}>
            {error}
          </div>
        )}

        {/* ── Tab Utilisateurs ── */}
        {tab === 'users' && (
          <div>
            {/* En-tête colonnes */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
              <span style={{ ...colHeaderStyle, flex: '0 0 200px' }}>Utilisateur</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 110px' }}>Utilisé</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 110px' }}>Total</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 180px' }}>Utilisation</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 140px' }}>Nouveau quota (Go)</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 120px', textAlign: 'right' }}>Action</span>
            </div>

            {/* Lignes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loading ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                  Chargement…
                </div>
              ) : users.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                  Aucun utilisateur
                </div>
              ) : filteredUsers.map(user => {
                const pct = user.quota > 0 ? (user.quota_utilise / user.quota) * 100 : 0;
                const inputBorderColor =
                  pct >= 90 ? 'rgba(229,115,115,0.5)' :
                  pct >= 70 ? 'rgba(255,193,7,0.4)' :
                              'var(--wings-border)';
                return (
                  <div key={user.id} style={{
                    display: 'flex', alignItems: 'center',
                    background: 'var(--wings-surface)',
                    border: '0.5px solid var(--wings-border)',
                    borderRadius: 12, padding: '14px 20px',
                  }}>
                    {/* UTILISATEUR */}
                    <div style={{ flex: '0 0 200px', minWidth: 0, paddingRight: 8 }}>
                      <div style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.nom || '—'}
                      </div>
                      <div style={{ color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {user.email}
                      </div>
                    </div>

                    {/* UTILISÉ */}
                    <div style={{ flex: '0 0 110px', color: 'var(--wings-text)', fontSize: 12, fontFamily: 'monospace' }}>
                      {fmt(user.quota_utilise)}
                    </div>

                    {/* TOTAL */}
                    <div style={{ flex: '0 0 110px', color: 'var(--wings-text)', fontSize: 12, fontFamily: 'monospace' }}>
                      {fmt(user.quota)}
                    </div>

                    {/* BARRE */}
                    <div style={{ flex: '0 0 180px' }}>
                      <QuotaBar used={user.quota_utilise} total={user.quota} />
                    </div>

                    {/* INPUT QUOTA */}
                    <div style={{ flex: '0 0 140px' }}>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={inputs[`u_${user.id}`] ?? user.quota}
                        onChange={e => setInputs(prev => ({ ...prev, [`u_${user.id}`]: e.target.value }))}
                        style={{
                          width: 100, padding: '7px 10px',
                          background: 'var(--wings-bg)',
                          border: `0.5px solid ${inputBorderColor}`,
                          borderRadius: 8, color: 'var(--wings-text)',
                          fontSize: 13, fontFamily: 'monospace',
                          outline: 'none',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
                        onBlur={e => e.target.style.borderColor = inputBorderColor}
                      />
                    </div>

                    {/* ACTION */}
                    <div style={{ flex: '0 0 120px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleUpdateUser(user)}
                        disabled={saving[`u_${user.id}`]}
                        style={{
                          padding: '7px 14px',
                          background: 'var(--wings-blue)',
                          border: 'none', borderRadius: 999,
                          color: '#fff', fontSize: 12, fontWeight: 500,
                          cursor: saving[`u_${user.id}`] ? 'not-allowed' : 'pointer',
                          opacity: saving[`u_${user.id}`] ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {saving[`u_${user.id}`] ? 'Mise à jour…' : 'Mettre à jour'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Légende */}
            {!loading && users.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '12px 4px', marginTop: 8,
                fontSize: 12, color: 'var(--wings-text-muted)',
              }}>
                <span>{users.length} utilisateur{users.length !== 1 ? 's' : ''}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--wings-blue)', display: 'inline-block' }} />
                  &lt; 80 %
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--wings-gold)', display: 'inline-block' }} />
                  &ge; 80 %
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Tab Espaces ── */}
        {tab === 'espaces' && (
          <div>
            {/* En-tête colonnes */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
              <span style={{ ...colHeaderStyle, flex: '0 0 200px' }}>Espace</span>
              <span style={{ ...colHeaderStyle, flex: 1 }}>Administrateur</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 100px' }}>Utilisé</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 100px' }}>Quota</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 160px' }}>Utilisation</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 140px' }}>Nouveau quota (Go, 0=∞)</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 120px', textAlign: 'right' }}>Action</span>
            </div>

            {/* Lignes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loading ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                  Chargement…
                </div>
              ) : espaces.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                  Aucun espace
                </div>
              ) : filteredEspaces.map(e => {
                const pct = e.quota > 0 ? (e.quota_utilise / e.quota) * 100 : 0;
                const inputBorderColor =
                  pct >= 90 ? 'rgba(229,115,115,0.5)' :
                  pct >= 70 ? 'rgba(255,193,7,0.4)' :
                              'var(--wings-border)';
                return (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'center',
                    background: 'var(--wings-surface)',
                    border: '0.5px solid var(--wings-border)',
                    borderRadius: 12, padding: '14px 20px',
                  }}>
                    {/* ESPACE */}
                    <div style={{ flex: '0 0 200px', minWidth: 0, paddingRight: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FolderOpen size={14} style={{ color: 'var(--wings-gold)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.nom}
                        </span>
                      </div>
                      <div style={{ color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11, marginTop: 4, marginLeft: 22 }}>
                        {e.nb_fichiers} fichier{e.nb_fichiers !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* ADMIN */}
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <div style={{ color: 'var(--wings-text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.admin_nom}
                      </div>
                      <div style={{ color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.admin_email}
                      </div>
                    </div>

                    {/* UTILISÉ */}
                    <div style={{ flex: '0 0 100px', color: 'var(--wings-text)', fontSize: 12, fontFamily: 'monospace' }}>
                      {fmt(e.quota_utilise)}
                    </div>

                    {/* QUOTA */}
                    <div style={{ flex: '0 0 100px', color: 'var(--wings-text)', fontSize: 12, fontFamily: 'monospace' }}>
                      {fmt(e.quota)}
                    </div>

                    {/* BARRE */}
                    <div style={{ flex: '0 0 160px' }}>
                      <QuotaBar used={e.quota_utilise} total={e.quota} />
                    </div>

                    {/* INPUT */}
                    <div style={{ flex: '0 0 140px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={inputs[`e_${e.id}`] ?? e.quota}
                        onChange={ev => setInputs(prev => ({ ...prev, [`e_${e.id}`]: ev.target.value }))}
                        style={{
                          width: 110, padding: '7px 10px',
                          background: 'var(--wings-bg)',
                          border: `0.5px solid ${inputBorderColor}`,
                          borderRadius: 8, color: 'var(--wings-text)',
                          fontSize: 13, fontFamily: 'monospace',
                          outline: 'none',
                        }}
                        onFocus={ev => ev.target.style.borderColor = 'var(--wings-blue)'}
                        onBlur={ev => ev.target.style.borderColor = inputBorderColor}
                      />
                    </div>

                    {/* ACTION */}
                    <div style={{ flex: '0 0 120px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleUpdateEspace(e)}
                        disabled={saving[`e_${e.id}`]}
                        style={{
                          padding: '7px 14px',
                          background: 'var(--wings-blue)',
                          border: 'none', borderRadius: 999,
                          color: '#fff', fontSize: 12, fontWeight: 500,
                          cursor: saving[`e_${e.id}`] ? 'not-allowed' : 'pointer',
                          opacity: saving[`e_${e.id}`] ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {saving[`e_${e.id}`] ? 'Mise à jour…' : 'Mettre à jour'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Légende */}
            {!loading && espaces.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '12px 4px', marginTop: 8,
                fontSize: 12, color: 'var(--wings-text-muted)',
              }}>
                <span>{espaces.length} espace{espaces.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </AppLayout>
  );
}


