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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader className="w-12 h-12 mx-auto text-cyan-500 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-slate-900">Acceptation de l'invitation...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Bienvenue !</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <button
              onClick={() => navigate(`/espace/${espaceId}`)}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg"
            >
              Accéder à l'espace
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Impossible de rejoindre l'espace</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => navigate('/admin-espace')}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg"
              >
                Voir mes espaces
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg"
              >
                Retour au dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
