import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password });
      localStorage.setItem('user_id', res.data.user_id);
      navigate('/otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects');
    }
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* GAUCHE */}
      <div style={s.left}>
        <div style={s.brand}>
          <span style={s.logo}><svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.59' y1='13.51' x2='15.42' y2='17.49' stroke='currentColor' strokeWidth='2'/><line x1='15.41' y1='6.51' x2='8.59' y2='10.49' stroke='currentColor' strokeWidth='2'/></svg> Transferly</span>
        </div>
        <div style={s.pitch}>
          <h1 style={s.pitchTitle}>Votre espace académique sécurisé.</h1>
          <p style={s.pitchSub}>Déposez, partagez, collaborez. Simple et sécurisé.</p>
        </div>
        <div style={s.fileList}>
          {[
            { name: 'TP_Reseaux_2026.pdf', status: 'Envoyé', color: '#0d9488' },
            { name: 'Cours_Python.zip', status: 'En cours', color: '#f59e0b' },
            { name: 'Projet_ICCN.zip', status: 'Reçu', color: '#6366f1' },
          ].map((f, i) => (
            <div key={i} style={s.fileItem}>
              <span style={s.fileIcon}>📄</span>
              <div style={s.fileMeta}>
                <span style={s.fileName}>{f.name}</span>
                <span style={s.fileTime}>Partagé {i === 0 ? 'il y a 2 heures' : i === 1 ? "aujourd'hui" : 'hier'}</span>
              </div>
              <span style={{...s.fileBadge, background: f.color}}>{f.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DROITE */}
      <div style={s.right}>
        <div style={s.card}>
          <h2 style={s.welcome}>Prêt à tout partager ? 📂</h2>
          <p style={s.sub}>Vos cours et projets vous attendent.</p>
          {error && <div style={s.error}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <label style={s.label}>Adresse email</label>
            <div style={s.inputWrap}>
              <span style={s.inputIcon}>✉️</span>
              <input style={s.input} type="email" placeholder="exemple@transferly.ma"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <label style={s.label}>Mot de passe</label>
              <a href="/forgot-password" style={s.forgotLink}>Mot de passe oublié ?</a>
            </div>
            <div style={s.inputWrap}>
              <span style={s.inputIcon}>🔒</span>
              <input style={s.input} type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
              <span style={s.eyeIcon} onClick={() => setShowPwd(!showPwd)}>{showPwd ? '🙈' : '👁️'}</span>
            </div>
            <div style={s.rememberRow}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span style={{fontSize:'13px', color:'#555'}}>Se souvenir de moi</span>
            </div>
            <button style={s.btn} type="submit">Se connecter →</button>
          </form>
          <p style={s.registerLink}>
            Pas encore de compte ? <a href="/register" style={{color:'#0d9488', fontWeight:'600'}}>S'inscrire gratuitement</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display:'flex', minHeight:'100vh', fontFamily:'system-ui, sans-serif' },
  left: { flex:1, background:'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)', padding:'48px', display:'flex', flexDirection:'column', gap:'32px' },
  brand: { display:'flex', alignItems:'center' },
  logo: { color:'white', fontSize:'20px', fontWeight:'700' },
  pitch: { flex:1, display:'flex', flexDirection:'column', justifyContent:'center' },
  pitchTitle: { color:'white', fontSize:'32px', fontWeight:'800', lineHeight:'1.2', marginBottom:'16px' },
  pitchSub: { color:'#94a3b8', fontSize:'15px', lineHeight:'1.6' },
  fileList: { display:'flex', flexDirection:'column', gap:'10px' },
  fileItem: { background:'rgba(255,255,255,0.06)', borderRadius:'10px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', border:'1px solid rgba(255,255,255,0.08)' },
  fileIcon: { fontSize:'20px' },
  fileMeta: { flex:1, display:'flex', flexDirection:'column' },
  fileName: { color:'white', fontSize:'13px', fontWeight:'500' },
  fileTime: { color:'#64748b', fontSize:'11px' },
  fileBadge: { color:'white', fontSize:'11px', padding:'3px 10px', borderRadius:'20px', fontWeight:'600' },
  right: { flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', padding:'32px' },
  card: { background:'white', borderRadius:'16px', padding:'40px', width:'100%', maxWidth:'400px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)', animation:'fadeInUp 0.4s ease forwards' },
  welcome: { fontSize:'24px', fontWeight:'800', color:'#0f172a', marginBottom:'4px' },
  sub: { color:'#64748b', fontSize:'14px', marginBottom:'24px' },
  error: { background:'#fef2f2', color:'#dc2626', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'16px' },
  label: { display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' },
  inputWrap: { position:'relative', marginBottom:'16px', display:'flex', alignItems:'center' },
  inputIcon: { position:'absolute', left:'12px', fontSize:'14px' },
  eyeIcon: { position:'absolute', right:'12px', cursor:'pointer', fontSize:'14px' },
  input: { width:'100%', padding:'11px 12px 11px 36px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box' },
  rememberRow: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px' },
  btn: { width:'100%', padding:'13px', background:'#0d9488', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor:'pointer' },
  forgotLink: { fontSize:'12px', color:'#0d9488', textDecoration:'none' },
  registerLink: { textAlign:'center', fontSize:'13px', color:'#64748b', marginTop:'16px' },
};