import { useState, useEffect, useCallback } from 'react';
import { Inbox, RefreshCw, AlertCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

const TABS = [
  { id: 'pending',  label: 'En attente' },
  { id: 'approved', label: 'Approuvées' },
  { id: 'rejected', label: 'Rejetées' },
];

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function Avatar({ email, nom }) {
  const initial = (nom || email || '?')[0].toUpperCase();
  const colors = ['#4f8bff', '#b07cce', '#5dd39e', '#d4af37', '#e57373'];
  const idx = (nom || email || '').length % colors.length;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: colors[idx], color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 600, flexShrink: 0
    }}>
      {initial}
    </div>
  );
}

const statusBadge = (status) => {
  if (status === 'approved') return (
    <span style={{
      color: '#059669', background: 'rgba(5,150,105,0.1)',
      border: '0.5px solid rgba(5,150,105,0.3)',
      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500
    }}>
      Approuvée
    </span>
  );
  if (status === 'rejected') return (
    <span style={{
      color: '#e57373', background: 'rgba(229,115,115,0.08)',
      border: '0.5px solid rgba(229,115,115,0.3)',
      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500
    }}>
      Rejetée
    </span>
  );
  return null;
};

export default function AdminQuotaRequests() {
  const [tab,          setTab]          = useState('pending');
  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [expanded,     setExpanded]     = useState(new Set());

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [res, resPending] = await Promise.all([
        API.get(`/admin/quota-requests?statut=${tab}`),
        API.get('/admin/quota-requests?statut=pending')
      ]);
      setRequests(res.data || []);
      setPendingCount((resPending.data || []).length);
    } catch (err) {
      setError("Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const toggleExpanded = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openApprove = async (req) => {
    const comment = prompt(`Approuver la demande de ${req.user_email} ?\nCommentaire (optionnel) :`, "");
    if (comment === null) return;
    try {
      await API.post(`/admin/quota-requests/${req.id}/approve`, { commentaire: comment });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de l'approbation.");
    }
  };

  const openReject = async (req) => {
    const comment = prompt(`Rejeter la demande de ${req.user_email} ?\nRaison du rejet (obligatoire) :`, "");
    if (comment === null) return;
    if (!comment.trim()) {
      alert("Une raison est obligatoire pour rejeter une demande.");
      return;
    }
    try {
      await API.post(`/admin/quota-requests/${req.id}/reject`, { commentaire: comment.trim() });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors du rejet.");
    }
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
    </AppLayout>
  );
}
