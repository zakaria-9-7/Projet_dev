import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    // TODO: appel API reset password (ZT-04)
    setSent(true);
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={s.card}>
        <div style={s.brand}><svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.59' y1='13.51' x2='15.42' y2='17.49' stroke='currentColor' strokeWidth='2'/><line x1='15.41' y1='6.51' x2='8.59' y2='10.49' stroke='currentColor' strokeWidth='2'/></svg> Transferly</div>
        {!sent ? (
          <>
            <h2 style={s.title}>Réinitialiser le mot de passe</h2>
            <form onSubmit={handleSubmit}>
              <label style={s.label}>Adresse email</label>
              <input style={s.input} type="email" placeholder="nom@exemple.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
              <button style={s.btn} type="submit">Envoyer le lien</button>
            </form>
            <p style={s.link}>
              <a href="/login" style={{color:'#0d9488'}}>Retour à la connexion</a>
            </p>
          </>
        ) : (
          <>
            <div style={s.successIcon}>✉️</div>
            <h2 style={s.title}>Email envoyé !</h2>
            <p style={s.sub}>Vérifiez votre boîte mail pour réinitialiser votre mot de passe.</p>
            <button style={s.btn} onClick={() => navigate('/login')}>Retour à la connexion</button>
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
  btn: { width:'100%', padding:'13px', background:'#0d9488', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor:'pointer' },
  link: { marginTop:'16px', fontSize:'13px', color:'#64748b' },
  successIcon: { fontSize:'48px', marginBottom:'16px' },
};