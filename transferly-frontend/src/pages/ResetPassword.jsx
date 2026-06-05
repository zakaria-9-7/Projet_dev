import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, Share2, CheckCircle } from 'lucide-react';
import { resetPassword } from '../api/auth';

export default function ResetPassword() {
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);
  const { token } = useParams();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    try {
      await resetPassword(token, { password });
      setSuccess(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la réinitialisation.');
    }
  };

  const inputCls = 'w-full py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

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
        className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
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
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              <Lock className="w-7 h-7" style={{ color: '#06b6d4' }} />
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-1 text-center">Nouveau mot de passe</h2>
            <p className="text-slate-400 text-sm mb-7 text-center">
              Choisissez un mot de passe fort d'au moins 8 caractères.
            </p>

            {error && (
              <div
                className="px-4 py-3 rounded-lg mb-5 text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-2">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min. 8 caractères"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className={`${inputCls} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-2">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Répéter le mot de passe"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
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
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all mt-1 hover:brightness-110"
                style={{
                  background: '#06b6d4',
                  color: '#0a0a0f',
                  boxShadow: '0 0 24px rgba(6,182,212,0.3)',
                }}
              >
                Réinitialiser le mot de passe
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            {/* Success icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: '#34d399' }} />
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-2">Mot de passe modifié !</h2>
            <p className="text-slate-400 text-sm mb-7">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
              style={{
                background: '#06b6d4',
                color: '#0a0a0f',
                boxShadow: '0 0 24px rgba(6,182,212,0.3)',
              }}
            >
              Aller à la connexion
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
