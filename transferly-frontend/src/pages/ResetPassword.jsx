import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { resetPassword } from '../api/auth';
import CicadaProtective from '../components/CicadaProtective';

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

export default function ResetPassword() {
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);
  const { token } = useParams();
  const navigate  = useNavigate();

  const [pwdFocused, setPwdFocused] = useState(false);
  const [confFocused, setConfFocused] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    try {
      await resetPassword(token, { password });
      setSuccess(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la réinitialisation.');
    }
  };

  return (
    <div
      className="reset-password-page"
      style={{
        minHeight:      '100vh',
        background:     'var(--wings-bg)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '48px 16px',
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      {/* Éléments décoratifs (même grille que Register) */}
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
      <div className="register-halo-blue" />

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
          <CicadaProtective size={180} />
        </div>

        {/* Header */}
        <h1
          style={{
            fontFamily:  'Georgia, "Times New Roman", serif',
            fontSize:    32,
            fontWeight:  400,
            color:       'var(--wings-text)',
            textAlign:   'center',
            margin:      '24px 0 0',
            lineHeight:  1.15,
          }}
        >
          {success ? 'Mot de passe modifié.' : 'Nouveau mot de passe.'}
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
          {success ? 'Ton accès est désormais sécurisé.' : 'Sécurise ton accès. La cigale veille.'}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background:   'var(--wings-surface)',
            border:       '1px solid var(--wings-border)',
            borderRadius: 20,
            padding:      '32px 28px',
          }}
        >
          {!success ? (
            <>
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

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="8 caractères minimum"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setPwdFocused(true)}
                      onBlur={() => setPwdFocused(false)}
                      required
                      style={{
                        ...inputBase,
                        ...(pwdFocused ? { borderColor: 'var(--wings-blue)', boxShadow: '0 0 0 3px rgba(79,139,255,0.15)' } : {}),
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Confirmer le mot de passe</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Répète ton mot de passe"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onFocus={() => setConfFocused(true)}
                      onBlur={() => setConfFocused(false)}
                      required
                      style={{
                        ...inputBase,
                        ...(confFocused ? { borderColor: 'var(--wings-blue)', boxShadow: '0 0 0 3px rgba(79,139,255,0.15)' } : {}),
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
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
                    cursor:        'pointer',
                    transition:    'background 0.2s ease, box-shadow 0.2s ease',
                    marginTop:     8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--wings-blue-dark)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--wings-blue)'}
                >
                  Décoller →
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: '#34d399' }} />
              </div>

              <p style={{ color: 'var(--wings-text-muted)', fontSize: 14, marginBottom: 32 }}>
                Ton mot de passe a été réinitialisé avec succès.
              </p>

              <button
                onClick={() => navigate('/login')}
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
                  cursor:        'pointer',
                  transition:    'background 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--wings-blue-dark)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--wings-blue)'}
              >
                Se connecter
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
