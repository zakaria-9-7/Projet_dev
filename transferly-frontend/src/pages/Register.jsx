import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../api/auth';

export default function Register() {
  const [form, setForm] = useState({ nom:'', email:'', password:'', confirm:'', role:'Utilisateur' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await register({ nom: form.nom, email: form.email, password: form.password, role: form.role });
      setSuccess('Compte créé ! Redirection...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur inscription');
    }
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={s.card}>
        <div style={s.brand}><svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.59' y1='13.51' x2='15.42' y2='17.49' stroke='currentColor' strokeWidth='2'/><line x1='15.41' y1='6.51' x2='8.59' y2='10.49' stroke='currentColor' strokeWidth='2'/></svg> Transferly</div>
        <h2 style={s.title}>Création de compte</h2>
        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Nom complet</label>
          <input style={s.input} placeholder="Jean Dupont"
            value={form.nom} onChange={e => setForm({...form, nom:e.target.value})} required />

          <label style={s.label}>Adresse email</label>
          <input style={s.input} type="email" placeholder="nom@exemple.com"
            value={form.email} onChange={e => setForm({...form, email:e.target.value})} required />

          <label style={s.label}>Mot de passe</label>
          <input style={s.input} type="password" placeholder="••••••••"
            value={form.password} onChange={e => setForm({...form, password:e.target.value})} required />

          <label style={s.label}>Confirmer le mot de passe</label>
          <input style={s.input} type="password" placeholder="••••••••"
            value={form.confirm} onChange={e => setForm({...form, confirm:e.target.value})} required />

          <label style={s.label}>Rôle</label>
          <select style={s.input} value={form.role}
            onChange={e => setForm({...form, role:e.target.value})}>
            <option value="Utilisateur">Utilisateur</option>
            <option value="AdminEspace">Administrateur Espace</option>
            <option value="AdminGlobal">Administrateur Global</option>
          </select>

          <button style={s.btn} type="submit">Créer mon compte</button>
        </form>
        <p style={s.loginLink}>
          Déjà un compte ? <a href="/login" style={{color:'#0d9488', fontWeight:'600'}}>Se connecter</a>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'system-ui, sans-serif' },
  card: { background:'white', borderRadius:'16px', padding:'40px', width:'100%', maxWidth:'400px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)', animation:'fadeInUp 0.4s ease forwards' },
  brand: { textAlign:'center', color:'#0d9488', fontWeight:'700', fontSize:'18px', marginBottom:'20px' },
  title: { fontSize:'22px', fontWeight:'800', color:'#0f172a', marginBottom:'24px' },
  label: { display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' },
  input: { width:'100%', padding:'11px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', marginBottom:'16px', boxSizing:'border-box', outline:'none' },
  btn: { width:'100%', padding:'13px', background:'#0d9488', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor:'pointer', marginTop:'4px' },
  error: { background:'#fef2f2', color:'#dc2626', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'16px' },
  success: { background:'#f0fdf4', color:'#16a34a', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'16px' },
  loginLink: { textAlign:'center', fontSize:'13px', color:'#64748b', marginTop:'16px' },
};