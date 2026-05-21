import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Share2, ShieldCheck } from 'lucide-react';
import { verifyOTP, login } from '../api/auth';

export default function OTP() {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error,  setError]  = useState('');
  const [timer,  setTimer]  = useState(300);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(interval); navigate('/login'); }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleChange = (val, i) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) { setError('Entrez les 6 chiffres'); return; }
    const user_id = localStorage.getItem('user_id');
    try {
      const res = await verifyOTP({ user_id: parseInt(user_id), code });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role',  res.data.role);
      if (res.data.nom)   localStorage.setItem('nom',   res.data.nom);
      if (res.data.email) localStorage.setItem('email', res.data.email);

      if (res.data.must_reset_password) {
        localStorage.setItem('must_reset_password', 'true');
        // Garder password_pending pour pré-remplir le champ sur /force-reset-password
        navigate('/force-reset-password');
      } else {
        localStorage.removeItem('must_reset_password');
        localStorage.removeItem('email_pending');
        localStorage.removeItem('password_pending');
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Code incorrect');
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
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
        className="relative z-10 w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center"
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

        {/* Shield icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
        >
          <ShieldCheck className="w-7 h-7" style={{ color: '#06b6d4' }} />
        </div>

        <h2 className="text-xl font-extrabold text-white mb-2">Vérification en deux étapes</h2>
        <p className="text-slate-400 text-sm mb-6">Entrez le code envoyé à votre adresse email</p>

        {error && (
          <div
            className="px-4 py-3 rounded-lg mb-5 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* OTP boxes */}
          <div className="flex gap-2.5 justify-center mb-5">
            {digits.map((d, i) => (
              <motion.input
                key={i}
                ref={el => (refs.current[i] = el)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(e.target.value, i)}
                onKeyDown={e => handleKeyDown(e, i)}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl text-white transition-all outline-none focus:ring-2"
                style={{
                  background: d ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.05)',
                  border: d ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  '--tw-ring-color': 'rgba(6,182,212,0.4)',
                }}
              />
            ))}
          </div>

          <p className="text-slate-400 text-sm mb-5">
            Code expire dans :{' '}
            <span
              className="font-bold"
              style={{ color: timer < 30 ? '#f87171' : '#06b6d4' }}
            >
              {formatTime(timer)}
            </span>
          </p>

          <button
            type="submit"
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all mb-4 hover:brightness-110"
            style={{
              background: '#06b6d4',
              color: '#0a0a0f',
              boxShadow: '0 0 24px rgba(6,182,212,0.3)',
            }}
          >
            Valider le code
          </button>
        </form>

        <button
          onClick={async () => {
            const email = localStorage.getItem('email_pending');
            const password = localStorage.getItem('password_pending');
            if (!email || !password) { navigate('/login'); return; }
            setResending(true);
            try {
              const res = await login({ email, password });
              localStorage.setItem('user_id', res.data.user_id);
              setTimer(300);
              setDigits(['', '', '', '', '', '']);
              setError('');
              refs.current[0]?.focus();
            } catch {
              navigate('/login');
            } finally {
              setResending(false);
            }
          }}
          disabled={resending}
          className="text-sm font-medium transition-colors disabled:opacity-50"
          style={{ color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {resending ? 'Envoi...' : 'Renvoyer le code'}
        </button>
      </motion.div>
    </div>
  );
}
