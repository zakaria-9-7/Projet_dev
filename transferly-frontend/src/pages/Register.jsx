import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Mail, Lock, Eye, EyeOff, Share2, ChevronDown } from 'lucide-react';
import { register } from '../api/auth';

export default function Register() {
  const [form, setForm] = useState({
    nom: '', email: '', password: '', confirm: '', role: 'Utilisateur',
  });
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const navigate = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await register({ nom: form.nom, email: form.email, password: form.password, role: form.role });
      setSuccess('Compte créé avec succès ! Redirection...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription");
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background circles */}
      <div className="geo-circle-1 top-16 left-[-60px] !bg-cyan-200/20 pointer-events-none" />
      <div className="geo-circle-2 bottom-16 right-[-40px] !bg-cyan-300/15 pointer-events-none" />
      <div className="geo-circle-3 top-1/2 right-1/4 !bg-cyan-400/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-md p-10"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <Share2 className="w-5 h-5 text-cyan-500" />
          <span className="font-bold text-slate-900 text-base">Transferly</span>
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Créer un compte</h2>
        <p className="text-slate-500 text-sm mb-6">Rejoignez votre espace académique</p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-100 text-green-600 text-sm px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nom */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Jean Dupont"
                value={form.nom}
                onChange={e => update('nom', e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adresse email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder="nom@exemple.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmer mot de passe */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => update('confirm', e.target.value)}
                required
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rôle</label>
            <div className="relative">
              <select
                value={form.role}
                onChange={e => update('role', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition appearance-none"
              >
                <option value="Utilisateur">Utilisateur</option>
                <option value="AdminEspace">Administrateur Espace</option>
                <option value="AdminGlobal">Administrateur Global</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg text-sm transition-colors mt-1"
          >
            Créer mon compte
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-cyan-600 font-semibold hover:text-cyan-700 transition-colors">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
