import { useState, useEffect, useCallback } from 'react';
import { HardDrive, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

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

export default function AdminQuotas() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [inputs,  setInputs]  = useState({});
  const [saving,  setSaving]  = useState({});
  const [toast,   setToast]   = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/admin/users?per_page=200');
      const list = res.data.users ?? [];
      setUsers(list);
      setInputs(Object.fromEntries(list.map(u => [u.id, String(u.quota ?? 2)])));
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleUpdate = async (user) => {
    const newQuota = parseFloat(inputs[user.id]);
    if (isNaN(newQuota) || newQuota <= 0) {
      showToast('Quota invalide (doit être > 0).', 'error');
      return;
    }
    setSaving(s => ({ ...s, [user.id]: true }));
    try {
      await API.put(`/admin/users/${user.id}/quota`, { quota: newQuota });
      showToast(`Quota de ${user.nom || user.email} mis à jour (${newQuota} Go).`);
      await fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Échec de la mise à jour.', 'error');
    } finally {
      setSaving(s => ({ ...s, [user.id]: false }));
    }
  };

  const fmt = (val) => `${(val ?? 0).toFixed(2)} Go`;

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
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
              Gestion des quotas
            </h1>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
              Consultez et ajustez l'espace de stockage alloué à chaque utilisateur
            </p>
          </div>
          <button
            onClick={fetchUsers}
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

        {/* Liste */}
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
            ) : users.map(user => {
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
                      value={inputs[user.id] ?? user.quota}
                      onChange={e => setInputs(prev => ({ ...prev, [user.id]: e.target.value }))}
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
                      onClick={() => handleUpdate(user)}
                      disabled={saving[user.id]}
                      style={{
                        padding: '7px 14px',
                        background: 'var(--wings-blue)',
                        border: 'none', borderRadius: 999,
                        color: '#fff', fontSize: 12, fontWeight: 500,
                        cursor: saving[user.id] ? 'not-allowed' : 'pointer',
                        opacity: saving[user.id] ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {saving[user.id] ? 'Mise à jour…' : 'Mettre à jour'}
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
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </AppLayout>
  );
}
