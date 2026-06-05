import { useState, useEffect } from 'react';
import { Users, FolderOpen, HardDrive, Search, Edit2, Trash2, Pause, Play, Shield } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

const roleBadgeStyle = (role) => {
  if (role === 'AdminGlobal') return {
    background: 'rgba(142,108,184,0.15)', color: '#b07cce',
    border: '0.5px solid rgba(142,108,184,0.25)',
  };
  if (role === 'AdminEspace') return {
    background: 'rgba(255,193,7,0.15)', color: 'var(--wings-gold)',
    border: '0.5px solid rgba(255,193,7,0.25)',
  };
  return {
    background: 'rgba(79,139,255,0.1)', color: 'var(--wings-blue)',
    border: '0.5px solid rgba(79,139,255,0.2)',
  };
};

const labelStyle = {
  display: 'block', fontFamily: 'monospace', fontSize: '10px',
  letterSpacing: '2px', color: 'var(--wings-gold)',
  textTransform: 'uppercase', marginBottom: '6px',
};

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: 'var(--wings-bg)',
  border: '0.5px solid var(--wings-border)',
  borderRadius: 10, color: 'var(--wings-text)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const actionBtnBase = {
  background: 'none', border: 'none',
  color: 'var(--wings-text-muted)', cursor: 'pointer',
  padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6,
};

