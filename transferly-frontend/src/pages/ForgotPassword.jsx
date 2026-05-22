import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
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
  width:        '100%',
  boxSizing:    'border-box',
  padding:      '12px 16px',
  borderRadius: 12,
  border:       '1px solid var(--wings-border)',
  background:   'var(--wings-surface)',
  color:        'var(--wings-text)',
  fontSize:     14,
  fontFamily:   'inherit',
  outline:      'none',
  transition:   'border-color 0.2s ease, box-shadow 0.2s ease',
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

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ email });
    } catch (err) {
      console.error(err);
    }
    setSent(true);
    setLoading(false);
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
          Mot de passe oublié ?
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
          On t'envoie un lien pour repartir.
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
          {!sent ? (
            <>
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

                <button
                  type="submit"
                  disabled={loading}
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
                    cursor:       loading ? 'not-allowed' : 'pointer',
                    opacity:      loading ? 0.6 : 1,
                    transition:   'background 0.2s ease',
                    marginTop:    4,
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--wings-blue-dark)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--wings-blue)'; }}
                >
                  {loading ? 'Envoi...' : 'Envoyer le lien →'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--wings-text-muted)' }}>
                Tu te souviens ?{' '}
                <Link to="/login" style={{ color: 'var(--wings-blue)', textDecoration: 'underline' }}>
                  Retour à la connexion.
                </Link>
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontStyle:  'italic',
                  fontSize:   18,
                  color:      'var(--wings-text)',
                  margin:     '0 0 12px',
                  lineHeight: 1.5,
                }}
              >
                Le message a pris son envol.
              </p>
              <p
                style={{
                  fontSize:   13,
                  color:      'var(--wings-text-muted)',
                  lineHeight: 1.6,
                  margin:     '0 0 28px',
                }}
              >
                Vérifie ta boîte mail. Si rien n'arrive d'ici quelques minutes, regarde tes spams.
              </p>

              <button
                onClick={() => navigate('/login')}
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
                  cursor:       'pointer',
                  transition:   'background 0.2s ease',
                  marginBottom: 16,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--wings-blue-dark)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--wings-blue)'; }}
              >
                Retour à la connexion →
              </button>

              <button
                onClick={() => setSent(false)}
                style={{
                  background:  'none',
                  border:      'none',
                  cursor:      'pointer',
                  fontSize:    12,
                  color:       'var(--wings-text-muted)',
                  textDecoration: 'underline',
                  fontFamily:  'inherit',
                }}
              >
                Réessayer avec un autre email
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
