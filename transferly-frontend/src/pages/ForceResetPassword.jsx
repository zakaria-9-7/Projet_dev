import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, Share2, ShieldAlert, CheckCircle } from 'lucide-react';
import { changePassword } from '../api/auth';

export default function ForceResetPassword() {
  const navigate = useNavigate();

  // Le mot de passe temporaire peut être pré-récupéré depuis localStorage
  // (conservé par OTP.jsx lorsque must_reset_password=true)
  const tempPassword = localStorage.getItem('password_pending') || '';

  const [currentPwd,  setCurrentPwd]  = useState(tempPassword);
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPwd !== confirmPwd) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPwd.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPwd === currentPwd) {
      setError('Le nouveau mot de passe doit être différent du mot de passe temporaire.');
      return;
    }

    setLoading(true);
    try {
      await changePassword({ current_password: currentPwd, new_password: newPwd });
      // Nettoyer les flags de force-reset du localStorage
      localStorage.removeItem('must_reset_password');
      localStorage.removeItem('password_pending');
      localStorage.removeItem('email_pending');
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => navigate('/dashboard', { replace: true });

  const inputCls = 'w-full py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Bannière d'avertissement */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{
            background: 'rgba(251,146,60,0.08)',
            border: '1px solid rgba(251,146,60,0.25)',
            color: '#fb923c',
          }}
        >
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>
            <strong>Sécurité requise.</strong> Votre mot de passe doit être changé avant de pouvoir
            accéder à la plateforme. Vous ne pouvez pas naviguer ailleurs tant que cette étape
            n'est pas terminée.
          </span>
        </div>

        {/* Card principale */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-7">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #a78bfa)' }}
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">Wings</span>
          </div>

          {!success ? (
            <>
              {/* Lock icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}
              >
                <Lock className="w-7 h-7" style={{ color: '#fb923c' }} />
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-1 text-center">
                Changer votre mot de passe
              </h2>
              <p className="text-slate-400 text-sm mb-7 text-center">
                Choisissez un mot de passe personnel fort d'au moins 8 caractères.
              </p>

              {error && (
                <div
                  className="px-4 py-3 rounded-lg mb-5 text-sm"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Mot de passe actuel (temporaire) */}
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2">
                    Mot de passe temporaire actuel
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="Mot de passe temporaire reçu"
                      value={currentPwd}
                      onChange={e => setCurrentPwd(e.target.value)}
                      required
                      className={`${inputCls} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Nouveau mot de passe */}
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      placeholder="Min. 8 caractères"
                      value={newPwd}
                      onChange={e => setNewPwd(e.target.value)}
                      required
                      className={`${inputCls} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmer le nouveau mot de passe */}
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Répéter le mot de passe"
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      required
                      className={`${inputCls} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-sm font-semibold transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
                  style={{
                    background: '#fb923c',
                    color: '#0a0a0f',
                    boxShadow: '0 0 24px rgba(251,146,60,0.3)',
                  }}
                >
                  {loading ? 'Modification en cours…' : 'Changer mon mot de passe'}
                </button>
              </form>
            </>
          ) : (
            /* ── Succès ── */
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: '#34d399' }} />
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-2">Mot de passe modifié !</h2>
              <p className="text-slate-400 text-sm mb-7">
                Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant accéder à
                la plateforme.
              </p>

              <button
                onClick={goToDashboard}
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
                style={{
                  background: '#06b6d4',
                  color: '#0a0a0f',
                  boxShadow: '0 0 24px rgba(6,182,212,0.3)',
                }}
              >
                Accéder au tableau de bord
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
