import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import API from '../api/auth';

export default function JoinEspace() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [espaceId, setEspaceId] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const isAuth = !!localStorage.getItem('token');
    if (!isAuth) {
      localStorage.setItem('pending_invitation', token);
      navigate('/login?redirect=join&token=' + token);
      return;
    }

    API.post(`/invitations/${token}/accept`)
      .then(res => {
        setStatus('success');
        setMessage(res.data.message || 'Bienvenue !');
        setEspaceId(res.data.espace_id);
        API.post('/auth/refresh').then(r => {
          localStorage.setItem('token', r.data.token);
          localStorage.setItem('role', r.data.role);
        }).catch(() => {});
      })
      .catch(err => {
        const errorMsg = err.response?.data?.error || '';
        setStatus('error');

        if (errorMsg.includes('déjà utilisée') || errorMsg.includes('deja utilisee')) {
          setMessage('Ce lien a déjà été utilisé. Si vous avez déjà rejoint l\'espace, vous le trouverez dans "Mes espaces".');
        } else if (errorMsg.includes('expirée') || errorMsg.includes('expiree')) {
          setMessage('Ce lien d\'invitation a expiré. Demandez à l\'administrateur de l\'espace de vous en envoyer un nouveau.');
        } else if (errorMsg.includes('autre utilisateur')) {
          setMessage('Cette invitation est réservée à une autre adresse email.');
        } else if (errorMsg.includes('introuvable')) {
          setMessage('Lien d\'invitation invalide ou incomplet. Vérifiez que vous avez copié le lien en entier.');
        } else {
          setMessage(errorMsg || 'Une erreur est survenue.');
        }
      });
  }, [token, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--wings-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--wings-surface)',
        border: '0.5px solid var(--wings-border)',
        borderRadius: 16, padding: '40px 32px',
        maxWidth: 440, width: '100%',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <>
            <Loader size={40} color="var(--wings-blue)" style={{ margin: '0 auto 16px', display: 'block', animation: 'spin 1s linear infinite' }} />
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0 }}>
              Acceptation de l'invitation…
            </h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={40} color="#5dd39e" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 8 }}>
              Bienvenue !
            </h2>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              {message}
            </p>
            <button
              onClick={() => navigate(`/espace/${espaceId}`)}
              style={{
                padding: '10px 24px',
                background: 'var(--wings-blue)',
                border: 'none', borderRadius: 999,
                color: '#fff', fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Accéder à l'espace
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={40} color="#e57373" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 8 }}>
              Impossible de rejoindre l'espace
            </h2>
            <p style={{ color: 'var(--wings-text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/admin-espace')}
                style={{
                  padding: '10px 20px',
                  background: 'var(--wings-blue)',
                  border: 'none', borderRadius: 999,
                  color: '#fff', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Voir mes espaces
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 999, color: 'var(--wings-text-muted)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Retour au tableau de bord
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
