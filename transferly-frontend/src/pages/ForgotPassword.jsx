import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Share2, ArrowLeft, Send } from 'lucide-react';
import { forgotPassword } from '../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await forgotPassword({ email });
    } catch (err) {
      console.error(err);
    }
    setSent(true);
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

        {!sent ? (
          <>
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              <Mail className="w-7 h-7" style={{ color: '#06b6d4' }} />
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-1 text-center">
              Réinitialiser le mot de passe
            </h2>
            <p className="text-slate-400 text-sm mb-7 text-center">
              Entrez votre email et nous vous enverrons un lien de réinitialisation.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-2">Adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110"
                style={{
                  background: '#06b6d4',
                  color: '#0a0a0f',
                  boxShadow: '0 0 24px rgba(6,182,212,0.3)',
                }}
              >
                <Send className="w-4 h-4" />
                Envoyer le lien
              </button>
            </form>

            <div className="text-center mt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour à la connexion
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            {/* Success icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              ✉️
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-2">Email envoyé !</h2>
            <p className="text-slate-400 text-sm mb-7">
              Vérifiez votre boîte mail pour réinitialiser votre mot de passe. Le lien expire dans 15 minutes.
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
              Retour à la connexion
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
