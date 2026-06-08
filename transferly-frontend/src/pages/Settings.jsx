import { useState, useEffect } from 'react';
import { User, Lock, Bell, Shield, ChevronRight, Eye, EyeOff, Check, AlertCircle, X, TrendingUp } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

function Section({ icon: Icon, title, children }) {
  return (
    <div style={{
      background: 'var(--wings-surface)',
      border: '0.5px solid var(--wings-border)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 22px',
        borderBottom: '0.5px solid var(--wings-border)',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'rgba(79,139,255,0.08)',
          border: '0.5px solid rgba(79,139,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} color="var(--wings-blue)" />
        </div>
        <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500 }}>{title}</span>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, type = 'text', placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontFamily: 'monospace', fontSize: '10px',
        letterSpacing: '2px', color: 'var(--wings-gold)',
        textTransform: 'uppercase',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: isPassword ? '10px 40px 10px 14px' : '10px 14px',
            background: 'var(--wings-bg)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 10, color: 'var(--wings-text)',
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
          onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--wings-text-muted)',
              cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
            }}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <p style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, margin: 0, marginBottom: description ? 2 : 0 }}>
          {label}
        </p>
        {description && (
          <p style={{ color: 'var(--wings-text-muted)', fontSize: 11, margin: 0 }}>
            {description}
          </p>
        )}
      </div>
      <button
        onClick={onChange}
        style={{
          position: 'relative', flexShrink: 0,
          width: 44, height: 24, borderRadius: 999,
          border: 'none', cursor: 'pointer',
          background: checked ? 'var(--wings-blue)' : 'rgba(168,180,212,0.2)',
          transition: 'background 0.2s',
          outline: 'none',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: 3,
          width: 18, height: 18,
          background: '#fff', borderRadius: '50%',
          transition: 'transform 0.2s',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

export default function Settings() {
  const userRole = localStorage.getItem('role') || 'Utilisateur';
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [originalNom, setOriginalNom] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState({
    notif_partages: true,
    notif_versions: true,
    notif_connexions_suspectes: true,
    notif_resume_hebdo: false,
    confidentialite_profil_visible: true,
    confidentialite_historique_connexion: true,
  });
  const [quota, setQuota] = useState(null);
  const [quotaRequests, setQuotaRequests] = useState([]);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedPalier, setSelectedPalier] = useState(null);
  const [quotaRaison, setQuotaRaison] = useState('');
  const [quotaModalError, setQuotaModalError] = useState('');
  const [quotaModalLoading, setQuotaModalLoading] = useState(false);
  const [quotaSuccess, setQuotaSuccess] = useState(false);

  useEffect(() => {
    API.get('/me').then(r => {
      setNom(r.data.nom);
      setEmail(r.data.email);
      setOriginalNom(r.data.nom);
      setOriginalEmail(r.data.email);
      if (r.data.preferences) {
        setPrefs(p => ({ ...p, ...r.data.preferences }));
      }
    });
    API.get('/quota/me')
      .then(res => setQuota(res.data))
      .catch(err => console.error('quota err', err));
    API.get('/quota/requests/mine')
      .then(res => setQuotaRequests(res.data))
      .catch(err => console.error('quota requests err', err));
  }, []);

  const handleToggle = async (key) => {
    const newValue = !prefs[key];
    setPrefs(p => ({ ...p, [key]: newValue }));
    try {
      await API.put('/me/preferences', { [key]: newValue });
    } catch {
      setPrefs(p => ({ ...p, [key]: !newValue }));
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('ATTENTION : Cette action est irréversible. Tous vos fichiers, partages et données seront définitivement supprimés. Confirmer ?')) return;
    if (!window.confirm('Dernière confirmation : tapez OK pour supprimer définitivement votre compte.')) return;
    try {
      await API.delete('/me');
      localStorage.clear();
      alert('Votre compte a été supprimé.');
      window.location.href = '/login';
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      if (nom !== originalNom || email !== originalEmail) {
        await API.put('/me', { nom, email });
        localStorage.setItem('nom', nom);
        localStorage.setItem('email', email);
        setOriginalNom(nom);
        setOriginalEmail(email);
      }

      if (newPwd) {
        if (newPwd !== confirmPwd) {
          setError('Mots de passe ne correspondent pas');
          setLoading(false);
          return;
        }
        await API.put('/me/password', { current_password: currentPwd, new_password: newPwd });
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotaRequests = async () => {
    try {
      const res = await API.get('/quota/requests/mine');
      setQuotaRequests(res.data);
    } catch (e) {
      console.error('quota requests err', e);
    }
  };

  const handleSubmitQuotaRequest = async () => {
    if (!selectedPalier) return;
    setQuotaModalLoading(true);
    setQuotaModalError('');
    try {
      await API.post('/quota/requests', {
        quota_demande: selectedPalier,
        raison: quotaRaison.trim() || null,
        espace_id: null,
      });
      setShowQuotaModal(false);
      setSelectedPalier(null);
      setQuotaRaison('');
      setQuotaSuccess(true);
      setTimeout(() => setQuotaSuccess(false), 3000);
      fetchQuotaRequests();
    } catch (e) {
      setQuotaModalError(e.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setQuotaModalLoading(false);
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Annuler cette demande ?')) return;
    try {
      await API.delete(`/quota/requests/${id}`);
      fetchQuotaRequests();
    } catch (e) {
      alert(e.response?.data?.error || "Erreur lors de l'annulation");
    }
  };

  const quotaPct = quota?.pourcentage_utilise ?? 0;
  const quotaBarColor =
    quotaPct >= 90 ? '#e57373' :
    quotaPct >= 70 ? 'var(--wings-gold)' :
                     'var(--wings-blue)';

  return (
    <AppLayout>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* En-tête */}
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
            Paramètres
          </h1>
          <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
            Gérez votre compte et vos préférences
          </p>
        </div>

        {/* Bannière erreur */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: 'rgba(229,115,115,0.08)',
            border: '0.5px solid rgba(229,115,115,0.3)',
            color: '#e57373',
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Profil */}
        <Section icon={User} title="Profil">
          <Field label="Nom complet" value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" />
          <Field label="Adresse e-mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.fr" />
        </Section>

        {/* Stockage */}
        {quota && (
          <div style={{
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 16, padding: '20px 22px',
          }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
              Stockage
            </h3>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 12, margin: 0, marginBottom: 16 }}>
              Espace utilisé sur votre quota personnel.
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: 'var(--wings-text)', fontWeight: 400 }}>
                {(quota.quota_utilise_mb ?? 0).toFixed(2)}
                <span style={{ fontSize: 13, color: 'var(--wings-text-muted)', marginLeft: 4 }}>Mo</span>
              </span>
              <span style={{ color: 'var(--wings-text-muted)', fontSize: 12 }}>
                sur {(quota.quota_total_mb ?? 0).toFixed(0)} Mo
              </span>
            </div>

            <div style={{ width: '100%', height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--wings-border)' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                width: `${Math.min(100, quotaPct)}%`,
                background: quotaBarColor,
                transition: 'width 0.4s ease',
              }} />
            </div>

            <p style={{ color: 'var(--wings-text-muted)', fontSize: 11, marginTop: 6, marginBottom: 0 }}>
              {quotaPct}% de votre espace utilisé
            </p>

            <div style={{ marginTop: 14 }}>
              {userRole === 'AdminGlobal' ? (
                <p style={{ color: 'var(--wings-text-muted)', fontSize: 11, fontStyle: 'italic', margin: 0 }}>
                  Quota géré par le système d'administration.
                </p>
              ) : (
                <button
                  title={quotaPct < 80 ? "Disponible à partir de 80% d'utilisation" : undefined}
                  disabled={quotaPct < 80}
                  onClick={quotaPct >= 80 ? () => { setShowQuotaModal(true); setQuotaModalError(''); setSelectedPalier(null); setQuotaRaison(''); } : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px',
                    background: quotaPct < 80 ? 'transparent' : 'var(--wings-blue)',
                    border: quotaPct < 80 ? '0.5px solid var(--wings-border)' : 'none',
                    borderRadius: 999,
                    color: quotaPct < 80 ? 'var(--wings-text-muted)' : '#fff',
                    fontSize: 12, fontWeight: 500,
                    cursor: quotaPct < 80 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {quotaPct >= 80 && <TrendingUp size={13} />}
                  {quotaPct < 80 ? 'Seuil de 80% requis' : 'Demander une augmentation'}
                </button>
              )}
            </div>

            {quotaSuccess && (
              <div style={{
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8, fontSize: 12,
                background: 'rgba(5,150,105,0.08)',
                border: '0.5px solid rgba(5,150,105,0.3)',
                color: '#059669',
              }}>
                <Check size={12} />
                Demande envoyée avec succès !
              </div>
            )}
          </div>
        )}

        {/* Mes demandes d'augmentation */}
        {quota && userRole !== 'AdminGlobal' && (
          <div style={{
            background: 'var(--wings-surface)',
            border: '0.5px solid var(--wings-border)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 22px',
              borderBottom: '0.5px solid var(--wings-border)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'rgba(79,139,255,0.08)',
                border: '0.5px solid rgba(79,139,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <TrendingUp size={14} color="var(--wings-blue)" />
              </div>
              <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500 }}>
                Mes demandes d'augmentation
              </span>
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {quotaRequests.length === 0 ? (
                <p style={{ color: 'var(--wings-text-muted)', fontSize: 12, margin: 0, textAlign: 'center', padding: '4px 0' }}>
                  Aucune demande pour le moment.
                </p>
              ) : quotaRequests.map(req => {
                const badgeStyle = req.statut === 'approved'
                  ? { color: '#059669', background: 'rgba(5,150,105,0.08)', border: '0.5px solid rgba(5,150,105,0.3)' }
                  : req.statut === 'rejected'
                  ? { color: '#e57373', background: 'rgba(229,115,115,0.08)', border: '0.5px solid rgba(229,115,115,0.3)' }
                  : { color: 'var(--wings-gold)', background: 'rgba(212,175,55,0.08)', border: '0.5px solid rgba(212,175,55,0.3)' };
                const badgeLabel = req.statut === 'approved' ? 'Approuvée' : req.statut === 'rejected' ? 'Rejetée' : 'En attente';
                return (
                  <div key={req.id} style={{
                    padding: '12px 14px',
                    background: 'var(--wings-bg)',
                    border: '0.5px solid var(--wings-border)',
                    borderRadius: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500 }}>
                          {req.quota_demande} Go
                        </span>
                        <span style={{
                          fontSize: 10, fontFamily: 'monospace', letterSpacing: '1px',
                          textTransform: 'uppercase', borderRadius: 999,
                          padding: '2px 8px', ...badgeStyle,
                        }}>
                          {badgeLabel}
                        </span>
                      </div>
                      {req.statut === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          style={{
                            fontSize: 11, color: 'var(--wings-text-muted)',
                            background: 'none', border: '0.5px solid var(--wings-border)',
                            borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                          }}
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                    <p style={{ color: 'var(--wings-text-muted)', fontSize: 11, margin: 0 }}>
                      Demandé le {new Date(req.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    {(req.statut === 'approved' || req.statut === 'rejected') && (
                      <div style={{ marginTop: 6 }}>
                        {req.traite_at && (
                          <p style={{ color: 'var(--wings-text-muted)', fontSize: 11, margin: 0 }}>
                            Traité le {new Date(req.traite_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        {req.reponse_admin && (
                          <p style={{ color: 'var(--wings-text-muted)', fontSize: 11, margin: '4px 0 0 0', fontStyle: 'italic' }}>
                            "{req.reponse_admin}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sécurité */}
        <Section icon={Lock} title="Sécurité">
          <Field label="Mot de passe actuel" type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" />
          <Field label="Nouveau mot de passe" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" />
          <Field label="Confirmer le mot de passe" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" />
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Notifications">
          <Toggle label="Partages reçus" description="Être notifié quand quelqu'un partage un fichier avec vous" checked={prefs.notif_partages} onChange={() => handleToggle('notif_partages')} />
          <Toggle label="Nouvelles versions" description="Être notifié lors de la mise à jour d'un fichier partagé" checked={prefs.notif_versions} onChange={() => handleToggle('notif_versions')} />
          <Toggle label="Connexions suspectes" description="Alerte en cas de connexion depuis un nouvel appareil" checked={prefs.notif_connexions_suspectes} onChange={() => handleToggle('notif_connexions_suspectes')} />
          <Toggle label="Résumé hebdomadaire" description="Recevoir un rapport d'activité chaque semaine" checked={prefs.notif_resume_hebdo} onChange={() => handleToggle('notif_resume_hebdo')} />
        </Section>

        {/* Confidentialité */}
        <Section icon={Shield} title="Confidentialité">
          <Toggle label="Profil visible" description="Permettre aux autres utilisateurs de vous trouver par e-mail" checked={prefs.confidentialite_profil_visible} onChange={() => handleToggle('confidentialite_profil_visible')} />
          <Toggle label="Historique de connexion" description="Conserver l'historique de vos connexions (90 jours)" checked={prefs.confidentialite_historique_connexion} onChange={() => handleToggle('confidentialite_historique_connexion')} />
        </Section>

        {/* Zone de danger */}
        <div style={{
          background: 'var(--wings-surface)',
          border: '0.5px solid rgba(229,115,115,0.3)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid rgba(229,115,115,0.2)' }}>
            <span style={{ color: '#e57373', fontSize: 12, fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Zone de danger
            </span>
          </div>
          <div style={{ padding: '18px 22px' }}>
            <button
              onClick={handleDeleteAccount}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left', padding: 0,
              }}
            >
              <div>
                <p style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, margin: 0, marginBottom: 2 }}>
                  Supprimer mon compte
                </p>
                <p style={{ color: 'var(--wings-text-muted)', fontSize: 11, margin: 0 }}>
                  Cette action est irréversible. Toutes vos données seront effacées.
                </p>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--wings-text-muted)', flexShrink: 0 }} />
            </button>
          </div>
        </div>

        {/* Enregistrer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 8 }}>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 22px',
              background: saved ? '#059669' : 'var(--wings-blue)',
              border: 'none', borderRadius: 999,
              color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'background 0.2s',
            }}
          >
            {saved && <Check size={14} />}
            {saved ? 'Sauvegardé' : loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>

      </div>

      {/* Modal demande d'augmentation de quota */}
      {showQuotaModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowQuotaModal(false)}
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
              onClick={() => setShowQuotaModal(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none',
                color: 'var(--wings-text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 4, borderRadius: 6,
              }}
            >
              <X size={16} />
            </button>

            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
              Demander une augmentation
            </h2>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 12, margin: 0, marginBottom: 20 }}>
              Choisissez le quota souhaité. Un administrateur examinera votre demande.
            </p>

            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: 'var(--wings-bg)',
              border: '0.5px solid var(--wings-border)',
              fontSize: 12, color: 'var(--wings-text-muted)',
            }}>
              Quota actuel :&nbsp;
              <strong style={{ color: 'var(--wings-text)' }}>
                {(quota.quota_total_mb / 1024).toFixed(2)} Go
              </strong>
            </div>

            <p style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--wings-gold)', margin: 0, marginBottom: 10 }}>
              Quota souhaité
            </p>
            {(() => {
              const quotaActuelGo = quota.quota_total_mb / 1024;
              const paliers = [5, 10, 20, 50].filter(p => p > quotaActuelGo);
              return paliers.length === 0 ? (
                <p style={{ color: 'var(--wings-text-muted)', fontSize: 12, marginBottom: 16 }}>
                  Aucun palier disponible supérieur à votre quota actuel.
                </p>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {paliers.map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPalier(p)}
                      style={{
                        padding: '8px 18px', borderRadius: 999, fontSize: 13,
                        cursor: 'pointer', fontWeight: 500, border: '0.5px solid',
                        transition: 'all 0.15s',
                        background: selectedPalier === p ? 'var(--wings-blue)' : 'var(--wings-bg)',
                        borderColor: selectedPalier === p ? 'var(--wings-blue)' : 'var(--wings-border)',
                        color: selectedPalier === p ? '#fff' : 'var(--wings-text)',
                      }}
                    >
                      {p} Go
                    </button>
                  ))}
                </div>
              );
            })()}

            <p style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--wings-gold)', margin: 0, marginBottom: 8 }}>
              Raison{' '}
              <span style={{ color: 'var(--wings-text-muted)', textTransform: 'none', letterSpacing: 0, fontFamily: 'inherit' }}>
                (optionnel)
              </span>
            </p>
            <textarea
              value={quotaRaison}
              onChange={e => setQuotaRaison(e.target.value)}
              maxLength={500}
              placeholder="Décrivez pourquoi vous avez besoin de plus d'espace…"
              rows={3}
              style={{
                width: '100%', resize: 'vertical',
                padding: '10px 14px',
                background: 'var(--wings-bg)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 10, color: 'var(--wings-text)',
                fontSize: 12, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit', marginBottom: 4,
              }}
              onFocus={e => e.target.style.borderColor = 'var(--wings-blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--wings-border)'}
            />
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 10, margin: 0, marginBottom: 16, textAlign: 'right' }}>
              {quotaRaison.length}/500
            </p>

            {quotaModalError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14,
                background: 'rgba(229,115,115,0.08)',
                border: '0.5px solid rgba(229,115,115,0.3)',
                color: '#e57373',
              }}>
                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                {quotaModalError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowQuotaModal(false)}
                style={{
                  padding: '9px 18px', borderRadius: 999, fontSize: 12,
                  background: 'none', border: '0.5px solid var(--wings-border)',
                  color: 'var(--wings-text-muted)', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitQuotaRequest}
                disabled={!selectedPalier || quotaModalLoading}
                style={{
                  padding: '9px 20px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  background: 'var(--wings-blue)', border: 'none',
                  color: '#fff',
                  cursor: !selectedPalier || quotaModalLoading ? 'not-allowed' : 'pointer',
                  opacity: !selectedPalier || quotaModalLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {quotaModalLoading ? 'Envoi…' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
