import { useState, useEffect, useCallback } from 'react';
import { Inbox, CheckCircle2, X, RefreshCw, AlertCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

// ── Toast ─────────────────────────────────────────────────────────────────────
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
      {type === 'success'
        ? <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
        : <X size={14} style={{ flexShrink: 0 }} />}
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, opacity: 0.8 }}>
        <X size={13} />
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d;
  if (diff < 60_000)     return 'il y a quelques secondes';
  if (diff < 3_600_000)  return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Avatar({ email, nom }) {
  const letters = nom
    ? nom.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : (email?.[0] ?? '?').toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--wings-blue), #2255cc)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 13, fontWeight: 600,
    }}>
      {letters}
    </div>
  );
}

// ── Modal wrapper (style aligned with Settings.jsx modal) ─────────────────────
function Modal({ onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--wings-surface)',
          border: '0.5px solid var(--wings-border)',
          borderRadius: 20, width: '100%', maxWidth: 440,
          padding: '28px 28px 24px', position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none',
            color: 'var(--wings-text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6,
          }}
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

// ── Recap block shared by approve/reject modals ───────────────────────────────
function RequestRecap({ req }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10, marginBottom: 18,
      background: 'var(--wings-bg)', border: '0.5px solid var(--wings-border)',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--wings-text)', fontWeight: 500, marginBottom: 4 }}>
        {req.user_nom ? `${req.user_nom} (${req.user_email})` : req.user_email}
      </div>
      <div style={{ color: 'var(--wings-text-muted)' }}>
        {req.espace_id ? `Espace : ${req.espace_nom}` : 'Quota personnel'}
        {' · '}
        <span style={{ color: 'var(--wings-text)' }}>{req.quota_actuel ?? '?'} Go</span>
        {' → '}
        <strong style={{ color: 'var(--wings-blue)' }}>{req.quota_demande} Go</strong>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'pending',  label: 'En attente' },
  { id: 'approved', label: 'Approuvées' },
  { id: 'rejected', label: 'Rejetées'   },
];

