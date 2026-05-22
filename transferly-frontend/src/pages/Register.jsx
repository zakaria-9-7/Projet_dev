import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import CicadaProtective from '../components/CicadaProtective';
import './Register.css';

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
  width:           '100%',
  boxSizing:       'border-box',
  padding:         '12px 16px',
  borderRadius:    12,
  border:          '1px solid var(--wings-border)',
  background:      'var(--wings-surface)',
  color:           'var(--wings-text)',
  fontSize:        14,
  fontFamily:      'inherit',
  outline:         'none',
  transition:      'border-color 0.2s ease, box-shadow 0.2s ease',
};

function Field({ label, id, focusStyle, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input
        id={id}
        style={{
          ...inputBase,
          ...(focused ? { borderColor: 'var(--wings-blue)', boxShadow: '0 0 0 3px rgba(79,139,255,0.15)' } : {}),
        }}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
    </div>
  );
}

export default function Register() {
  const [form, setForm] = useState({ nom: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const confirmMismatch = form.confirm.length > 0 && form.confirm !== form.password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await register({ nom: form.nom, email: form.email, password: form.password });
      navigate('/login', { state: { message: 'Compte créé, connecte-toi.' } });
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="register-page"
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
      <div className="register-grid" />
      <div className="register-halo-blue" />
      <div className="register-glow-gold" />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>

        {/* Cigale + halo */}
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
            fontFamily:  'Georgia, "Times New Roman", serif',
            fontSize:    38,
            fontWeight:  400,
            color:       'var(--wings-text)',
            textAlign:   'center',
            margin:      '24px 0 0',
            lineHeight:  1.15,
          }}
        >
          Bienvenue parmi nous.
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
          Crée ton compte. La cigale veille.
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
              label="Nom complet"
              id="nom"
              type="text"
              placeholder="Jean Dupont"
              value={form.nom}
              onChange={e => update('nom', e.target.value)}
              required
            />

            <Field
              label="Email"
              id="email"
              type="email"
              placeholder="nom@exemple.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              required
            />

            <Field
              label="Mot de passe"
              id="password"
              type="password"
              placeholder="8 caractères minimum"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              required
            />

            {/* Confirmation mot de passe */}
            <div>
              <label htmlFor="confirm" style={labelStyle}>Confirmer le mot de passe</label>
              <input
                id="confirm"
                type="password"
                placeholder="Répète ton mot de passe"
                value={form.confirm}
                onChange={e => update('confirm', e.target.value)}
                required
                style={{
                  ...inputBase,
                  ...(confirmMismatch
                    ? { borderColor: 'rgba(239,68,68,0.5)', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' }
                    : {}
                  ),
                }}
              />
              {confirmMismatch && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f87171' }}>
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width:         '100%',
                padding:       '14px 24px',
                borderRadius:  9999,
                border:        'none',
                background:    'var(--wings-blue)',
                color:         '#ffffff',
                fontSize:      14,
                fontWeight:    500,
                fontFamily:    'inherit',
                cursor:        loading ? 'not-allowed' : 'pointer',
                opacity:       loading ? 0.6 : 1,
                transition:    'background 0.2s ease, box-shadow 0.2s ease',
                marginTop:     4,
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.background = 'var(--wings-blue-dark)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--wings-blue)';
              }}
            >
              {loading ? 'Création...' : 'Décoller →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--wings-text-muted)' }}>
            Déjà un compte ?{' '}
            <Link
              to="/login"
              style={{ color: 'var(--wings-blue-pale)', textDecoration: 'underline' }}
            >
              Se connecter.
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
