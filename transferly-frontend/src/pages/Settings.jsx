import { useState, useEffect } from 'react';
import { User, Lock, Bell, Shield, ChevronRight, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, type = 'text', placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 ${checked ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [originalNom, setOriginalNom] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState({
    notif_partages: true,
    notif_versions: true,
    notif_connexions_suspectes: true,
    notif_resume_hebdo: false,
    confidentialite_profil_visible: true,
    confidentialite_historique_connexion: true,
  });
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    API.get('/me').then(r => {
      setNom(r.data.nom);
      setEmail(r.data.email);
      setOriginalNom(r.data.nom);
      setOriginalEmail(r.data.email);
      if (r.data.preferences) {
        setPrefs(p => ({ ...p, ...r.data.preferences }));
      }
    });
    API.get('/quota/me')
      .then(res => setQuota(res.data))
      .catch(err => console.error('quota err', err));
  }, []);

  const handleToggle = async (key) => {
    const newValue = !prefs[key];
    setPrefs(p => ({ ...p, [key]: newValue }));
    try {
      await API.put('/me/preferences', { [key]: newValue });
    } catch {
      // Revert on failure
      setPrefs(p => ({ ...p, [key]: !newValue }));
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('⚠️ ATTENTION : Cette action est irréversible. Tous vos fichiers, partages et données seront définitivement supprimés. Confirmer ?')) return;
    if (!window.confirm('Dernière confirmation : tapez OK pour supprimer définitivement votre compte.')) return;
    try {
      await API.delete('/me');
      localStorage.clear();
      alert('Votre compte a été supprimé.');
      window.location.href = '/login';
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      if (nom !== originalNom || email !== originalEmail) {
        await API.put('/me', { nom, email });
        localStorage.setItem('nom', nom);
        localStorage.setItem('email', email);
        setOriginalNom(nom);
        setOriginalEmail(email);
      }

      if (newPwd) {
        if (newPwd !== confirmPwd) {
          setError('Mots de passe ne correspondent pas');
          setLoading(false);
          return;
        }
        await API.put('/me/password', { current_password: currentPwd, new_password: newPwd });
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Paramètres</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gérez votre compte et vos préférences</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Profile */}
        <Section icon={User} title="Profil">
          <Field label="Nom complet" value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" />
          <Field label="Adresse e-mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.fr" />
        </Section>

        {/* Stockage */}
        {quota && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Stockage</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Espace utilisé sur votre quota personnel.
            </p>

            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {(quota.quota_utilise_mb ?? 0).toFixed(2)}<span className="text-base font-medium text-slate-400"> Mo</span>
              </span>
              <span className="text-sm text-slate-500">sur {(quota.quota_total_mb ?? 0).toFixed(0)} Mo</span>
            </div>

            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (quota.pourcentage_utilise ?? 0) >= 90
                    ? 'bg-red-500'
                    : (quota.pourcentage_utilise ?? 0) >= 70
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, quota.pourcentage_utilise ?? 0)}%` }}
              />
            </div>

            <p className="text-xs text-slate-400 mt-2">
              {(quota.pourcentage_utilise ?? 0)}% de votre espace utilisé
            </p>
          </div>
        )}

        {/* Security */}
        <Section icon={Lock} title="Sécurité">
          <Field label="Mot de passe actuel" type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" />
          <Field label="Nouveau mot de passe" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" />
          <Field label="Confirmer le mot de passe" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" />
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Notifications">
          <Toggle label="Partages reçus" description="Être notifié quand quelqu'un partage un fichier avec vous" checked={prefs.notif_partages} onChange={() => handleToggle('notif_partages')} />
          <Toggle label="Nouvelles versions" description="Être notifié lors de la mise à jour d'un fichier partagé" checked={prefs.notif_versions} onChange={() => handleToggle('notif_versions')} />
          <Toggle label="Connexions suspectes" description="Alerte en cas de connexion depuis un nouvel appareil" checked={prefs.notif_connexions_suspectes} onChange={() => handleToggle('notif_connexions_suspectes')} />
          <Toggle label="Résumé hebdomadaire" description="Recevoir un rapport d'activité chaque semaine" checked={prefs.notif_resume_hebdo} onChange={() => handleToggle('notif_resume_hebdo')} />
        </Section>

        {/* Privacy */}
        <Section icon={Shield} title="Confidentialité">
          <Toggle label="Profil visible" description="Permettre aux autres utilisateurs de vous trouver par e-mail" checked={prefs.confidentialite_profil_visible} onChange={() => handleToggle('confidentialite_profil_visible')} />
          <Toggle label="Historique de connexion" description="Conserver l'historique de vos connexions (90 jours)" checked={prefs.confidentialite_historique_connexion} onChange={() => handleToggle('confidentialite_historique_connexion')} />
        </Section>

        {/* Danger zone */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 dark:border-red-900/30">
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Zone de danger</h2>
          </div>
          <div className="px-6 py-5">
            <button
              onClick={handleDeleteAccount}
              className="flex items-center justify-between w-full text-left hover:opacity-80 transition"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Supprimer mon compte</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cette action est irréversible. Toutes vos données seront effacées.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60 ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-cyan-500 hover:bg-cyan-600 text-white'
            }`}
          >
            {saved && <Check className="w-4 h-4" />}
            {saved ? 'Sauvegardé' : loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
