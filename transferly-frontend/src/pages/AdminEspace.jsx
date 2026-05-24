/**
 * Partager un fichier — Admin Espace
 * Fichier : frontend/src/pages/AdminEspace.jsx
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, X } from "lucide-react";
import API from "../api/auth";
import AppLayout from "../components/AppLayout";

const PERM_COLS = [
  { key: "lecture",      label: "Peut consulter" },
  { key: "ecriture",    label: "Peut modifier" },
  { key: "suppression", label: "Peut supprimer" },
  { key: "partage",     label: "Peut partager" },
];

function avatarColor(name) {
  const PALETTE = [
    'var(--wings-blue)', '#b07cce', '#5dd39e',
    'var(--wings-gold)', '#e57373', '#64b5f6', '#9575cd',
  ];
  let h = 0;
  for (const c of (name || '')) h = c.charCodeAt(0) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

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
      showToast("Accès partagé");
    } catch (e) { showToast(e.message, "error"); }
  };

  if (loading) return <AppLayout><Loading /></AppLayout>;
  if (error)   return <AppLayout><ErrorScreen msg={error} onRetry={load} /></AppLayout>;

  const colHeaderStyle = {
    fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px',
    color: 'var(--wings-text-muted)', opacity: 0.6, textTransform: 'uppercase',
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {toast && <Toast msg={toast.msg} type={toast.type} />}

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
              Partager un fichier
            </h1>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
              Choisissez avec qui partager ce fichier et ce qu'ils peuvent faire
            </p>
          </div>
          <button
            onClick={() => setAddModal(true)}
            disabled={!selectedFichier}
            style={{
              padding: '10px 20px',
              background: 'var(--wings-blue)',
              border: 'none', borderRadius: 999,
              color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: selectedFichier ? 'pointer' : 'not-allowed',
              opacity: selectedFichier ? 1 : 0.5,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            + Partager avec une personne
          </button>
        </div>

        {/* Encart fichier sélectionné */}
        {selectedFichier && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 12, padding: '14px 18px',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(79,139,255,0.08)',
              border: '0.5px solid rgba(79,139,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileText size={15} color="var(--wings-blue)" />
            </div>
            <div>
              <p style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, margin: 0, marginBottom: 2 }}>
                {selectedFichier.nom || 'Fichier'}
              </p>
              <p style={{ color: 'var(--wings-text-muted)', fontSize: 11, margin: 0 }}>
                Gérez les personnes ayant accès à ce fichier
              </p>
            </div>
          </div>
        )}

        {/* Panneau permissions */}
        <div style={{
          background: 'var(--wings-surface)',
          border: '0.5px solid var(--wings-border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {!selectedFichier ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
              Aucun fichier sélectionné
            </div>
          ) : (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--wings-border)' }}>
                <div style={{ color: 'var(--wings-text)', fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
                  Personnes ayant accès à{' '}
                  <span style={{ color: 'var(--wings-blue)' }}>{selectedFichier.nom}</span>
                </div>
                <div style={{ color: 'var(--wings-text-muted)', fontSize: 12 }}>
                  Cochez ce que chaque personne peut faire
                </div>
              </div>

              {loadingRules ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                  Chargement…
                </div>
              ) : (
                <div style={{ padding: '12px 20px' }}>
                  {/* En-tête colonnes */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0', marginBottom: 6 }}>
                    <span style={{ ...colHeaderStyle, flex: 1 }}>Personne</span>
                    {PERM_COLS.map(p => (
                      <span key={p.key} style={{ ...colHeaderStyle, flex: '0 0 120px', textAlign: 'center' }}>
                        {p.label}
                      </span>
                    ))}
                    <span style={{ ...colHeaderStyle, flex: '0 0 140px', textAlign: 'center' }}>Actions</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {rules.length === 0 ? (
                      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                        Personne n'a encore accès à ce fichier.
                        <br />Cliquez sur "+ Partager avec une personne" pour commencer.
                      </div>
                    ) : rules.map((rule, i) => (
                      <PermRow
                        key={rule.id}
                        rule={rule}
                        saving={saving}
                        onToggle={togglePerm}
                        onRevoke={() => revoke(rule.id, rule.user_nom)}
                        onEdit={() => setEditModal(rule)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {addModal && (
          <AddPermModal
            users={users}
            existingIds={new Set(rules.map(r => r.user_id))}
            onConfirm={handleAdd}
            onClose={() => setAddModal(false)}
          />
        )}

        {editModal && (
          <EditPermModal
            rule={editModal}
            onConfirm={async (perms) => {
              try {
                const updated = (await API.put(`/acl/${editModal.id}`, perms)).data;
                setRules(prev => prev.map(r => r.id === editModal.id ? updated : r));
                setEditModal(null);
                showToast("Permissions mises à jour");
              } catch (e) { showToast(e.message, "error"); }
            }}
            onClose={() => setEditModal(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}

/* ── Ligne permission ──────────────────────────────────────────────── */

function PermRow({ rule, saving, onToggle, onRevoke, onEdit }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,0.02)',
      border: '0.5px solid var(--wings-border)',
      borderRadius: 10, padding: '12px 0',
    }}>
      {/* Personne */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4, minWidth: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: avatarColor(rule.user_nom || '?'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 13, fontWeight: 700,
        }}>
          {(rule.user_nom || '?')[0].toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {rule.user_nom || '—'}
          </div>
          {rule.user_email && (
            <div style={{ color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rule.user_email}
            </div>
          )}
        </div>
      </div>

      {/* Cases à cocher */}
      {PERM_COLS.map(p => {
        const val = rule.permissions[p.key];
        const key = `${rule.id}-${p.key}`;
        return (
          <div key={p.key} style={{ flex: '0 0 120px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => onToggle(rule.id, p.key, val)}
              disabled={!!saving[key]}
              title={`${val ? 'Retirer' : 'Accorder'} : ${p.label}`}
              style={{
                width: 20, height: 20, borderRadius: 4,
                border: `1.5px solid ${val ? 'var(--wings-blue)' : 'var(--wings-border)'}`,
                background: val ? 'var(--wings-blue)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: saving[key] ? 'not-allowed' : 'pointer',
                opacity: saving[key] ? 0.5 : 1,
                transition: 'all 0.15s', padding: 0,
              }}
            >
              {val && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        );
      })}

      {/* Actions */}
      <div style={{ flex: '0 0 140px', display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button
          onClick={onEdit}
          style={{
            background: 'none', border: '0.5px solid var(--wings-border)',
            borderRadius: 999, padding: '4px 12px',
            color: 'var(--wings-text-muted)', fontSize: 12, cursor: 'pointer',
          }}
        >
          Modifier
        </button>
        <button
          onClick={onRevoke}
          style={{
            background: 'none', border: '0.5px solid rgba(229,115,115,0.3)',
            borderRadius: 999, padding: '4px 12px',
            color: '#e57373', fontSize: 12, cursor: 'pointer',
          }}
        >
          Retirer
        </button>
      </div>
    </div>
  );
}

/* ── Modale ajout ──────────────────────────────────────────────────── */

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

function AddPermModal({ users, existingIds, onConfirm, onClose }) {
  const [email, setEmail]           = useState('');
  const [emailError, setEmailError] = useState('');
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
      setEmailError('Aucun utilisateur trouvé avec cet email.');
      return;
    }
    if (existingIds.has(user.id)) {
      setEmailError('Cette personne a déjà accès à ce fichier.');
      return;
    }
    setSubmitting(true);
    await onConfirm(user.id, defaultPerms);
    setSubmitting(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--wings-surface)',
        border: '0.5px solid var(--wings-border)',
        borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 460, margin: '0 16px',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
            Partager avec une personne
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--wings-text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Adresse email</label>
          <input
            style={inputStyle}
            type="email"
            placeholder="exemple@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(''); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
            onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
            autoFocus
          />
          {emailError && (
            <div style={{ color: '#e57373', fontSize: 12, marginTop: 6 }}>{emailError}</div>
          )}
          <div style={{ color: 'var(--wings-text-muted)', fontSize: 12, marginTop: 8 }}>
            La personne recevra un accès en lecture et téléchargement par défaut.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', background: 'transparent',
            border: '0.5px solid var(--wings-border)', borderRadius: 999,
            color: 'var(--wings-text-muted)', fontSize: 13, cursor: 'pointer',
          }}>
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!email.trim() || submitting}
            style={{
              padding: '10px 24px', background: 'var(--wings-blue)',
              border: 'none', borderRadius: 999, color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: !email.trim() || submitting ? 'not-allowed' : 'pointer',
              opacity: !email.trim() || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? 'Partage…' : 'Partager'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modale édition ────────────────────────────────────────────────── */

function EditPermModal({ rule, onConfirm, onClose }) {
  const [perms, setPerms]           = useState({ ...rule.permissions });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    await onConfirm(perms);
    setSubmitting(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--wings-surface)',
        border: '0.5px solid var(--wings-border)',
        borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 380, margin: '0 16px',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
            Modifier les accès
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--wings-text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, marginBottom: 16, marginTop: 0 }}>
          Personne : <strong style={{ color: 'var(--wings-text)' }}>{rule.user_nom}</strong>
        </p>

        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {PERM_COLS.map(p => (
            <div key={p.key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '0.5px solid var(--wings-border)',
            }}>
              <span style={{ color: 'var(--wings-text)', fontSize: 13 }}>{p.label}</span>
              <button
                onClick={() => setPerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: `1.5px solid ${perms[p.key] ? 'var(--wings-blue)' : 'var(--wings-border)'}`,
                  background: perms[p.key] ? 'var(--wings-blue)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s', padding: 0,
                }}
              >
                {perms[p.key] && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', background: 'transparent',
            border: '0.5px solid var(--wings-border)', borderRadius: 999,
            color: 'var(--wings-text-muted)', fontSize: 13, cursor: 'pointer',
          }}>
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: '10px 24px', background: 'var(--wings-blue)',
              border: 'none', borderRadius: 999, color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Utilitaires ────────────────────────────────────────────────────── */

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
        Chargement…
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#e57373', marginBottom: 16, fontSize: 13 }}>{msg}</div>
        <button
          onClick={onRetry}
          style={{
            padding: '10px 24px', background: 'var(--wings-blue)',
            border: 'none', borderRadius: 999, color: '#fff',
            fontSize: 13, cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '12px 20px', borderRadius: 10,
      background: type === 'error' ? '#dc2626' : '#059669',
      color: '#fff', fontWeight: 500, fontSize: 13,
    }}>
      {msg}
    </div>
  );
}
