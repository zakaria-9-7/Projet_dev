import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyOTP } from '../api/auth';

export default function OTP() {
  const [digits, setDigits] = useState(['','','','','','']);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(90); // 1min30
  const navigate = useNavigate();
  const refs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(interval); navigate('/login'); }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const handleChange = (val, i) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[i] = val.slice(-1);
    setDigits(newDigits);
    if (val && i < 5) refs.current[i+1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i-1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) { setError('Entrez les 6 chiffres'); return; }
    const user_id = localStorage.getItem('user_id');
    try {
      const res = await verifyOTP({ user_id: parseInt(user_id), code });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Code incorrect');
      setDigits(['','','','','','']);
      refs.current[0]?.focus();
    }
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={s.card}>
        <div style={s.brand}><svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.59' y1='13.51' x2='15.42' y2='17.49' stroke='currentColor' strokeWidth='2'/><line x1='15.41' y1='6.51' x2='8.59' y2='10.49' stroke='currentColor' strokeWidth='2'/></svg> Transferly</div>
        <h2 style={s.title}>Vérification en deux étapes</h2>
        <p style={s.sub}>Entrez le code envoyé à votre email</p>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.digitsRow}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => refs.current[i] = el}
                style={{...s.digitBox, borderColor: d ? '#0d9488' : '#e2e8f0'}}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(e.target.value, i)}
                onKeyDown={e => handleKeyDown(e, i)}
              />
            ))}
          </div>

          <p style={s.timer}>
            Code expire dans : <span style={{color:'#0d9488', fontWeight:'700'}}>{formatTime(timer)}</span>
          </p>

          <button style={s.btn} type="submit">Valider</button>
        </form>

        <button style={s.resendBtn} onClick={() => navigate('/login')}>
          Renvoyer le code
        </button>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'system-ui, sans-serif' },
  card: { background:'white', borderRadius:'16px', padding:'40px', width:'100%', maxWidth:'380px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)', textAlign:'center', animation:'fadeInUp 0.4s ease forwards' },
  brand: { color:'#0d9488', fontWeight:'700', fontSize:'18px', marginBottom:'24px' },
  title: { fontSize:'20px', fontWeight:'800', color:'#0f172a', marginBottom:'8px' },
  sub: { color:'#64748b', fontSize:'14px', marginBottom:'24px' },
  error: { background:'#fef2f2', color:'#dc2626', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'16px' },
  digitsRow: { display:'flex', gap:'10px', justifyContent:'center', marginBottom:'20px' },
  digitBox: { width:'46px', height:'54px', textAlign:'center', fontSize:'22px', fontWeight:'700', border:'2px solid #e2e8f0', borderRadius:'10px', outline:'none', color:'#0f172a', transition:'border-color .2s' },
  timer: { color:'#64748b', fontSize:'13px', marginBottom:'20px' },
  btn: { width:'100%', padding:'13px', background:'#0d9488', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor:'pointer', marginBottom:'12px' },
  resendBtn: { background:'none', border:'none', color:'#0d9488', fontSize:'13px', cursor:'pointer', fontWeight:'500' },
};