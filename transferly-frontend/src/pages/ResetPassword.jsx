import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

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
    <div style={s.page}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={s.card}>
        <div style={s.brand}>
          <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
            <circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/>
            <line x1='8.59' y1='13.51' x2='15.42' y2='17.49' stroke='currentColor' strokeWidth='2'/>
            <line x1='15.41' y1='6.51' x2='8.59' y2='10.49' stroke='currentColor' strokeWidth='2'/>
          </svg> Transferly
        </div>
        {!success ? (
          <>
            <h2 style={s.title}>Nouveau mot de passe</h2>
            {error && <div style={s.error}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <label style={s.label}>Nouveau mot de passe</label>
              <input style={s.input} type="password" placeholder="Min. 8 caractères"
                value={password} onChange={e => setPassword(e.target.value)} required />
              
              <label style={s.label}>Confirmer le mot de passe</label>
              <input style={s.input} type="password" placeholder="Répéter le mot de passe"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              
              <button style={s.btn} type="submit">Réinitialiser</button>
            </form>
          </>
        ) : (
          <>
            <div style={s.successIcon}>✅</div>
            <h2 style={s.title}>Mot de passe modifié !</h2>
            <p style={s.sub}>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <button style={s.btn} onClick={() => navigate('/login')}>Aller à la connexion</button>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'system-ui, sans-serif' },
  card: { background:'white', borderRadius:'16px', padding:'40px', width:'100%', maxWidth:'380px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)', textAlign:'center', animation:'fadeInUp 0.4s ease forwards' },
  brand: { color:'#0d9488', fontWeight:'700', fontSize:'18px', marginBottom:'24px' },
  title: { fontSize:'20px', fontWeight:'800', color:'#0f172a', marginBottom:'20px' },
  sub: { color:'#64748b', fontSize:'14px', marginBottom:'20px' },
  label: { display:'block', textAlign:'left', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' },
  input: { width:'100%', padding:'11px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', marginBottom:'16px', boxSizing:'border-box', outline:'none' },
  btn: { width:'100%', padding:'13px', background:'#0d9488', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor:'pointer', marginTop:'8px' },
  error: { background:'#fef2f2', color:'#ef4444', padding:'10px', borderRadius:'8px', fontSize:'13px', marginBottom:'16px', fontWeight:'500', textAlign:'left' },
  successIcon: { fontSize:'48px', marginBottom:'16px' },
};
