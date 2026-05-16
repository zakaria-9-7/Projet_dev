import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FolderOpen, Users, Mail, Settings, Trash2, Edit2, ArrowLeft,
  UploadCloud, Download, FileText, Link2, Copy, UserMinus, LogOut as ExitIcon, Shield, History,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';

export default function EspaceDetail() {
  const { espaceId } = useParams();
  const navigate = useNavigate();
  const [espace, setEspace] = useState(null);
  const [tab, setTab] = useState('fichiers');
  const [fichiers, setFichiers] = useState([]);
  const [membres, setMembres] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [inviteModal, setInviteModal] = useState(null);
  const [details, setDetails] = useState(null);
  const [uploadPolicy, setUploadPolicy] = useState('tous');
  const [uploadAutorises, setUploadAutorises] = useState([]);
  const [aclModal, setAclModal] = useState(null);

  const currentUserId = parseInt(localStorage.getItem('user_id') || '0');
  const isAdmin = espace && espace.admin_id === currentUserId;

  const canUpload = (() => {
    if (!details) return true;
    if (details.is_admin) return true;
    const policy = details.upload_policy || 'tous';
    if (policy === 'tous') return true;
    if (policy === 'admin_seul') return false;
    if (policy === 'membres_choisis') {
      return (details.upload_autorises || []).includes(currentUserId);
    }
    return true;
  })();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadEspace = async () => {
    setLoading(true);
    try {
      const all = await API.get('/espaces/all-mine');
      const found = all.data.find(e => e.id === parseInt(espaceId));
      if (!found) {
        showToast('Espace introuvable ou accès refusé', 'error');
        setTimeout(() => navigate('/admin-espace'), 1500);
        return;
      }
      setEspace(found);
      setEditName(found.nom);
      const [f, m] = await Promise.all([
        API.get(`/files/espace/${espaceId}`).catch(() => ({ data: [] })),
        API.get(`/espaces/${espaceId}/membres`).catch(() => ({ data: [] })),
      ]);
      setFichiers(f.data);
      setMembres(m.data);
      if (found.role === 'admin') {
        const inv = await API.get(`/espaces/${espaceId}/invitations`).catch(() => ({ data: [] }));
        setInvitations(inv.data);
      }
      const det = await API.get(`/espaces/${espaceId}/details`).catch(() => ({ data: null }));
      setDetails(det.data);
      if (det.data) {
        setUploadPolicy(det.data.upload_policy || 'tous');
        setUploadAutorises(det.data.upload_autorises || []);
      }
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEspace(); }, [espaceId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('espace_id', espaceId);
    try {
      await API.post('/files/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Fichier uploadé');
      loadEspace();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur upload', 'error');
    }
    e.target.value = '';
  };

  const handleDownload = async (f) => {
    try {
      const res = await API.get(`/files/${f.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = f.nom; a.click(); URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Téléchargement refusé', 'error');
    }
  };

  const handleDeleteFile = async (fichierId, nom) => {
    if (!confirm(`Supprimer "${nom}" de cet espace ? Cette action est irréversible.`)) return;
    try {
      await API.delete(`/files/${fichierId}`);
      showToast('Fichier supprimé');
      loadEspace();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const res = await API.post(`/espaces/${espaceId}/invitations`, { email: inviteEmail.trim() });
      setInviteEmail('');
      setInviteModal({ url: res.data.invite_url, email: res.data.email });
      loadEspace();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur invitation', 'error');
    }
  };

  const handleGenerateLink = async () => {
    try {
      const res = await API.post(`/espaces/${espaceId}/invitations`, {});
      setInviteModal({ url: res.data.invite_url, email: null });
      loadEspace();
    } catch (err) {
      showToast('Erreur génération lien', 'error');
    }
  };

  const handleCopyInvite = (token) => {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(url);
    showToast('Lien copié');
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Retirer ce membre de l espace ?')) return;
    try {
      await API.delete(`/espaces/${espaceId}/membres/${userId}`);
      showToast('Membre retiré');
      loadEspace();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleRename = async () => {
    if (!editName.trim() || editName.trim() === espace.nom) {
      setEditMode(false);
      return;
    }
    try {
      await API.put(`/espaces/${espaceId}`, { nom: editName.trim() });
      showToast('Espace renommé');
      setEditMode(false);
      loadEspace();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleDeleteEspace = async () => {
    if (!confirm(`Supprimer définitivement l'espace "${espace.nom}" et tous ses fichiers ? Cette action est irréversible.`)) return;
    if (!confirm('Dernière confirmation : tous les fichiers, membres et invitations seront supprimés.')) return;
    try {
      const res = await API.delete(`/espaces/${espaceId}`);
      if (res.data.role_updated) {
        try {
          const refreshRes = await API.post('/auth/refresh');
          localStorage.setItem('token', refreshRes.data.token);
          localStorage.setItem('role', refreshRes.data.role);
        } catch (e) {}
      }
      showToast('Espace supprimé');
      setTimeout(() => { window.location.href = '/admin-espace'; }, 1000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleLeave = async () => {
    if (!confirm('Quitter cet espace ? Vous ne verrez plus ses fichiers.')) return;
    try {
      await API.post(`/espaces/${espaceId}/quitter`);
      showToast('Vous avez quitté l espace');
      setTimeout(() => navigate('/admin-espace'), 1000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleSavePolicy = async () => {
    try {
      await API.put(`/espaces/${espaceId}/upload-policy`, {
        upload_policy: uploadPolicy,
        upload_autorises: uploadAutorises,
      });
      showToast('Politique mise à jour');
      loadEspace();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const openAclModal = async (fichier) => {
    try {
      const res = await API.get(`/acl/fichier/${fichier.id}/espace`);
      setAclModal({
        fichier,
        permissions: res.data.permissions,
        can_manage: res.data.can_manage,
      });
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleToggleAcl = async (userId, permKey, currentValue) => {
    try {
      await API.put(`/acl/fichier/${aclModal.fichier.id}/membre/${userId}`, {
        [permKey]: !currentValue,
      });
      const res = await API.get(`/acl/fichier/${aclModal.fichier.id}/espace`);
      setAclModal(prev => ({ ...prev, permissions: res.data.permissions }));
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  if (loading) {
    return <AppLayout><div className="text-center py-12 text-slate-400">Chargement...</div></AppLayout>;
  }

  if (!espace) {
    return <AppLayout><div className="text-center py-12 text-slate-400">Espace introuvable</div></AppLayout>;
  }

  return (
    <AppLayout>
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-2 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>{toast.msg}</div>
      )}

      {/* Header espace */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin-espace')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à mes espaces
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              {editMode ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRename()}
                    autoFocus
                    className="text-2xl font-extrabold bg-transparent border-b-2 border-cyan-500 outline-none text-slate-900 dark:text-slate-100"
                  />
                  <button onClick={handleRename} className="text-cyan-600 text-sm font-semibold">OK</button>
                  <button onClick={() => { setEditMode(false); setEditName(espace.nom); }} className="text-slate-400 text-sm">Annuler</button>
                </div>
              ) : (
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {espace.nom}
                  {isAdmin && (
                    <button onClick={() => setEditMode(true)} className="text-slate-400 hover:text-cyan-500" title="Renommer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </h1>
              )}
              <p className="text-sm text-slate-500 mt-0.5">
                {isAdmin ? 'Vous êtes admin de cet espace' : 'Vous êtes membre'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin ? (
              <button
                onClick={handleDeleteEspace}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" /> Supprimer l'espace
              </button>
            ) : (
              <button
                onClick={handleLeave}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition"
              >
                <ExitIcon className="w-4 h-4" /> Quitter l'espace
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
        {[
          { id: 'fichiers',    label: 'Fichiers',    icon: FileText, count: fichiers.length },
          { id: 'membres',     label: 'Membres',     icon: Users,    count: membres.length },
          ...(isAdmin ? [{ id: 'invitations', label: 'Invitations', icon: Mail, count: invitations.filter(i => !i.utilise).length }] : []),
          ...(isAdmin ? [{ id: 'parametres',  label: 'Paramètres',  icon: Settings }] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.id
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count != null && (
              <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Onglet Fichiers */}
      {tab === 'fichiers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {fichiers.length} fichier{fichiers.length > 1 ? 's' : ''}
            </h2>
            {canUpload ? (
              <label className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg cursor-pointer text-sm font-medium transition">
                <UploadCloud className="w-4 h-4" /> Téléverser dans l'espace
                <input type="file" onChange={handleUpload} className="hidden" />
              </label>
            ) : (
              <div
                title="Vous n'avez pas l'autorisation de téléverser dans cet espace"
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-lg cursor-not-allowed text-sm font-medium"
              >
                <UploadCloud className="w-4 h-4" /> Téléversement non autorisé
              </div>
            )}
          </div>
          {!canUpload && (
            <div className="mb-4 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <span>ⓘ</span>
              L'administrateur de cet espace a restreint le téléversement. Vous pouvez consulter et télécharger les fichiers selon vos droits.
            </div>
          )}
          {fichiers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun fichier dans cet espace</p>
              <p className="text-xs text-slate-400 mt-1">Uploadez votre premier fichier pour démarrer la collaboration</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    {['Nom', 'Propriétaire', 'Taille', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {fichiers.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" /> {f.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{f.owner_nom || f.owner_email}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{f.taille?.toFixed(1)} MB</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatRelativeTime(f.date_creation)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownload(f)}
                            className="p-1.5 text-slate-400 hover:text-cyan-500 rounded"
                            title="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/versions?fileId=${f.id}`)}
                            className="p-1.5 text-slate-400 hover:text-amber-500 rounded"
                            title="Historique des versions"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openAclModal(f)}
                            className="p-1.5 text-slate-400 hover:text-violet-500 rounded"
                            title="Gérer les accès"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          {(isAdmin || f.owner_id === currentUserId) && (
                            <button
                              onClick={() => handleDeleteFile(f.id, f.nom)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Onglet Membres */}
      {tab === 'membres' && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
            {membres.length} membre{membres.length > 1 ? 's' : ''}
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {membres.map(m => (
                <div key={m.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold">
                      {(m.nom || m.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {m.nom || '—'}
                        {m.role === 'admin' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">ADMIN</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{m.email}</p>
                    </div>
                  </div>
                  {isAdmin && m.role !== 'admin' && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded"
                      title="Retirer du groupe"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onglet Invitations */}
      {tab === 'invitations' && isAdmin && (
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Inviter par email
            </h3>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
              <button onClick={handleInvite} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg">
                Inviter
              </button>
            </div>
            <button
              onClick={handleGenerateLink}
              className="mt-3 flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700"
            >
              <Link2 className="w-4 h-4" /> Générer un lien d'invitation public
            </button>
          </div>

          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Invitations actives ({invitations.filter(i => !i.utilise).length})
          </h3>
          {invitations.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucune invitation</p>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
              {invitations.map(i => (
                <div key={i.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {i.email || 'Lien public'}
                      {i.utilise && <span className="ml-2 text-xs text-emerald-600">✓ Utilisée</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      Expire le {new Date(i.date_expiration).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {!i.utilise && (
                    <button
                      onClick={() => handleCopyInvite(i.token)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg"
                    >
                      <Copy className="w-3 h-3" /> Copier le lien
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet Paramètres */}
      {tab === 'parametres' && isAdmin && (
        <div className="max-w-2xl">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Politique de téléversement
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Définissez qui peut ajouter des fichiers dans cet espace.
            </p>

            <div className="space-y-3">
              {[
                { value: 'tous', label: 'Tous les membres', desc: 'N\'importe quel membre de l\'espace peut téléverser des fichiers.' },
                { value: 'membres_choisis', label: 'Membres sélectionnés', desc: 'Seuls les membres que vous choisissez peuvent téléverser.' },
                { value: 'admin_seul', label: 'Administrateur uniquement', desc: 'Seul vous pouvez téléverser des fichiers.' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition ${
                    uploadPolicy === opt.value
                      ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="upload-policy"
                    checked={uploadPolicy === opt.value}
                    onChange={() => setUploadPolicy(opt.value)}
                    className="mt-1 accent-cyan-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{opt.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {uploadPolicy === 'membres_choisis' && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Membres autorisés à téléverser :
                </p>
                <div className="space-y-2">
                  {membres.filter(m => m.role !== 'admin').map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={uploadAutorises.includes(m.id)}
                        onChange={() => {
                          setUploadAutorises(prev =>
                            prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                          );
                        }}
                        className="accent-cyan-500"
                      />
                      {m.nom} ({m.email})
                    </label>
                  ))}
                  {membres.filter(m => m.role !== 'admin').length === 0 && (
                    <p className="text-xs text-slate-400">Aucun autre membre dans l'espace.</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleSavePolicy}
              className="mt-5 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-lg"
            >
              Enregistrer la politique
            </button>
          </div>
        </div>
      )}

      {/* Modale invitation */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setInviteModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              {inviteModal.email ? `Invitation envoyée à ${inviteModal.email}` : "Lien d'invitation public créé"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Partagez ce lien avec la personne que vous souhaitez inviter. Il expire dans 7 jours.
            </p>
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-3 mb-4 flex items-center gap-2">
              <code className="flex-1 text-xs text-slate-700 dark:text-slate-300 break-all font-mono">
                {inviteModal.url}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteModal.url).catch(() => {});
                  showToast('Lien copié');
                }}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold rounded-md"
              >
                <Copy className="w-3 h-3" /> Copier
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setInviteModal(null)}
                className="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale ACL fichier */}
      {aclModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAclModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Gérer les accès — {aclModal.fichier.nom}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {aclModal.can_manage
                ? 'Définissez les droits de chaque membre sur ce fichier.'
                : 'Vous n\'avez pas les droits pour modifier ces accès.'}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Membre</th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Lecture</th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Téléch.</th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Écriture</th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Suppr.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {aclModal.permissions.map(p => {
                    const locked = p.is_owner || p.is_espace_admin;
                    return (
                      <tr key={p.user_id}>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                              {(p.nom || p.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {p.nom}
                                {p.is_owner && <span className="ml-1 text-[10px] text-cyan-600 font-bold">PROPRIÉTAIRE</span>}
                                {p.is_espace_admin && !p.is_owner && <span className="ml-1 text-[10px] text-amber-600 font-bold">ADMIN</span>}
                              </p>
                              <p className="text-xs text-slate-400">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        {['lecture', 'download', 'ecriture', 'suppression'].map(perm => (
                          <td key={perm} className="text-center py-2 px-2">
                            <input
                              type="checkbox"
                              checked={locked ? true : p[perm]}
                              disabled={locked || !aclModal.can_manage}
                              onChange={() => handleToggleAcl(p.user_id, perm, p[perm])}
                              className="accent-cyan-500 w-4 h-4 disabled:opacity-40"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={() => setAclModal(null)}
                className="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
