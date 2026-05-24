import { useState, useEffect, useCallback } from 'react';
import {
  Edit2, Trash2, ToggleLeft, ToggleRight, HardDrive,
  X, ChevronLeft, ChevronRight, UserPlus, Copy, Check,
  CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import SearchBar from '../components/SearchBar';
import { useDebounced } from '../hooks/useDebounced';

const ROLE_LABELS = {
  Utilisateur: 'Utilisateur',
  AdminEspace: "Administrateur d'espace",
  AdminGlobal: 'Admin Global',
};

const roleBadgeStyle = (role) => {
  if (role === 'AdminGlobal') return {
    background: 'rgba(142,108,184,0.15)',
    color: '#b07cce',
    border: '0.5px solid rgba(142,108,184,0.25)',
  };
  if (role === 'AdminEspace') return {
    background: 'rgba(255,193,7,0.15)',
    color: 'var(--wings-gold)',
    border: '0.5px solid rgba(255,193,7,0.25)',
  };
  return {
    background: 'rgba(79,139,255,0.1)',
    color: 'var(--wings-blue)',
    border: '0.5px solid rgba(79,139,255,0.2)',
  };
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--wings-bg)',
  border: '0.5px solid var(--wings-border)',
  borderRadius: '10px',
  color: 'var(--wings-text)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'monospace',
  fontSize: '10px',
  letterSpacing: '2px',
  color: 'var(--wings-gold)',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

const actionBtnBase = {
  background: 'none',
  border: 'none',
  color: 'var(--wings-text-muted)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  borderRadius: 6,
};

function CreateUserModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ nom: '', email: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [copied,  setCopied]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/admin/users', {
        email: form.email.trim(),
        nom:   form.nom.trim(),
      });
      setResult(res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error;
      if (status === 409)      setError('Cet email est déjà utilisé.');
      else if (status === 400) setError(msg || 'Rôle invalide.');
      else if (status === 403) setError("Vous n'avez pas les droits nécessaires.");
      else                     setError(msg || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result) onCreated(result);
    onClose();
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(result.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard API indisponible */ }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--wings-surface)',
        border: '0.5px solid var(--wings-border)',
        borderRadius: 16,
        width: '100%', maxWidth: 440,
        margin: '0 16px', padding: 28,
      }}>
        {!result ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
                Créer un utilisateur
              </h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--wings-text-muted)', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16,
                background: 'rgba(229,115,115,0.08)',
                border: '0.5px solid rgba(229,115,115,0.3)',
                color: '#e57373',
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>
                  Nom complet <span style={{ color: '#e57373' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Prénom Nom"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Adresse email <span style={{ color: '#e57373' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="utilisateur@exemple.com"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '10px 16px',
                    background: 'transparent',
                    border: '0.5px solid var(--wings-border)',
                    borderRadius: 999, color: 'var(--wings-text-muted)',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1, padding: '10px 16px',
                    background: 'var(--wings-blue)',
                    border: 'none', borderRadius: 999,
                    color: '#fff', fontSize: 13, fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <CheckCircle2 size={18} color="#5dd39e" style={{ flexShrink: 0 }} />
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
                Compte créé avec succès
              </h2>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--wings-text-muted)' }}>Email</span>
                <span style={{ color: 'var(--wings-text)', fontWeight: 500 }}>{result.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--wings-text-muted)' }}>Rôle</span>
                <span style={{ color: 'var(--wings-text)', fontWeight: 500 }}>{ROLE_LABELS[result.role] ?? result.role}</span>
              </div>
            </div>

            <div>
              <p style={{ ...labelStyle, marginBottom: 8 }}>Mot de passe temporaire</p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,193,7,0.06)',
                border: '0.5px solid rgba(255,193,7,0.25)',
                borderRadius: 12, padding: '12px 16px',
              }}>
                <code style={{
                  flex: 1, fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                  color: 'var(--wings-gold)', letterSpacing: '0.1em', wordBreak: 'break-all',
                }}>
                  {result.temporary_password}
                </code>
                <button
                  onClick={copyPassword}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px',
                    background: 'rgba(255,193,7,0.15)',
                    border: '0.5px solid rgba(255,193,7,0.3)',
                    borderRadius: 8, color: 'var(--wings-gold)',
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {copied ? <><Check size={12} />Copié</> : <><Copy size={12} />Copier</>}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12,
              padding: '10px 14px', borderRadius: 10,
              background: result.email_sent ? 'rgba(93,211,158,0.06)' : 'rgba(255,152,0,0.06)',
              border: `0.5px solid ${result.email_sent ? 'rgba(93,211,158,0.25)' : 'rgba(255,152,0,0.25)'}`,
              color: result.email_sent ? '#5dd39e' : 'var(--wings-gold)',
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {result.email_sent
                ? "Un email d'invitation a été envoyé à l'utilisateur."
                : "L'email d'invitation n'a pas pu être envoyé. Transmettez les identifiants manuellement."}
            </div>

            <p style={{ color: 'var(--wings-text-muted)', fontSize: 11, fontStyle: 'italic', textAlign: 'center', padding: '0 8px', margin: 0 }}>
              Communiquez ce mot de passe à l'utilisateur. Il devra le changer à sa première connexion.
              Ce mot de passe ne sera plus affiché après fermeture.
            </p>

            <button
              onClick={handleClose}
              style={{
                width: '100%', padding: '10px 16px',
                background: 'var(--wings-blue)',
                border: 'none', borderRadius: 999,
                color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 12,
      background: type === 'success' ? '#059669' : '#dc2626',
      color: '#fff', fontSize: 13, fontWeight: 500,
    }}>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}

function EditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ email: user.email, role: user.role, statut: user.statut });
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.put(`/admin/users/${user.id}`, form);
      onSave();
    } catch {
      /* error handled by parent */
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--wings-surface)',
        border: '0.5px solid var(--wings-border)',
        borderRadius: 16, width: '100%', maxWidth: 440,
        margin: '0 16px', padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
            Modifier l'utilisateur
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--wings-text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Rôle</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={selectStyle}
            >
              <option value="Utilisateur">Utilisateur</option>
              <option value="AdminEspace">AdminEspace</option>
              <option value="AdminGlobal">AdminGlobal</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Statut</label>
            <select
              value={form.statut}
              onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
              style={selectStyle}
            >
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px 16px',
              background: 'transparent', border: '0.5px solid var(--wings-border)',
              borderRadius: 999, color: 'var(--wings-text-muted)',
              fontSize: 13, cursor: 'pointer',
            }}>
              Annuler
            </button>
            <button type="submit" disabled={loading} style={{
              flex: 1, padding: '10px 16px',
              background: 'var(--wings-blue)', border: 'none',
              borderRadius: 999, color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuotaModal({ user, onClose, onSave }) {
  const [quota, setQuota] = useState(user.quota ?? 2);
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.put(`/admin/users/${user.id}/quota`, { quota: parseFloat(quota) });
      onSave();
    } catch {
      /* error handled by parent */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--wings-surface)',
        border: '0.5px solid var(--wings-border)',
        borderRadius: 16, width: '100%', maxWidth: 380,
        margin: '0 16px', padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
            Modifier le quota
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--wings-text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, marginBottom: 16, marginTop: 0 }}>
          {user.nom} — {user.email}
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Quota (Go)</label>
            <input
              type="number"
              min="0.1"
              step="0.5"
              value={quota}
              onChange={e => setQuota(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px 16px',
              background: 'transparent', border: '0.5px solid var(--wings-border)',
              borderRadius: 999, color: 'var(--wings-text-muted)',
              fontSize: 13, cursor: 'pointer',
            }}>
              Annuler
            </button>
            <button type="submit" disabled={loading} style={{
              flex: 1, padding: '10px 16px',
              background: 'var(--wings-blue)', border: 'none',
              borderRadius: 999, color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const currentUserId = parseInt(localStorage.getItem('user_id') || '0');

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch             = useDebounced(searchTerm, 300);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editUser, setEditUser]         = useState(null);
  const [quotaUser, setQuotaUser]       = useState(null);
  const [toast, setToast]               = useState(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [sessionUsers, setSessionUsers] = useState([]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchUsers = useCallback(async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get(`/admin/users?page=${p}&per_page=20`);
      setUsers(res.data.users ?? []);
      setTotalPages(res.data.pages ?? 1);
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchUsers(page); }, [page]);

  const handleDelete = async user => {
    if (!window.confirm(`Supprimer définitivement ${user.nom || user.email} ?`)) return;
    try {
      await API.delete(`/admin/users/${user.id}`);
      showToast('Utilisateur supprimé.');
      fetchUsers(page);
    } catch {
      showToast('Échec de la suppression.', 'error');
    }
  };

  const handleToggle = async user => {
    const next = user.statut === 'actif' ? 'inactif' : 'actif';
    try {
      await API.put(`/admin/users/${user.id}`, { statut: next });
      showToast(`Statut mis à jour : ${next}.`);
      fetchUsers(page);
    } catch {
      showToast('Échec de la mise à jour.', 'error');
    }
  };

  const handleEditSave = () => {
    setEditUser(null);
    showToast('Utilisateur modifié.');
    fetchUsers(page);
  };

  const handleQuotaSave = () => {
    setQuotaUser(null);
    showToast('Quota mis à jour.');
    fetchUsers(page);
  };

  const handleCreated = (data) => {
    setSessionUsers(prev => [{ id: data.id, nom: data.nom, email: data.email, role: data.role }, ...prev]);
    showToast(`Compte créé pour ${data.email}.`);
    fetchUsers(page);
  };

  const visible = users.filter(u => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      (u.nom   || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role  || '').toLowerCase().includes(q)
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
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
              Gestion des utilisateurs
            </h1>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
              Modifier, suspendre ou supprimer des comptes
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px',
              background: 'var(--wings-blue)',
              border: 'none', borderRadius: 999,
              color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <UserPlus size={14} />
            Créer un utilisateur
          </button>
        </div>

        {/* Recherche */}
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Rechercher un utilisateur, un email…"
        />

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

        {/* Liste utilisateurs */}
        <div>
          {/* En-tête colonnes */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
            <span style={{ ...colHeaderStyle, flex: '0 0 200px' }}>Nom</span>
            <span style={{ ...colHeaderStyle, flex: 1 }}>Email</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 140px' }}>Rôle</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 110px' }}>Statut</span>
            <span style={{ ...colHeaderStyle, flex: '0 0 120px', textAlign: 'right' }}>Actions</span>
          </div>

          {/* Lignes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                Chargement…
              </div>
            ) : visible.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                Aucun utilisateur trouvé
              </div>
            ) : visible.map(user => (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--wings-surface)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 12,
                padding: '14px 20px',
              }}>
                {/* NOM */}
                <div style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.nom || '—'}
                  </span>
                  {user.id === currentUserId && (
                    <span style={{
                      background: 'rgba(79,139,255,0.1)',
                      color: 'var(--wings-blue)',
                      fontFamily: 'monospace', fontSize: 10,
                      borderRadius: 6, padding: '2px 6px',
                      flexShrink: 0,
                    }}>
                      VOUS
                    </span>
                  )}
                </div>

                {/* EMAIL */}
                <div style={{ flex: 1, color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {user.email}
                </div>

                {/* RÔLE */}
                <div style={{ flex: '0 0 140px' }}>
                  <span style={{
                    ...roleBadgeStyle(user.role),
                    fontFamily: 'monospace', fontSize: 10,
                    borderRadius: 6, padding: '3px 8px',
                    display: 'inline-block',
                  }}>
                    {user.role}
                  </span>
                </div>

                {/* STATUT */}
                <div style={{ flex: '0 0 110px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: user.statut === 'actif' ? '#5dd39e' : '#e57373',
                  }} />
                  <span style={{ fontSize: 12, color: user.statut === 'actif' ? '#5dd39e' : '#e57373' }}>
                    {user.statut ?? '—'}
                  </span>
                </div>

                {/* ACTIONS */}
                <div style={{ flex: '0 0 120px', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setEditUser(user)}
                    title="Modifier"
                    style={actionBtnBase}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                  >
                    <Edit2 size={14} />
                  </button>
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => handleToggle(user)}
                      title={user.statut === 'actif' ? 'Désactiver' : 'Activer'}
                      style={actionBtnBase}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                    >
                      {user.statut === 'actif'
                        ? <ToggleRight size={14} color="#5dd39e" />
                        : <ToggleLeft  size={14} />}
                    </button>
                  )}
                  <button
                    onClick={() => setQuotaUser(user)}
                    title="Modifier le quota"
                    style={actionBtnBase}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--wings-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                  >
                    <HardDrive size={14} />
                  </button>
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(user)}
                      title="Supprimer"
                      style={actionBtnBase}
                      onMouseEnter={e => e.currentTarget.style.color = '#e57373'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--wings-text-muted)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 4px', marginTop: 8,
            fontSize: 12, color: 'var(--wings-text-muted)',
          }}>
            <span>{visible.length} utilisateur{visible.length !== 1 ? 's' : ''} affichés</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ ...actionBtnBase, opacity: page === 1 ? 0.3 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span>Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ ...actionBtnBase, opacity: page === totalPages ? 0.3 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Comptes créés dans cette session */}
        {sessionUsers.length > 0 && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 0', marginBottom: 10,
              borderBottom: '0.5px solid var(--wings-border)',
            }}>
              <Clock size={14} color="var(--wings-gold)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500 }}>
                Comptes créés dans cette session
              </span>
              <span style={{
                background: 'rgba(255,193,7,0.12)', color: 'var(--wings-gold)',
                fontFamily: 'monospace', fontSize: 10,
                borderRadius: 6, padding: '2px 8px', marginLeft: 2,
              }}>
                {sessionUsers.length}
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--wings-text-muted)', fontSize: 11, fontStyle: 'italic' }}>
                Réinitialisé au rechargement de la page
              </span>
            </div>

            {/* En-tête colonnes session */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 20px', marginBottom: 6 }}>
              <span style={{ ...colHeaderStyle, flex: '0 0 200px' }}>Nom</span>
              <span style={{ ...colHeaderStyle, flex: 1 }}>Email</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 140px' }}>Rôle</span>
              <span style={{ ...colHeaderStyle, flex: '0 0 180px' }}>Statut</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sessionUsers.map(u => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center',
                  background: 'var(--wings-surface)',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 12, padding: '14px 20px',
                }}>
                  <span style={{ flex: '0 0 200px', color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.nom}
                  </span>
                  <span style={{ flex: 1, color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                    {u.email}
                  </span>
                  <div style={{ flex: '0 0 140px' }}>
                    <span style={{
                      ...roleBadgeStyle(u.role),
                      fontFamily: 'monospace', fontSize: 10,
                      borderRadius: 6, padding: '3px 8px',
                      display: 'inline-block',
                    }}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </div>
                  <div style={{ flex: '0 0 180px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--wings-gold)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--wings-gold)' }}>
                      Mot de passe à changer
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editUser   && <EditModal  user={editUser}  onClose={() => setEditUser(null)}  onSave={handleEditSave}  />}
      {quotaUser  && <QuotaModal user={quotaUser} onClose={() => setQuotaUser(null)} onSave={handleQuotaSave} />}
      {toast      && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AppLayout>
  );
}
