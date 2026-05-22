import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyOTP, login } from '../api/auth';
import CicadaProtective from '../components/CicadaProtective';
import './Login.css';

export default function OTP() {
  const [code,      setCode]      = useState('');
  const [error,     setError]     = useState('');
  const [timer,     setTimer]     = useState(300);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
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

  const handleChange = (val) => {
    if (!/^\d*$/.test(val)) return;
    setCode(val.slice(0, 6));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length < 6) { setError('Entrez les 6 chiffres.'); return; }
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
      setError(err.response?.data?.error || 'Code incorrect. Essaie encore.');
      setCode('');
      inputRef.current?.focus();
    }
  };

  const handleResend = async () => {
    const email    = localStorage.getItem('email_pending');
    const password = localStorage.getItem('password_pending');
    if (!email || !password) { navigate('/login'); return; }
    setResending(true);
    try {
      const res = await login({ email, password });
      localStorage.setItem('user_id', res.data.user_id);
      setTimer(300);
      setCode('');
      setError('');
      inputRef.current?.focus();
    } catch {
      navigate('/login');
    } finally {
      setResending(false);
    }
  };

  const timerUrgent = timer < 30;

  return (
    <div
      className="login-page"
      style={{
        minHeight:      '100vh',
        background:     'var(--wings-bg)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '48px 16px',
      }}
    >
      <div className="login-grid" />
      <div className="login-halo-blue" />
      <div className="login-glow-gold" />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>

        {/* Cigale + halo focal */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, position: 'relative' }}>
          <div
            style={{
              position:     'absolute',
              top:          '50%',
              left:         '50%',
              transform:    'translate(-50%, -50%)',
              width:        240,
              height:       240,
              borderRadius: '50%',
              background:   'radial-gradient(circle, rgba(79,139,255,0.18) 0%, transparent 70%)',
              filter:       'blur(30px)',
              pointerEvents:'none',
            }}
          />
          <CicadaProtective size={180} />
        </div>

        {/* Header */}
        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize:   38,
            fontWeight: 400,
            color:      'var(--wings-text)',
            textAlign:  'center',
            margin:     '24px 0 0',
            lineHeight: 1.15,
          }}
        >
          Un code, et tu décolles.
        </h1>
        <p
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle:  'italic',
            fontSize:   14,
            color:      'var(--wings-text-muted)',
            textAlign:  'center',
            margin:     '8px 0 32px',
          }}
        >
          On vient de t'envoyer un code à 6 chiffres.
        </p>

        {/* Card */}
        <div
          style={{
            background:   'var(--wings-surface)',
            border:       '1px solid var(--wings-border)',
            borderRadius: 20,
            padding:      '32px 28px',
          }}
        >
          {/* Message d'erreur */}
          {error && (
            <div
              style={{
                padding:      '12px 16px',
                borderRadius: 10,
                marginBottom: 20,
                fontSize:     13,
                background:   'rgba(239,68,68,0.08)',
                border:       '1px solid rgba(239,68,68,0.25)',
                color:        '#f87171',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Champ code */}
            <div>
              <label
                htmlFor="otp-code"
                style={{
                  display:       'block',
                  fontFamily:    'monospace',
                  fontSize:      11,
                  fontWeight:    700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color:         'var(--wings-gold)',
                  marginBottom:  8,
                }}
              >
                Code de vérification
              </label>
              <input
                ref={inputRef}
                id="otp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => handleChange(e.target.value)}
                placeholder="• • • • • •"
                autoComplete="one-time-code"
                style={{
                  width:         '100%',
                  boxSizing:     'border-box',
                  padding:       '16px',
                  borderRadius:  12,
                  border:        `1px solid ${code.length === 6 ? 'var(--wings-blue)' : 'var(--wings-border)'}`,
                  background:    'var(--wings-surface)',
                  color:         'var(--wings-text)',
                  fontSize:      24,
                  fontFamily:    'monospace',
                  fontWeight:    700,
                  letterSpacing: '0.5em',
                  textAlign:     'center',
                  outline:       'none',
                  transition:    'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow:     code.length === 6 ? '0 0 0 3px rgba(79,139,255,0.15)' : 'none',
                }}
              />
            </div>

            {/* Timer */}
            <p
              style={{
                textAlign:  'center',
                fontSize:   13,
                color:      'var(--wings-text-muted)',
                margin:     0,
              }}
            >
              Code valide encore{' '}
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color:      timerUrgent ? '#f87171' : 'var(--wings-blue)',
                }}
              >
                {formatTime(timer)}
              </span>
            </p>

            <button
              type="submit"
              disabled={code.length < 6}
              style={{
                width:        '100%',
                padding:      '14px 24px',
                borderRadius: 9999,
                border:       'none',
                background:   'var(--wings-blue)',
                color:        '#ffffff',
                fontSize:     14,
                fontWeight:   500,
                fontFamily:   'inherit',
                cursor:       code.length < 6 ? 'not-allowed' : 'pointer',
                opacity:      code.length < 6 ? 0.5 : 1,
                transition:   'background 0.2s ease, opacity 0.2s ease',
                marginTop:    4,
              }}
              onMouseEnter={e => { if (code.length === 6) e.currentTarget.style.background = 'var(--wings-blue-dark)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--wings-blue)'; }}
            >
              Vérifier →
            </button>
          </form>

          {/* Renvoyer */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--wings-text-muted)' }}>
            Pas reçu ?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              style={{
                background:     'none',
                border:         'none',
                cursor:         resending ? 'not-allowed' : 'pointer',
                fontSize:       13,
                color:          'var(--wings-text-muted)',
                textDecoration: 'underline',
                fontFamily:     'inherit',
                opacity:        resending ? 0.5 : 1,
                padding:        0,
              }}
            >
              {resending ? 'Envoi...' : 'Renvoyer le code.'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
