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

      // MODE DEV : afficher le code OTP directement
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
    <div className="flex min-h-screen font-sans">

      {/* ── GAUCHE ── */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0,   opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex flex-col flex-1 bg-gradient-to-br from-cyan-500 to-cyan-700 p-12 relative overflow-hidden"
      >
        {/* Geometric shapes */}
        <div className="geo-circle-1 top-10 right-[-40px]" />
        <div className="geo-circle-2 bottom-20 left-6"     />
        <div className="geo-circle-3 top-1/2 left-1/3"     />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-2 text-white">
          <Share2 className="w-6 h-6" />
          <span className="text-xl font-bold">Transferly</span>
        </div>

        {/* Pitch */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Le savoir se partage.<br />Faites-le avec méthode.
          </h1>
          <p className="text-cyan-100 text-lg leading-relaxed max-w-xs">
            Déposez, organisez et partagez vos ressources académiques en toute sécurité.
          </p>
        </div>

        {/* File preview cards */}
        <div className="relative z-10 flex flex-col gap-3">
          {[
            { name: 'TP_Reseaux_2026.pdf',  status: 'Envoyé',   color: 'bg-cyan-400'   },
            { name: 'Cours_Python.zip',      status: 'En cours', color: 'bg-amber-400'  },
            { name: 'Projet_ICCN.zip',       status: 'Reçu',     color: 'bg-violet-400' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-xl px-4 py-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Share2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{f.name}</p>
                <p className="text-cyan-200 text-xs">
                  {i === 0 ? 'Il y a 2 heures' : i === 1 ? "Aujourd'hui" : 'Hier'}
                </p>
              </div>
              <span className={`${f.color} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}>
                {f.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── DROITE ── */}
      <div className="flex flex-1 items-center justify-center bg-sky-50 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-sm bg-white rounded-2xl shadow-md p-10"
        >
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <Share2 className="w-5 h-5 text-cyan-500" />
            <span className="font-bold text-slate-900 text-base">Transferly</span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Bon retour</h2>
          <p className="text-slate-500 text-sm mb-6">Vos cours et projets vous attendent.</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="exemple@transferly.ma"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Mot de passe</label>
                <Link to="/forgot-password" className="text-xs text-cyan-600 hover:text-cyan-700 transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg text-sm transition-colors mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-cyan-600 font-semibold hover:text-cyan-700 transition-colors">
              S'inscrire gratuitement
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
