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
      localStorage.removeItem('email_pending');
      localStorage.removeItem('password_pending');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Code incorrect');
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background circles */}
      <div className="geo-circle-1 top-16  right-[-40px] !bg-cyan-200/20 pointer-events-none" />
      <div className="geo-circle-2 bottom-16 left-6      !bg-cyan-300/15 pointer-events-none" />
      <div className="geo-circle-3 top-1/2 left-1/3      !bg-cyan-400/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-md p-10 text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <Share2 className="w-5 h-5 text-cyan-500" />
          <span className="font-bold text-slate-900 text-base">Transferly</span>
        </div>

        <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-cyan-500" />
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Vérification en deux étapes</h2>
        <p className="text-slate-500 text-sm mb-6">Entrez le code envoyé à votre adresse email</p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* OTP boxes — staggered Motion animation */}
          <div className="flex gap-2.5 justify-center mb-5">
            {digits.map((d, i) => (
              <motion.input
                key={i}
                ref={el => (refs.current[i] = el)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0  }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(e.target.value, i)}
                onKeyDown={e => handleKeyDown(e, i)}
                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl text-slate-900 transition-colors outline-none focus:ring-2 focus:ring-cyan-300 ${
                  d ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'
                }`}
              />
            ))}
          </div>

          <p className="text-slate-500 text-sm mb-5">
            Code expire dans :{' '}
            <span className={`font-bold ${timer < 30 ? 'text-red-500' : 'text-cyan-600'}`}>
              {formatTime(timer)}
            </span>
          </p>

          <button
            type="submit"
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg text-sm transition-colors mb-3"
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
          className="text-sm text-cyan-600 hover:text-cyan-700 font-medium bg-transparent border-none cursor-pointer transition-colors disabled:opacity-50"
        >
          {resending ? 'Envoi...' : 'Renvoyer le code'}
        </button>
      </motion.div>
    </div>
  );
}