export default function AdminQuotaRequests() {
  const [tab,          setTab]          = useState('pending');
  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [toast,        setToast]        = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [expanded,     setExpanded]     = useState(new Set());

  // Modals
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [quotaAccorde, setQuotaAccorde] = useState('');
  const [commentaire,  setCommentaire]  = useState('');
  const [rejectRaison, setRejectRaison] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [modalError,   setModalError]   = useState('');

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get(`/admin/quota-requests?statut=${tab}`);
      setRequests(res.data);
      if (tab === 'pending') setPendingCount(res.data.length);
    } catch {
      setError('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Fetch pending count on mount so badge shows on all tabs
  useEffect(() => {
    API.get('/admin/quota-requests?statut=pending')
      .then(res => setPendingCount(res.data.length))
      .catch(() => {});
  }, []);

  const openApprove = (req) => {
    setApproveModal({ request: req });
    setQuotaAccorde(String(req.quota_demande));
    setCommentaire('');
    setModalError('');
  };

  const openReject = (req) => {
    setRejectModal({ request: req });
    setRejectRaison('');
    setModalError('');
  };

  const handleApprove = async () => {
    const req = approveModal.request;
    setSubmitting(true);
    setModalError('');
    try {
      const body = {};
      const qa = parseFloat(quotaAccorde);
      if (!isNaN(qa) && qa > 0) body.quota_accorde = qa;
      if (commentaire.trim()) body.commentaire = commentaire.trim();
      await API.post(`/admin/quota-requests/${req.id}/approve`, body);
      setApproveModal(null);
      showToast(`Demande de ${req.user_email} approuvée.`);
      setPendingCount(c => (c !== null ? Math.max(0, c - 1) : c));
      fetchRequests();
    } catch (e) {
      setModalError(e.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const req = rejectModal.request;
    if (!rejectRaison.trim()) {
      setModalError('La raison du rejet est obligatoire.');
      return;
    }
    setSubmitting(true);
    setModalError('');
    try {
      await API.post(`/admin/quota-requests/${req.id}/reject`, { commentaire: rejectRaison.trim() });
      setRejectModal(null);
      showToast(`Demande de ${req.user_email} rejetée.`, 'error');
      setPendingCount(c => (c !== null ? Math.max(0, c - 1) : c));
      fetchRequests();
    } catch (e) {
      setModalError(e.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpanded = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const statusBadge = (statut) => {
    const map = {
      pending:  { label: 'En attente', color: 'var(--wings-gold)', bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.3)'  },
      approved: { label: 'Approuvée',  color: '#059669',           bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.3)'   },
      rejected: { label: 'Rejetée',    color: '#e57373',           bg: 'rgba(229,115,115,0.08)', border: 'rgba(229,115,115,0.3)' },
    };
    const s = map[statut] || map.pending;
    return (
      <span style={{
        fontSize: 10, fontFamily: 'monospace', letterSpacing: '1px',
        textTransform: 'uppercase', borderRadius: 999, padding: '2px 8px',
        color: s.color, background: s.bg, border: `0.5px solid ${s.border}`,
      }}>
        {s.label}
      </span>
    );
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--wings-bg)',
    border: '0.5px solid var(--wings-border)',
    borderRadius: 10, color: 'var(--wings-text)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = {
    fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px',
    color: 'var(--wings-gold)', textTransform: 'uppercase',
    display: 'block', marginBottom: 6,
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(79,139,255,0.1)',
              border: '0.5px solid rgba(79,139,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Inbox size={20} style={{ color: 'var(--wings-blue)' }} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
                Demandes de quota
              </h1>
              <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
                Examinez et traitez les demandes d'augmentation d'espace
              </p>
            </div>
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: 'transparent',
              border: '0.5px solid var(--wings-border)', borderRadius: 999,
              color: 'var(--wings-text-muted)', fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1, flexShrink: 0,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--wings-border)', marginBottom: 4 }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: 'transparent', border: 'none',
                borderBottom: tab === id ? '2px solid var(--wings-gold)' : '2px solid transparent',
                color: tab === id ? 'var(--wings-text)' : 'var(--wings-text-muted)',
                fontSize: 13, fontWeight: tab === id ? 500 : 400,
                cursor: 'pointer', marginBottom: '-0.5px', transition: 'all 0.15s',
              }}
            >
              {label}
              {id === 'pending' && pendingCount > 0 && (
                <span style={{
                  fontSize: 10, fontFamily: 'monospace',
                  background: 'var(--wings-gold)', color: '#1a1a2e',
                  borderRadius: 999, padding: '1px 6px', fontWeight: 700,
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: 'rgba(229,115,115,0.08)',
            border: '0.5px solid rgba(229,115,115,0.3)', color: '#e57373',
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* ── Contenu ── */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
            Chargement…
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Inbox size={32} style={{ color: 'var(--wings-text-muted)', opacity: 0.3 }} />
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
              {tab === 'pending'  ? 'Aucune demande en attente pour le moment.' :
               tab === 'approved' ? 'Aucune demande approuvée.' :
               'Aucune demande rejetée.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(req => {
              const isExpanded = expanded.has(req.id);
              const raison = req.raison || '';
              const tooLong = raison.length > 120;
              return (
                <div key={req.id} style={{
                  background: 'var(--wings-surface)',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 14, padding: '16px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <Avatar email={req.user_email} nom={req.user_nom} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Identité + type */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                        <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500 }}>
                          {req.user_nom || req.user_email}
                        </span>
                        {req.user_nom && (
                          <span style={{ color: 'var(--wings-text-muted)', fontSize: 11, fontFamily: 'monospace' }}>
                            {req.user_email}
                          </span>
                        )}
                        {req.type === 'espace' ? (
                          <span style={{
                            fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.5px', textTransform: 'uppercase',
                            color: 'var(--wings-gold)', background: 'rgba(212,175,55,0.08)',
                            border: '0.5px solid rgba(212,175,55,0.3)',
                            borderRadius: 6, padding: '2px 7px',
                          }}>
                            Espace : {req.nom_espace}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.5px', textTransform: 'uppercase',
                            color: 'var(--wings-blue)', background: 'rgba(79,139,255,0.08)',
                            border: '0.5px solid rgba(79,139,255,0.3)',
                            borderRadius: 6, padding: '2px 7px',
                          }}>
                            Utilisateur
                          </span>
                        )}
                      </div>

                      {/* Quota actuel → demandé */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: raison ? 6 : 0 }}>
                        <span style={{ color: 'var(--wings-text-muted)', fontSize: 13 }}>Plafond demandé :</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--wings-text-muted)' }}>
                          {req.quota_actuel ?? '?'} Go
                        </span>
                        <span style={{ color: 'var(--wings-text-muted)', fontSize: 14 }}>→</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--wings-blue)' }}>
                          {req.quota_demande} Go
                        </span>
                      </div>

                      {/* Raison */}
                      {raison && (
                        <p style={{ color: 'var(--wings-text-muted)', fontSize: 12, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
                          "{tooLong && !isExpanded ? raison.slice(0, 120) + '…' : raison}"
                          {tooLong && (
                            <button
                              onClick={() => toggleExpanded(req.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--wings-blue)', fontSize: 11, cursor: 'pointer', marginLeft: 6, padding: 0 }}
                            >
                              {isExpanded ? 'voir moins' : 'voir plus'}
                            </button>
                          )}
                        </p>
                      )}

                      {/* Traitement info (approved / rejected) */}
                      {(req.statut === 'approved' || req.statut === 'rejected') && (
                        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--wings-bg)', border: '0.5px solid var(--wings-border)', fontSize: 11 }}>
                          {req.traite_par_email && (
                            <span style={{ color: 'var(--wings-text-muted)' }}>
                              Traité par{' '}
                              <strong style={{ color: 'var(--wings-text)' }}>{req.traite_par_email}</strong>
                              {req.traite_at && ` · ${fmtDate(req.traite_at)}`}
                            </span>
                          )}
                          {req.reponse_admin && (
                            <p style={{ color: 'var(--wings-text-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>
                              "{req.reponse_admin}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Côté droit : date + boutons / badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--wings-text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(req.created_at)}
                      </span>
                      {req.statut === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openApprove(req)}
                            style={{
                              padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                              background: 'rgba(5,150,105,0.1)',
                              border: '0.5px solid rgba(5,150,105,0.4)',
                              color: '#059669', cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => openReject(req)}
                            style={{
                              padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                              background: 'rgba(229,115,115,0.08)',
                              border: '0.5px solid rgba(229,115,115,0.3)',
                              color: '#e57373', cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            Rejeter
                          </button>
                        </div>
                      ) : (
                        statusBadge(req.statut)
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Modal Approuver ── */}
      {approveModal && (
        <Modal onClose={() => setApproveModal(null)}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
            Approuver la demande
          </h2>
          <p style={{ color: 'var(--wings-text-muted)', fontSize: 12, margin: 0, marginBottom: 18 }}>
            Le quota sera mis à jour immédiatement après confirmation.
          </p>

          <RequestRecap req={approveModal.request} />

          <label style={labelStyle}>
            Quota accordé (Go){' '}
            <span style={{ color: 'var(--wings-text-muted)', textTransform: 'none', letterSpacing: 0, fontFamily: 'inherit', fontSize: 11 }}>
              (optionnel — défaut : quota demandé)
            </span>
          </label>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={quotaAccorde}
            onChange={e => setQuotaAccorde(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'monospace', marginBottom: 14 }}
            onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
            onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
          />

          <label style={labelStyle}>
            Commentaire pour le demandeur{' '}
            <span style={{ color: 'var(--wings-text-muted)', textTransform: 'none', letterSpacing: 0, fontFamily: 'inherit', fontSize: 11 }}>
              (optionnel)
            </span>
          </label>
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            placeholder="Message pour le demandeur…"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: 12, marginBottom: 16 }}
            onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
            onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
          />

          {modalError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14,
              background: 'rgba(229,115,115,0.08)',
              border: '0.5px solid rgba(229,115,115,0.3)', color: '#e57373',
            }}>
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              {modalError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setApproveModal(null)}
              style={{ padding: '9px 18px', borderRadius: 999, fontSize: 12, background: 'none', border: '0.5px solid var(--wings-border)', color: 'var(--wings-text-muted)', cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting}
              style={{
                padding: '9px 20px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                background: '#059669', border: 'none', color: '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1, transition: 'opacity 0.2s',
              }}
            >
              {submitting ? 'Confirmation…' : "Confirmer l'approbation"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal Rejeter ── */}
      {rejectModal && (
        <Modal onClose={() => setRejectModal(null)}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
            Rejeter la demande
          </h2>
          <p style={{ color: 'var(--wings-text-muted)', fontSize: 12, margin: 0, marginBottom: 18 }}>
            La raison sera communiquée au demandeur.
          </p>

          <RequestRecap req={rejectModal.request} />

          <label style={labelStyle}>
            Raison du rejet{' '}
            <span style={{ color: '#e57373' }}>*</span>
          </label>
          <textarea
            value={rejectRaison}
            onChange={e => { setRejectRaison(e.target.value); setModalError(''); }}
            placeholder="Expliquez pourquoi la demande est refusée…"
            rows={4}
            style={{
              ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: 12,
              marginBottom: 16,
              borderColor: modalError && !rejectRaison.trim() ? 'rgba(229,115,115,0.5)' : 'var(--wings-border)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
            onBlur={e => e.target.style.borderColor = (modalError && !rejectRaison.trim()) ? 'rgba(229,115,115,0.5)' : 'var(--wings-border)'}
          />

          {modalError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14,
              background: 'rgba(229,115,115,0.08)',
              border: '0.5px solid rgba(229,115,115,0.3)', color: '#e57373',
            }}>
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              {modalError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setRejectModal(null)}
              style={{ padding: '9px 18px', borderRadius: 999, fontSize: 12, background: 'none', border: '0.5px solid var(--wings-border)', color: 'var(--wings-text-muted)', cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              onClick={handleReject}
              disabled={submitting || !rejectRaison.trim()}
              style={{
                padding: '9px 20px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                background: '#dc2626', border: 'none', color: '#fff',
                cursor: submitting || !rejectRaison.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !rejectRaison.trim() ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {submitting ? 'Rejet…' : 'Confirmer le rejet'}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AppLayout>
  );
}
