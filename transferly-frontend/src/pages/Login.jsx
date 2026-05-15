import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Share2 } from 'lucide-react';
import { login } from '../api/auth';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await login({ email, password });
      localStorage.setItem('user_id', res.data.user_id);
      localStorage.setItem('email_pending', email);
      localStorage.setItem('password_pending', password);

      if (res.data.otp_dev) {
        alert(`Code OTP (mode démo) : ${res.data.otp_dev}\n\nCe code sera également visible dans la console serveur.`);
      }

      navigate('/otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

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
          <span className="font-bold text-white text-sm tracking-tight">Transferly</span>
        </div>

        <h2 className="text-2xl font-extrabold text-white mb-1 text-center">Bon retour</h2>
        <p className="text-slate-400 text-sm mb-7 text-center">Vos cours et projets vous attendent.</p>

        {error && (
          <div
            className="px-4 py-3 rounded-lg mb-5 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Adresse email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type="email"
                placeholder="exemple@transferly.ma"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-white/60">Mot de passe</label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
            style={{
              background: '#06b6d4',
              color: '#0a0a0f',
              boxShadow: '0 0 24px rgba(6,182,212,0.3)',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            S'inscrire gratuitement
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
