import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Mail, Settings, Trash2, Edit2, ArrowLeft,
  UploadCloud, Download, FileText, Link2, Copy, UserMinus,
  LogOut as ExitIcon, Shield, History, FilePen, Eye, Lock,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import FilePreviewModal from '../components/FilePreviewModal';
import API from '../api/auth';
import { formatRelativeTime } from '../utils/formatTime';
import { isEditable, getFileTypeColor } from '../utils/fileType';
import { colorFromName } from '../utils/colorFromName';

const actionBtnStyle = {
  background: 'var(--wings-surface)',
  border: '0.5px solid var(--wings-border)',
  borderRadius: 6,
  padding: '5px 7px',
  color: 'var(--wings-text-muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

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
  const [previewFile, setPreviewFile] = useState(null);
  const [fileLocks, setFileLocks] = useState({});

  const currentUserId = parseInt(localStorage.getItem('user_id') || '0');
  const isAdmin = espace && espace.admin_id === currentUserId;
  const { accent, faint } = colorFromName(espace?.nom || '');

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

  useEffect(() => {
    if (!fichiers || fichiers.length === 0) return;

    const loadLocks = async () => {
      const results = {};
      await Promise.all(fichiers.map(async (f) => {
        try {
          const res = await API.get(`/files/${f.id}/lock`);
          results[f.id] = res.data;
        } catch (e) {
          results[f.id] = { locked: false };
        }
      }));
      setFileLocks(results);
    };

    loadLocks();
    const interval = setInterval(loadLocks, 30000);
    return () => clearInterval(interval);
  }, [fichiers]);

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
      showToast(`Invitation envoyée à ${res.data.email} par email`);
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

  const titleNode = espace ? (
    editMode ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRename()}
          autoFocus
          style={{
            fontSize: 22,
            fontFamily: 'Georgia, serif',
            background: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${accent}`,
            outline: 'none',
            color: 'var(--wings-text)',
            padding: '2px 0',
            minWidth: 120,
          }}
        />
        <button
          onClick={handleRename}
          style={{ color: accent, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}
        >OK</button>
        <button
          onClick={() => { setEditMode(false); setEditName(espace.nom); }}
          style={{ color: 'var(--wings-text-muted)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}
        >Annuler</button>
      </div>
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400 }}>
          {espace.nom}
        </span>
        {isAdmin && (
          <button
            onClick={() => setEditMode(true)}
            title="Renommer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wings-text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
    )
  ) : null;

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', paddingTop: 48, color: 'var(--wings-text-muted)', fontSize: 13 }}>
          Chargement...
        </div>
      </AppLayout>
    );
  }

  if (!espace) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', paddingTop: 48, color: 'var(--wings-text-muted)', fontSize: 13 }}>
          Espace introuvable
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { id: 'fichiers',    label: 'Fichiers',    icon: FileText, count: fichiers.length },
    { id: 'membres',     label: 'Membres',     icon: Users,    count: membres.length },
    ...(isAdmin ? [{ id: 'invitations', label: 'Invitations', icon: Mail, count: invitations.filter(i => !i.utilise).length }] : []),
    ...(isAdmin ? [{ id: 'parametres',  label: 'Paramètres',  icon: Settings }] : []),
  ];

  return (
    <AppLayout titleNode={titleNode}>
      <div style={{ '--accent': accent, '--accent-faint': faint }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 24, right: 24,
            padding: '8px 16px', borderRadius: 8,
            background: toast.type === 'error' ? '#dc2626' : '#059669',
            color: '#fff', zIndex: 50, fontSize: 14,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>{toast.msg}</div>
        )}

        {/* Sous-barre : fil d'ariane + action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button
            onClick={() => navigate('/admin-espace')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none',
              color: 'var(--wings-text-muted)', fontSize: 13,
              cursor: 'pointer', padding: 0,
            }}
          >
            <ArrowLeft size={14} /> Retour à mes espaces
          </button>

          {isAdmin ? (
            <button
              onClick={handleDeleteEspace}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent',
                border: '0.5px solid rgba(220,80,80,0.3)',
                color: '#e57373',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,80,80,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Trash2 size={12} /> Supprimer l'espace
            </button>
          ) : (
            <button
              onClick={handleLeave}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent',
                border: '0.5px solid var(--wings-border)',
                color: 'var(--wings-text-muted)',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <ExitIcon size={12} /> Quitter l'espace
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--wings-border)', marginBottom: 24 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t.id ? 'var(--wings-text)' : 'var(--wings-text-muted)',
                fontSize: 13,
                fontWeight: tab === t.id ? 500 : 400,
                cursor: 'pointer',
                marginBottom: '-0.5px',
                transition: 'all 0.15s',
              }}
            >
              <t.icon size={14} />
              {t.label}
              {t.count !== undefined && (
                <span style={{
                  fontSize: 10, padding: '2px 6px',
                  background: 'var(--wings-surface)',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 999,
                  color: 'var(--wings-text-muted)',
                  fontFamily: 'monospace',
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet Fichiers ── */}
        {tab === 'fichiers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--wings-text-muted)' }}>
                {fichiers.length} fichier{fichiers.length !== 1 ? 's' : ''}
              </span>
              {canUpload ? (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px',
                  background: 'var(--wings-blue)',
                  color: '#fff',
                  borderRadius: 999,
                  fontSize: 13,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'opacity 0.15s',
                }}>
                  <UploadCloud size={14} /> Téléverser dans l'espace
                  <input type="file" onChange={handleUpload} style={{ display: 'none' }} />
                </label>
              ) : (
                <div
                  title="Vous n'avez pas l'autorisation de téléverser dans cet espace"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 18px',
                    background: 'var(--wings-surface)',
                    border: '0.5px solid var(--wings-border)',
                    color: 'var(--wings-text-muted)',
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: 'not-allowed',
                  }}
                >
                  <UploadCloud size={14} /> Téléversement non autorisé
                </div>
              )}
            </div>

            {!canUpload && (
              <div style={{
                marginBottom: 16,
                padding: '10px 14px',
                background: 'rgba(251,191,36,0.08)',
                border: '0.5px solid rgba(251,191,36,0.2)',
                borderRadius: 10,
                fontSize: 12,
                color: 'rgba(251,191,36,0.9)',
              }}>
                L'administrateur de cet espace a restreint le téléversement. Vous pouvez consulter et télécharger les fichiers selon vos droits.
              </div>
            )}

            {fichiers.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 72, paddingBottom: 72 }}>
                <FileText size={40} style={{ color: 'var(--wings-text-muted)', opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 14, color: 'var(--wings-text-muted)', margin: '0 0 4px' }}>Aucun fichier dans cet espace</p>
                <p style={{ fontSize: 12, color: 'var(--wings-text-muted)', opacity: 0.6, margin: 0 }}>Téléversez votre premier fichier pour démarrer la collaboration</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {fichiers.map(f => {
                  const isOwner = f.owner_id === currentUserId;
                  const perms = (isOwner || isAdmin)
                    ? { lecture: true, download: true, ecriture: true, partage: true, suppression: true }
                    : (f.mes_permissions || { lecture: false, download: false, ecriture: false, partage: false, suppression: false });
                  const ftColor = getFileTypeColor(f.nom);
                  const ext = f.nom?.split('.').pop()?.toUpperCase() || 'FILE';
                  const taille = Number(f.taille) || 0;
                  const sizeStr = taille < 0.01 ? `${(taille * 1024).toFixed(0)} KB` : `${taille.toFixed(1)} MB`;

                  return (
                    <div
                      key={f.id}
                      style={{
                        position: 'relative',
                        background: 'var(--wings-surface)',
                        border: '0.5px solid var(--wings-border)',
                        borderRadius: 12,
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        opacity: (fileLocks[f.id]?.locked && !fileLocks[f.id]?.is_mine) ? 0.65 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{
                          fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                          padding: '3px 8px',
                          background: ftColor.bg,
                          color: ftColor.color,
                          borderRadius: 6,
                        }}>{ext}</span>
                        {fileLocks[f.id]?.locked && (
                          <div
                            title={fileLocks[f.id].is_mine
                              ? 'Verrouillé par vous'
                              : `Verrouillé par ${fileLocks[f.id].lock?.user_nom || fileLocks[f.id].lock?.user_email || 'un autre utilisateur'}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 999,
                              background: fileLocks[f.id].is_mine
                                ? 'rgba(255,193,7,0.15)'
                                : 'rgba(229,115,115,0.15)',
                              border: `0.5px solid ${fileLocks[f.id].is_mine
                                ? 'rgba(255,193,7,0.4)'
                                : 'rgba(229,115,115,0.4)'}`,
                              fontSize: 9,
                              fontFamily: 'monospace',
                              letterSpacing: '0.5px',
                              color: fileLocks[f.id].is_mine ? 'var(--wings-gold)' : '#e57373',
                            }}
                          >
                            <Lock size={9} />
                            {fileLocks[f.id].is_mine ? 'VOUS' : 'VERROUILLÉ'}
                          </div>
                        )}
                      </div>

                      <div>
                        <p style={{
                          fontSize: 13, fontWeight: 500,
                          color: 'var(--wings-text)',
                          margin: '0 0 4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }} title={f.nom}>{f.nom}</p>
                        <p style={{ fontSize: 11, color: 'var(--wings-text-muted)', margin: 0 }}>
                          {f.owner_nom || f.owner_email} · {sizeStr}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--wings-text-muted)', opacity: 0.7, margin: '2px 0 0' }}>
                          {formatRelativeTime(f.date_creation)}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
                        {perms.download && (
                          <button onClick={() => handleDownload(f)} title="Télécharger" style={actionBtnStyle}>
                            <Download size={13} />
                          </button>
                        )}
                        {perms.lecture && (
                          <button onClick={() => navigate(`/versions?fileId=${f.id}`)} title="Historique" style={actionBtnStyle}>
                            <History size={13} />
                          </button>
                        )}
                        {(isAdmin || isOwner) && (
                          <button onClick={() => openAclModal(f)} title="Gérer les accès" style={actionBtnStyle}>
                            <Shield size={13} />
                          </button>
                        )}
                        {perms.lecture && (
                          <button onClick={() => setPreviewFile(f)} title="Aperçu" style={actionBtnStyle}>
                            <Eye size={13} />
                          </button>
                        )}
                        {isEditable(f.nom) && perms.ecriture && (
                          <button
                            onClick={() => {
                              const verrou = fileLocks[f.id];
                              if (verrou?.locked && !verrou?.is_mine) {
                                alert(`Ce fichier est verrouillé par ${verrou.lock?.user_nom || verrou.lock?.user_email || 'un autre utilisateur'}. Vous ne pouvez pas l'éditer pour l'instant.`);
                                return;
                              }
                              navigate(`/editor?fileId=${f.id}`);
                            }}
                            title="Éditer"
                            style={actionBtnStyle}
                          >
                            <FilePen size={13} />
                          </button>
                        )}
                        {perms.suppression && (
                          <button onClick={() => handleDeleteFile(f.id, f.nom)} title="Supprimer" style={{ ...actionBtnStyle, color: '#e57373' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Membres ── */}
        {tab === 'membres' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {membres.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 64, color: 'var(--wings-text-muted)', fontSize: 13 }}>
                Aucun membre dans cet espace
              </div>
            ) : membres.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--wings-surface)',
                  border: '0.5px solid var(--wings-border)',
                  borderRadius: 12,
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0,
                  }}>
                    {(m.nom || m.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)' }}>
                        {m.nom || '—'}
                      </span>
                      {m.role === 'admin' ? (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 6px',
                          background: 'rgba(255,193,7,0.15)',
                          color: 'var(--wings-gold)',
                          borderRadius: 999, letterSpacing: '0.5px',
                        }}>ADMIN</span>
                      ) : (
                        <span style={{
                          fontSize: 9, fontWeight: 600, padding: '2px 6px',
                          background: 'rgba(168,180,212,0.1)',
                          color: 'var(--wings-text-muted)',
                          borderRadius: 999, letterSpacing: '0.5px',
                        }}>MEMBRE</span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--wings-text-muted)', margin: 0 }}>{m.email}</p>
                  </div>
                </div>
                {isAdmin && m.role !== 'admin' && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    title="Retirer du groupe"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wings-text-muted)', padding: 6, display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#e57373'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; }}
                  >
                    <UserMinus size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Onglet Invitations ── */}
        {tab === 'invitations' && isAdmin && (
          <div>
            <div style={{
              background: 'var(--wings-surface)',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={14} /> Inviter par email
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  placeholder="email@exemple.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  style={{
                    flex: 1, padding: '8px 12px',
                    background: 'var(--wings-bg)',
                    border: '0.5px solid var(--wings-border)',
                    borderRadius: 8,
                    color: 'var(--wings-text)',
                    fontSize: 13,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = accent; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--wings-border)'; }}
                />
                <button
                  onClick={handleInvite}
                  style={{
                    padding: '8px 18px',
                    background: 'var(--wings-blue)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Inviter
                </button>
              </div>
              <button
                onClick={handleGenerateLink}
                style={{
                  marginTop: 12,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--wings-gold)',
                  padding: 0,
                }}
              >
                <Link2 size={14} /> Générer un lien d'invitation public
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--wings-text-muted)', marginBottom: 12 }}>
              Invitations actives ({invitations.filter(i => !i.utilise).length})
            </p>

            {invitations.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--wings-text-muted)', textAlign: 'center', paddingTop: 24 }}>Aucune invitation</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {invitations.map(i => (
                  <div
                    key={i.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--wings-surface)',
                      border: '0.5px solid var(--wings-border)',
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--wings-text)', margin: '0 0 2px' }}>
                        {i.email || 'Lien public'}
                        {i.utilise && <span style={{ marginLeft: 8, fontSize: 11, color: '#4ade80' }}>Utilisée</span>}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--wings-text-muted)', margin: 0 }}>
                        Expire le {new Date(i.date_expiration).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {!i.utilise && (
                      <button
                        onClick={() => handleCopyInvite(i.token)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px',
                          background: 'var(--wings-bg)',
                          border: '0.5px solid var(--wings-border)',
                          borderRadius: 8,
                          fontSize: 12,
                          color: 'var(--wings-text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        <Copy size={12} /> Copier le lien
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Paramètres ── */}
        {tab === 'parametres' && isAdmin && (
          <div style={{ maxWidth: 600 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)', margin: '0 0 4px' }}>Politique de téléversement</p>
            <p style={{ fontSize: 12, color: 'var(--wings-text-muted)', marginBottom: 20 }}>
              Définissez qui peut ajouter des fichiers dans cet espace.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { value: 'tous',            label: 'Tous les membres',          desc: "N'importe quel membre de l'espace peut téléverser des fichiers." },
                { value: 'membres_choisis', label: 'Membres sélectionnés',      desc: 'Seuls les membres que vous choisissez peuvent téléverser.' },
                { value: 'admin_seul',      label: 'Administrateur uniquement', desc: 'Seul vous pouvez téléverser des fichiers.' },
              ].map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: 14,
                    background: uploadPolicy === opt.value ? 'var(--accent-faint)' : 'var(--wings-surface)',
                    border: uploadPolicy === opt.value ? `1px solid var(--accent)` : '0.5px solid var(--wings-border)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="upload-policy"
                    checked={uploadPolicy === opt.value}
                    onChange={() => setUploadPolicy(opt.value)}
                    style={{ marginTop: 2, accentColor: accent }}
                  />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)', margin: '0 0 4px' }}>{opt.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--wings-text-muted)', margin: 0 }}>{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {uploadPolicy === 'membres_choisis' && (
              <div style={{
                marginTop: 16,
                padding: 14,
                background: 'var(--wings-surface)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 10,
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--wings-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Membres autorisés à téléverser :
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {membres.filter(m => m.role !== 'admin').map(m => (
                    <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--wings-text)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={uploadAutorises.includes(m.id)}
                        onChange={() => {
                          setUploadAutorises(prev =>
                            prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                          );
                        }}
                        style={{ accentColor: accent }}
                      />
                      {m.nom} ({m.email})
                    </label>
                  ))}
                  {membres.filter(m => m.role !== 'admin').length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--wings-text-muted)', margin: 0 }}>Aucun autre membre dans l'espace.</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleSavePolicy}
              style={{
                marginTop: 20,
                padding: '10px 24px',
                background: 'var(--wings-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Enregistrer la politique
            </button>
          </div>
        )}

        {/* ── Modale invitation ── */}
        {inviteModal && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setInviteModal(null)}
          >
            <div
              style={{
                background: 'var(--wings-surface)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 16, padding: 24,
                maxWidth: 480, width: '100%',
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--wings-text)', marginBottom: 8, marginTop: 0 }}>
                {inviteModal.email ? `Invitation envoyée à ${inviteModal.email}` : "Lien d'invitation public créé"}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--wings-text-muted)', marginBottom: 16 }}>
                Partagez ce lien avec la personne que vous souhaitez inviter. Il expire dans 7 jours.
              </p>
              <div style={{
                background: 'var(--wings-bg)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 8, padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              }}>
                <code style={{ flex: 1, fontSize: 11, color: 'var(--wings-text-muted)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {inviteModal.url}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteModal.url).catch(() => {}); showToast('Lien copié'); }}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    background: 'var(--wings-blue)',
                    color: '#fff', border: 'none',
                    borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  <Copy size={12} /> Copier
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setInviteModal(null)}
                  style={{
                    padding: '8px 16px', fontSize: 13,
                    background: 'transparent',
                    border: '0.5px solid var(--wings-border)',
                    borderRadius: 8, color: 'var(--wings-text)',
                    cursor: 'pointer',
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modale ACL fichier ── */}
        {aclModal && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setAclModal(null)}
          >
            <div
              style={{
                background: 'var(--wings-surface)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 16, padding: 24,
                maxWidth: 600, width: '100%',
                maxHeight: '80vh', overflowY: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--wings-text)', marginBottom: 4, marginTop: 0 }}>
                Gérer les accès — {aclModal.fichier.nom}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--wings-text-muted)', marginBottom: 16 }}>
                {aclModal.can_manage
                  ? 'Définissez les droits de chaque membre sur ce fichier.'
                  : "Vous n'avez pas les droits pour modifier ces accès."}
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--wings-border)' }}>
                      {['Membre', 'Lecture', 'Téléch.', 'Écriture'].map(h => (
                        <th key={h} style={{
                          textAlign: h === 'Membre' ? 'left' : 'center',
                          padding: '8px 10px',
                          fontSize: 10, fontWeight: 600,
                          color: 'var(--wings-text-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aclModal.permissions.map(p => {
                      const locked = p.is_owner || p.is_espace_admin;
                      return (
                        <tr key={p.user_id} style={{ borderBottom: '0.5px solid var(--wings-border)' }}>
                          <td style={{ padding: '10px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: 11, fontWeight: 600,
                              }}>
                                {(p.nom || p.email)[0].toUpperCase()}
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)', margin: 0 }}>
                                  {p.nom}
                                  {p.is_owner && (
                                    <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--wings-blue)', fontWeight: 700 }}>PROPRIÉTAIRE</span>
                                  )}
                                  {p.is_espace_admin && !p.is_owner && (
                                    <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--wings-gold)', fontWeight: 700 }}>ADMIN</span>
                                  )}
                                </p>
                                <p style={{ fontSize: 11, color: 'var(--wings-text-muted)', margin: 0 }}>{p.email}</p>
                              </div>
                            </div>
                          </td>
                          {['lecture', 'download', 'ecriture'].map(perm => (
                            <td key={perm} style={{ textAlign: 'center', padding: '10px 10px' }}>
                              <input
                                type="checkbox"
                                checked={locked ? true : p[perm]}
                                disabled={locked || !aclModal.can_manage}
                                onChange={() => handleToggleAcl(p.user_id, perm, p[perm])}
                                style={{ accentColor: accent, width: 14, height: 14, opacity: (locked || !aclModal.can_manage) ? 0.4 : 1 }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  onClick={() => setAclModal(null)}
                  style={{
                    padding: '8px 16px', fontSize: 13,
                    background: 'transparent',
                    border: '0.5px solid var(--wings-border)',
                    borderRadius: 8, color: 'var(--wings-text)',
                    cursor: 'pointer',
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
            onDownload={() => { handleDownload(previewFile); setPreviewFile(null); }}
          />
        )}
      </div>
    </AppLayout>
  );
}
