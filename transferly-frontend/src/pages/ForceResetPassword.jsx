import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle } from 'lucide-react';
import { changePassword } from '../api/auth';
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

function Field({ label, type = 'text', value, onChange, show, onToggleShow, focused, onFocus, onBlur, ...props }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={type === 'password' && !show ? 'password' : 'text'}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{
            ...inputBase,
            ...(focused ? focusedExtra : {}),
            paddingRight: type === 'password' ? 64 : 16,
          }}
          {...props}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={onToggleShow}
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
            {show ? 'CACHER' : 'VOIR'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ForceResetPassword() {
  const navigate = useNavigate();

  const tempPassword = localStorage.getItem('password_pending') || '';

  const [currentPwd,  setCurrentPwd]  = useState(tempPassword);
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [foc1, setFoc1] = useState(false);
  const [foc2, setFoc2] = useState(false);
  const [foc3, setFoc3] = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPwd !== confirmPwd) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPwd.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPwd === currentPwd) {
      setError('Le nouveau mot de passe doit être différent du mot de passe temporaire.');
      return;
    }

    setLoading(true);
    try {
      await changePassword({ current_password: currentPwd, new_password: newPwd });
      localStorage.removeItem('must_reset_password');
      localStorage.removeItem('password_pending');
      localStorage.removeItem('email_pending');
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => navigate('/dashboard', { replace: true });

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

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
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
          Sécurisez votre envol.
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
          La cigale protège tes accès.
        </p>

        {/* Bannière d'avertissement */}
        {!success && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl mb-6 text-sm"
            style={{
              background: 'rgba(255,185,0,0.08)',
              border: '1px solid rgba(255,185,0,0.25)',
              color: 'var(--wings-gold)',
            }}
          >
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              <strong>Sécurité requise.</strong> Change ton mot de passe avant d'accéder à ton espace.
            </span>
          </div>
        )}

        {/* Card principale */}
        <div
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

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Field
                  label="Clé temporaire reçue"
                  type="password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  show={showCurrent}
                  onToggleShow={() => setShowCurrent(v => !v)}
                  focused={foc1}
                  onFocus={() => setFoc1(true)}
                  onBlur={() => setFoc1(false)}
                  required
                />

                <Field
                  label="Nouveau mot de passe personnel"
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  show={showNew}
                  onToggleShow={() => setShowNew(v => !v)}
                  focused={foc2}
                  onFocus={() => setFoc2(true)}
                  onBlur={() => setFoc2(false)}
                  required
                />

                <Field
                  label="Confirmation"
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  show={showConfirm}
                  onToggleShow={() => setShowConfirm(v => !v)}
                  focused={foc3}
                  onFocus={() => setFoc3(true)}
                  onBlur={() => setFoc3(false)}
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width:       '100%',
                    padding:     '14px 24px',
                    borderRadius: 9999,
                    border:      'none',
                    background:  'var(--wings-blue)',
                    color:       '#fff',
                    fontSize:    14,
                    fontWeight:  600,
                    fontFamily:  'inherit',
                    cursor:      loading ? 'not-allowed' : 'pointer',
                    opacity:     loading ? 0.6 : 1,
                    transition:  'background 0.2s ease, box-shadow 0.2s ease',
                    marginTop:   4,
                    boxShadow:   '0 4px 12px rgba(79,139,255,0.2)',
                  }}
                  onMouseEnter={e => {
                    if (!loading) e.currentTarget.style.background = 'var(--wings-blue-dark)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--wings-blue)';
                  }}
                >
                  {loading ? 'Finalisation…' : 'Valider mon mot de passe →'}
                </button>
              </form>
            </>
          ) : (
            /* ── Succès ── */
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: '#34d399' }} />
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>Accès prêt !</h2>
              <p className="text-slate-400 text-sm mb-7">
                Votre mot de passe a été mis à jour. Le ciel est dégagé, vous pouvez maintenant accéder à
                la plateforme.
              </p>

              <button
                onClick={goToDashboard}
                style={{
                  width:       '100%',
                  padding:     '14px 24px',
                  borderRadius: 9999,
                  border:      'none',
                  background:  'var(--wings-blue)',
                  color:       '#fff',
                  fontSize:    14,
                  fontWeight:  500,
                  fontFamily:  'inherit',
                  cursor:      'pointer',
                  transition:  'background 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--wings-blue-dark)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--wings-blue)'; }}
              >
                Accéder au tableau de bord →
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