export default function AdminPanel() {
  const [tab,       setTab]       = useState('users');
  const [users,     setUsers]     = useState([]);
  const [espaces,   setEspaces]   = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);
  const [editUser,  setEditUser]  = useState(null);
  const [editQuota, setEditQuota] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, e] = await Promise.all([
        API.get('/admin/users'),
        API.get('/admin/espaces'),
      ]);
      setUsers(u.data.users || []);
      setEspaces(e.data.spaces || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleDeleteUser = async (id) => {
    if (!confirm('Supprimer cet utilisateur ? Cette action est irréversible.')) return;
    try {
      await API.delete(`/admin/users/${id}`);
      showToast('Utilisateur supprimé');
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleSuspend = async (id) => {
    try {
      await API.post(`/admin/users/${id}/suspend`);
      showToast('Statut mis à jour');
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleSaveUser = async () => {
    try {
      await API.put(`/admin/users/${editUser.id}`, {
        email:  editUser.email,
        role:   editUser.role,
        statut: editUser.statut,
      });
      showToast('Utilisateur modifié');
      setEditUser(null);
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleSaveQuota = async () => {
    try {
      await API.put(`/admin/users/${editQuota.id}/quota`, {
        quota: parseFloat(editQuota.quota),
      });
      showToast('Quota mis à jour');
      setEditQuota(null);
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleDeleteEspace = async (id) => {
    if (!confirm('Supprimer cet espace ?')) return;
    try {
      await API.delete(`/admin/espaces/${id}`);
      showToast('Espace supprimé');
      loadAll();
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const filteredUsers = users.filter(u =>
    !search || (u.email + (u.nom || '')).toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'users',   label: 'Utilisateurs', icon: Users },
    { id: 'espaces', label: 'Espaces',       icon: FolderOpen },
    { id: 'quotas',  label: 'Quotas',        icon: HardDrive },
  ];

  const colHeaderStyle = {
    fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px',
    color: 'var(--wings-text-muted)', opacity: 0.6, textTransform: 'uppercase',
  };

  return (
    <AppLayout>
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 50,
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          background: toast.type === 'error' ? '#dc2626' : '#059669',
          color: '#fff',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* En-tête */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Shield size={18} color="var(--wings-blue)" style={{ flexShrink: 0 }} />
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
              Administration
            </h1>
          </div>
          <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
            Gestion globale de la plateforme Wings
          </p>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--wings-border)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', fontSize: 13,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.id ? '2px solid var(--wings-blue)' : '2px solid transparent',
                color: tab === t.id ? 'var(--wings-blue)' : 'var(--wings-text-muted)',
                marginBottom: -1, fontWeight: tab === t.id ? 500 : 400,
                transition: 'color 0.15s',
              }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
            Chargement…
          </div>
        ) : (
          <>
            {/* Barre de recherche (users + quotas) */}
            {(tab === 'users' || tab === 'quotas') && (
              <div style={{ position: 'relative', maxWidth: 340 }}>
                <Search size={14} style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--wings-text-muted)', pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur…"
                  style={{
                    width: '100%', padding: '10px 14px 10px 38px',
                    background: 'var(--wings-surface)',
                    border: '0.5px solid var(--wings-border)',
                    borderRadius: 12, color: 'var(--wings-text)',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
                />
              </div>
            )}

            {/* ── ONGLET UTILISATEURS ── */}
            {tab === 'users' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
                  <span style={{ ...colHeaderStyle, flex: '0 0 180px' }}>Nom</span>
                  <span style={{ ...colHeaderStyle, flex: 1 }}>Email</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 140px' }}>Rôle</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 100px' }}>Statut</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 100px', textAlign: 'right' }}>Actions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                      Aucun utilisateur trouvé
                    </div>
                  ) : filteredUsers.map(u => (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center',
                      background: 'var(--wings-surface)',
                      border: '0.5px solid var(--wings-border)',
                      borderRadius: 12, padding: '14px 20px',
                    }}>
                      <div style={{ flex: '0 0 180px', color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.nom || '—'}
                      </div>
                      <div style={{ flex: 1, color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                        {u.email}
                      </div>
                      <div style={{ flex: '0 0 140px' }}>
                        <span style={{ ...roleBadgeStyle(u.role), fontFamily: 'monospace', fontSize: 10, borderRadius: 6, padding: '3px 8px', display: 'inline-block' }}>
                          {u.role}
                        </span>
                      </div>
                      <div style={{ flex: '0 0 100px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.statut === 'actif' ? '#5dd39e' : '#e57373', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: u.statut === 'actif' ? '#5dd39e' : '#e57373' }}>
                          {u.statut}
                        </span>
                      </div>
                      <div style={{ flex: '0 0 100px', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditUser({ ...u })}
                          title="Modifier"
                          style={actionBtnBase}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-text)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleSuspend(u.id)}
                          title={u.statut === 'actif' ? 'Suspendre' : 'Activer'}
                          style={actionBtnBase}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-gold)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                        >
                          {u.statut === 'actif' ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          title="Supprimer"
                          style={actionBtnBase}
                          onMouseEnter={e => e.currentTarget.style.color = '#e57373'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ONGLET ESPACES ── */}
            {tab === 'espaces' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
                  <span style={{ ...colHeaderStyle, flex: '0 0 60px' }}>ID</span>
                  <span style={{ ...colHeaderStyle, flex: 1 }}>Nom de l'espace</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 200px' }}>Admin</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 60px', textAlign: 'right' }}>Action</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {espaces.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                      Aucun espace
                    </div>
                  ) : espaces.map(e => (
                    <div key={e.id} style={{
                      display: 'flex', alignItems: 'center',
                      background: 'var(--wings-surface)',
                      border: '0.5px solid var(--wings-border)',
                      borderRadius: 12, padding: '14px 20px',
                    }}>
                      <div style={{ flex: '0 0 60px', color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                        #{e.id}
                      </div>
                      <div style={{ flex: 1, color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                        {e.name || e.nom || '—'}
                      </div>
                      <div style={{ flex: '0 0 200px', color: 'var(--wings-text-muted)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.adminEspace ? `${e.adminEspace[0] || ''} (${e.adminEspace[1] || ''})` : '—'}
                      </div>
                      <div style={{ flex: '0 0 60px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleDeleteEspace(e.id)}
                          title="Supprimer"
                          style={actionBtnBase}
                          onMouseEnter={el => el.currentTarget.style.color = '#e57373'}
                          onMouseLeave={el => el.currentTarget.style.color = 'var(--wings-text-muted)'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ONGLET QUOTAS ── */}
            {tab === 'quotas' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
                  <span style={{ ...colHeaderStyle, flex: '0 0 180px' }}>Utilisateur</span>
                  <span style={{ ...colHeaderStyle, flex: 1 }}>Email</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 120px' }}>Quota alloué</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 100px', textAlign: 'right' }}>Action</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                      Aucun utilisateur
                    </div>
                  ) : filteredUsers.map(u => (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center',
                      background: 'var(--wings-surface)',
                      border: '0.5px solid var(--wings-border)',
                      borderRadius: 12, padding: '14px 20px',
                    }}>
                      <div style={{ flex: '0 0 180px', color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.nom || '—'}
                      </div>
                      <div style={{ flex: 1, color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                        {u.email}
                      </div>
                      <div style={{ flex: '0 0 120px', color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>
                        {u.quota ?? 2} GB
                      </div>
                      <div style={{ flex: '0 0 100px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditQuota({ id: u.id, email: u.email, quota: u.quota ?? 2 })}
                          style={{
                            padding: '6px 14px', fontSize: 12,
                            background: 'var(--wings-blue)',
                            border: 'none', borderRadius: 999,
                            color: '#fff', cursor: 'pointer', fontWeight: 500,
                          }}
                        >
                          Modifier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODALE ÉDITION UTILISATEUR ── */}
      {editUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 16, padding: 28,
            maxWidth: 440, width: '100%',
          }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 20 }}>
              Modifier l'utilisateur
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={e => setEditUser({ ...editUser, email: e.target.value })}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
                />
              </div>
              <div>
                <label style={labelStyle}>Rôle</label>
                <select
                  value={editUser.role}
                  onChange={e => setEditUser({ ...editUser, role: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="Utilisateur">Utilisateur</option>
                  <option value="AdminEspace">AdminEspace</option>
                  <option value="AdminGlobal">AdminGlobal</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Statut</label>
                <select
                  value={editUser.statut}
                  onChange={e => setEditUser({ ...editUser, statut: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="actif">Actif</option>
                  <option value="bloque">Bloqué</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setEditUser(null)}
                style={{
                  padding: '10px 20px', background: 'transparent',
                  border: '0.5px solid var(--wings-border)', borderRadius: 999,
                  color: 'var(--wings-text-muted)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveUser}
                style={{
                  padding: '10px 20px', background: 'var(--wings-blue)',
                  border: 'none', borderRadius: 999,
                  color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE ÉDITION QUOTA ── */}
      {editQuota && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 16, padding: 28,
            maxWidth: 380, width: '100%',
          }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
              Modifier le quota
            </h3>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, marginBottom: 16, marginTop: 0 }}>
              {editQuota.email}
            </p>
            <label style={labelStyle}>Quota en GB</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={editQuota.quota}
              onChange={e => setEditQuota({ ...editQuota, quota: e.target.value })}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setEditQuota(null)}
                style={{
                  padding: '10px 20px', background: 'transparent',
                  border: '0.5px solid var(--wings-border)', borderRadius: 999,
                  color: 'var(--wings-text-muted)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveQuota}
                style={{
                  padding: '10px 20px', background: 'var(--wings-blue)',
                  border: 'none', borderRadius: 999,
                  color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
