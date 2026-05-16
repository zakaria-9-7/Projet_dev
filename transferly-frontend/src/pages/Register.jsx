import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Mail, Lock, Eye, EyeOff, Share2 } from 'lucide-react';
import { register } from '../api/auth';

export default function Register() {
  const [form, setForm] = useState({
    nom: '', email: '', password: '', confirm: '', role: 'Utilisateur',
  });
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const navigate = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await register({ nom: form.nom, email: form.email, password: form.password, role: form.role });
      setSuccess('Compte créé avec succès ! Redirection...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription");
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
        <div className="flex items-center justify-center gap-2 mb-7">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #a78bfa)' }}
          >
            <Share2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">Transferly</span>
        </div>

        <h2 className="text-2xl font-extrabold text-white mb-1 text-center">Créer un compte</h2>
        <p className="text-slate-400 text-sm mb-6 text-center">Rejoignez votre espace académique</p>

        {error && (
          <div
            className="px-4 py-3 rounded-lg mb-4 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className="px-4 py-3 rounded-lg mb-4 text-sm"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nom */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type="text"
                placeholder="Jean Dupont"
                value={form.nom}
                onChange={e => update('nom', e.target.value)}
                required
                className={`${inputCls} pl-10 pr-4`}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Adresse email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type="email"
                placeholder="nom@exemple.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
                className={`${inputCls} pl-10 pr-4`}
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => update('password', e.target.value)}
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

          {/* Confirmer mot de passe */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => update('confirm', e.target.value)}
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
            Créer mon compte
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-4 text-center">
          Vous serez inscrit en tant qu'utilisateur.
          Vous pourrez créer vos propres espaces collaboratifs après inscription.
        </p>

        <p className="text-center text-xs text-slate-600 mt-4">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
