import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import CicadaProtective from '../components/CicadaProtective';
import './Login.css';

const labelStyle = {
  display:       'block',
  fontFamily:    'monospace',
  fontSize:      11,
  fontWeight:    700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color:         'var(--wings-gold)',
  marginBottom:  8,
};

const inputBase = {
  width:       '100%',
  boxSizing:   'border-box',
  padding:     '12px 16px',
  borderRadius: 12,
  border:      '1px solid var(--wings-border)',
  background:  'var(--wings-surface)',
  color:       'var(--wings-text)',
  fontSize:    14,
  fontFamily:  'inherit',
  outline:     'none',
  transition:  'border-color 0.2s ease, box-shadow 0.2s ease',
};

const focusedExtra = {
  borderColor: 'var(--wings-blue)',
  boxShadow:   '0 0 0 3px rgba(79,139,255,0.15)',
};

function Field({ label, id, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input
        id={id}
        style={{ ...inputBase, ...(focused ? focusedExtra : {}) }}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
    </div>
  );
}

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [pwdFocus, setPwdFocus] = useState(false);
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
      localStorage.setItem('user_id',          res.data.user_id);
      localStorage.setItem('email_pending',    email);
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
      {/* Éléments décoratifs de fond */}
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
              width:        260,
              height:       260,
              borderRadius: '50%',
              background:   'radial-gradient(circle, rgba(79,139,255,0.18) 0%, transparent 70%)',
              filter:       'blur(30px)',
              pointerEvents:'none',
            }}
          />
          <CicadaProtective size={200} />
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
          Bon retour parmi nous.
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
          La cigale t'attendait.
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

            <Field
              label="Email"
              id="email"
              type="email"
              placeholder="nom@exemple.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            {/* Mot de passe — avec lien "oublié" et toggle affichage */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <label htmlFor="password" style={labelStyle}>Mot de passe</label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize:       12,
                    color:          'var(--wings-text-muted)',
                    textDecoration: 'underline',
                  }}
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPwdFocus(true)}
                  onBlur={() => setPwdFocus(false)}
                  required
                  style={{
                    ...inputBase,
                    paddingRight: 64,
                    ...(pwdFocus ? focusedExtra : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position:   'absolute',
                    right:      12,
                    top:        '50%',
                    transform:  'translateY(-50%)',
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    fontFamily: 'monospace',
                    fontSize:   10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color:      'var(--wings-text-muted)',
                    padding:    '2px 4px',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; }}
                >
                  {showPwd ? 'CACHER' : 'VOIR'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width:       '100%',
                padding:     '14px 24px',
                borderRadius: 9999,
                border:      'none',
                background:  'var(--wings-blue)',
                color:       '#ffffff',
                fontSize:    14,
                fontWeight:  500,
                fontFamily:  'inherit',
                cursor:      loading ? 'not-allowed' : 'pointer',
                opacity:     loading ? 0.6 : 1,
                transition:  'background 0.2s ease, box-shadow 0.2s ease',
                marginTop:   4,
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.background = 'var(--wings-blue-dark)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--wings-blue)';
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--wings-text-muted)' }}>
            Pas encore de compte ?{' '}
            <Link
              to="/register"
              style={{ color: 'var(--wings-blue-pale)', textDecoration: 'underline' }}
            >
              S'inscrire.
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
