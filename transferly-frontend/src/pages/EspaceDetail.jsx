import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Mail, Settings, Trash2, Edit2, ArrowLeft,
  UploadCloud, Download, FileText, Link2, Copy, UserMinus,
  LogOut as ExitIcon, Shield, History, FilePen, Eye, Lock,
  FolderPlus, Folder, ChevronRight, ChevronDown, MoreVertical, Pencil,
  CheckSquare, X, FolderInput, Move,
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
  const [currentFolder,       setCurrentFolder]       = useState(null);
  const [folders,             setFolders]             = useState([]);
  const [folderPath,          setFolderPath]          = useState([]);
  const [openFolderMenuId,      setOpenFolderMenuId]    = useState(null);
  const [folderMenuPos,       setFolderMenuPos]       = useState({ top: 0, left: 0 });
  const [folderDeleteConfirm, setFolderDeleteConfirm] = useState(null);
  const [selectedFileIds,    setSelectedFileIds]    = useState(new Set());
  const [selectionMode,      setSelectionMode]      = useState(false);
  const [showBatchConfirm,   setShowBatchConfirm]   = useState(false);
  const [batchDeleting,      setBatchDeleting]      = useState(false);
  const [showMoveModal,      setShowMoveModal]      = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState(null);
  const [expandedFolders,    setExpandedFolders]    = useState(new Set());
  const [moving,             setMoving]             = useState(false);

  const currentUserId = parseInt(localStorage.getItem('user_id') || '0');
  const isAdmin = espace && espace.admin_id === currentUserId;
  const { accent, faint } = colorFromName(espace?.nom || '');
  const isEspaceAdmin = isAdmin || espace?.role === 'admin' || localStorage.getItem('role') === 'AdminGlobal';

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

  useEffect(() => {
    setCurrentFolder(null);
    setFolderPath([]);
    setFolders([]);
    loadEspace();
  }, [espaceId]);

  const loadFoldersForEspace = async () => {
    try {
      const params = { espace_id: parseInt(espaceId) };
      if (currentFolder !== null) params.parent_id = currentFolder;
      const res = await API.get('/folders', { params });
      setFolders(res.data || []);
    } catch {
      setFolders([]);
    }
  };

  useEffect(() => {
    if (espaceId) loadFoldersForEspace();
    setSelectedFileIds(new Set());
    setSelectionMode(false);
  }, [espaceId, currentFolder]);

  const enterFolder = (folder) => {
    setFolderPath(prev => [...prev, { id: folder.id, nom: folder.nom }]);
    setCurrentFolder(folder.id);
  };

  const navigateTo = (breadcrumbIndex) => {
    if (breadcrumbIndex === 0) {
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const target = folderPath[breadcrumbIndex - 1];
      setCurrentFolder(target.id);
      setFolderPath(prev => prev.slice(0, breadcrumbIndex));
    }
  };

  useEffect(() => {
    if (!openFolderMenuId) return;
    const close = () => setOpenFolderMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openFolderMenuId]);

  const handleFolderKebabClick = (e, folderId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setFolderMenuPos({ top: rect.bottom + 4, left: rect.right - 188 });
    setOpenFolderMenu(prev => prev === folderId ? null : folderId);
  };

  const handleFolderNewSubfolder = async (e, folder) => {
    e.stopPropagation();
    setOpenFolderMenuId(null);
    const nom = prompt('Nom du sous-dossier ?');
    if (!nom?.trim()) return;
    try {
      await API.post('/folders', { nom: nom.trim(), parent_id: folder.id, espace_id: parseInt(espaceId) });
      showToast('Sous-dossier créé');
      loadFoldersForEspace();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur création', 'error');
    }
  };

  const handleFolderRename = async (e, folder) => {
    e.stopPropagation();
    setOpenFolderMenuId(null);
    const newNom = prompt('Nouveau nom ?', folder.nom);
    if (!newNom?.trim() || newNom.trim() === folder.nom) return;
    try {
      await API.put(`/folders/${folder.id}`, { nom: newNom.trim() });
      showToast('Dossier renommé');
      loadFoldersForEspace();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur renommage', 'error');
    }
  };

  const handleFolderDelete = async () => {
    if (!folderDeleteConfirm) return;
    const { id, nom } = folderDeleteConfirm;
    try {
      await API.delete(`/folders/${id}`);
      showToast(`"${nom}" supprimé`);
      setFolderDeleteConfirm(null);
      loadFoldersForEspace();
      if (currentFolder === id) {
        const idx = folderPath.findIndex(f => f.id === id);
        if (idx > 0) {
          setCurrentFolder(folderPath[idx - 1].id);
          setFolderPath(prev => prev.slice(0, idx));
        } else {
          setCurrentFolder(null);
          setFolderPath([]);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur suppression', 'error');
      setFolderDeleteConfirm(null);
    }
  };

  const handleCreateFolder = async () => {
    const nom = prompt('Nom du nouveau dossier :');
    if (!nom?.trim()) return;
    try {
      await API.post('/folders', {
        nom:       nom.trim(),
        parent_id: currentFolder,
        espace_id: parseInt(espaceId),
      });
      showToast('Dossier créé');
      loadFoldersForEspace();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur création dossier', 'error');
    }
  };

  // ── Helpers sélection batch ──────────────────────────────────────
  const toggleSelectFile = (fileId) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const clearFileSelection = () => setSelectedFileIds(new Set());

  const toggleSelectionMode = () => {
    if (selectionMode) clearFileSelection();
    setSelectionMode(s => !s);
  };

  const toggleExpand = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const buildFolderTreeForEspace = () => {
    const espId = parseInt(espaceId);
    const spaceFolders = folders.filter(f => f.espace_id === espId);
    const map = {};
    spaceFolders.forEach(f => { map[f.id] = { ...f, children: [] }; });
    const roots = [];
    spaceFolders.forEach(f => {
      if (f.parent_id && map[f.parent_id]) {
        map[f.parent_id].children.push(map[f.id]);
      } else {
        roots.push(map[f.id]);
      }
    });
    return roots;
  };

  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    try {
      const ids = Array.from(selectedFileIds);
      const res = await API.delete('/files/batch', { data: { ids } });
      const data = res.data || {};
      loadEspace();
      clearFileSelection();
      setSelectionMode(false);
      setShowBatchConfirm(false);
      const skipped = data.skipped_count ?? 0;
      const deleted = data.deleted_count ?? ids.length - skipped;
      if (skipped > 0) {
        showToast(`${deleted} fichier${deleted > 1 ? 's' : ''} supprimé${deleted > 1 ? 's' : ''}, ${skipped} ignoré${skipped > 1 ? 's' : ''} (permission refusée)`, 'error');
      } else {
        showToast(`${ids.length} fichier${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la suppression', 'error');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleBatchMove = async () => {
    setMoving(true);
    try {
      const fichier_ids = Array.from(selectedFileIds);
      const res = await API.put('/folders/move-files', {
        fichier_ids,
        folder_id: moveTargetFolderId,
        espace_id: parseInt(espaceId),
      });
      const data = res.data || {};
      loadEspace();
      clearFileSelection();
      setSelectionMode(false);
      setShowMoveModal(false);
      setMoveTargetFolderId(null);
      const skipped = data.skipped_count ?? 0;
      const moved = data.moved_count ?? fichier_ids.length - skipped;
      if (skipped > 0) {
        showToast(`${moved} fichier${moved > 1 ? 's' : ''} déplacé${moved > 1 ? 's' : ''}, ${skipped} ignoré${skipped > 1 ? 's' : ''} (permission refusée)`, 'error');
      } else {
        showToast(`${fichier_ids.length} fichier${fichier_ids.length > 1 ? 's' : ''} déplacé${fichier_ids.length > 1 ? 's' : ''}`);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors du déplacement', 'error');
    } finally {
      setMoving(false);
    }
  };

  const openMoveModalFor = (fichierId) => {
    setSelectedFileIds(new Set([fichierId]));
    setMoveTargetFolderId(null);
    setShowMoveModal(true);
  };

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
    if (currentFolder !== null) fd.append('folder_id', currentFolder);
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

  const visibleFichiers = currentFolder !== null
    ? fichiers.filter(f => f.folder_id === currentFolder)
    : fichiers.filter(f => !f.folder_id);

  const breadcrumb = [{ id: null, nom: 'Racine' }, ...folderPath];

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
            {/* Fil d'Ariane */}
            {breadcrumb.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
                {breadcrumb.map((segment, i) => (
                  <span key={segment.id ?? 'root'} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => navigateTo(i)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: 13,
                        color: i === breadcrumb.length - 1 ? 'var(--wings-text)' : 'var(--wings-text-muted)',
                        fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
                      }}
                    >
                      {segment.nom}
                    </button>
                    {i < breadcrumb.length - 1 && (
                      <ChevronRight size={12} style={{ color: 'var(--wings-text-muted)', opacity: 0.5 }} />
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Barre outils */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--wings-text-muted)' }}>
                {visibleFichiers.length} fichier{visibleFichiers.length !== 1 ? 's' : ''}
                {folders.length > 0 && ` · ${folders.length} dossier${folders.length !== 1 ? 's' : ''}`}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isEspaceAdmin && currentFolder === null && (
                  <button
                    onClick={handleCreateFolder}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px',
                      background: 'rgba(212,170,82,0.07)',
                      border: '0.5px solid rgba(212,170,82,0.35)',
                      color: 'var(--wings-gold)',
                      borderRadius: 999,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,170,82,0.15)'; e.currentTarget.style.borderColor = 'var(--wings-gold)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,170,82,0.07)'; e.currentTarget.style.borderColor = 'rgba(212,170,82,0.35)'; }}
                  >
                    <FolderPlus size={14} /> Nouveau dossier
                  </button>
                )}
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
                {visibleFichiers.length > 0 && (
                  <button
                    onClick={toggleSelectionMode}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px',
                      background: selectionMode ? 'rgba(220,38,38,0.08)' : 'transparent',
                      border: `0.5px solid ${selectionMode ? 'rgba(220,38,38,0.4)' : 'var(--wings-border)'}`,
                      borderRadius: 999,
                      color: selectionMode ? '#dc2626' : 'var(--wings-text-muted)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {selectionMode ? <X size={14} /> : <CheckSquare size={14} />}
                    {selectionMode ? 'Annuler' : 'Sélectionner'}
                  </button>
                )}
              </div>
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

            {/* Barre d'actions batch */}
            {selectionMode && selectedFileIds.size > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', marginBottom: 12,
                background: 'var(--wings-surface)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 12,
                position: 'sticky', top: 0, zIndex: 10,
              }}>
                <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500 }}>
                  {selectedFileIds.size} fichier{selectedFileIds.size > 1 ? 's' : ''} sélectionné{selectedFileIds.size > 1 ? 's' : ''}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={clearFileSelection}
                    style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 12,
                      background: 'none', border: '0.5px solid var(--wings-border)',
                      color: 'var(--wings-text-muted)', cursor: 'pointer',
                    }}
                  >
                    Tout désélectionner
                  </button>
                  <button
                    onClick={() => setShowMoveModal(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                      background: 'rgba(79,139,255,0.08)',
                      border: '0.5px solid rgba(79,139,255,0.4)',
                      color: 'var(--wings-blue)', cursor: 'pointer',
                    }}
                  >
                    <FolderInput size={13} />
                    Déplacer vers...
                  </button>
                  <button
                    onClick={() => setShowBatchConfirm(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                      background: 'rgba(220,38,38,0.08)',
                      border: '0.5px solid rgba(220,38,38,0.3)',
                      color: '#dc2626', cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                    Supprimer la sélection
                  </button>
                </div>
              </div>
            )}

            {/* Tout sélectionner */}
            {selectionMode && visibleFichiers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={visibleFichiers.length > 0 && selectedFileIds.size === visibleFichiers.length}
                  onChange={() => {
                    if (selectedFileIds.size === visibleFichiers.length) {
                      setSelectedFileIds(new Set());
                    } else {
                      setSelectedFileIds(new Set(visibleFichiers.map(f => f.id)));
                    }
                  }}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--wings-blue)' }}
                />
                <span style={{ color: 'var(--wings-text-muted)', fontSize: 12 }}>Tout sélectionner</span>
              </div>
            )}

            {/* Grille de dossiers */}
            {folders.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
                {folders.map(folder => (
                  <div
                    key={folder.id}
                    onClick={() => enterFolder(folder)}
                    style={{
                      position: 'relative',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'var(--wings-surface)',
                      border: '0.5px solid var(--wings-border)',
                      borderRadius: 12, padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = faint; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--wings-border)'; e.currentTarget.style.background = 'var(--wings-surface)'; }}
                  >
                    <Folder size={18} style={{ color: 'var(--wings-gold)', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--wings-text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {folder.nom}
                    </span>

                    {/* Bouton 3 points — admins uniquement */}
                    {isEspaceAdmin && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          e.preventDefault();
                          setOpenFolderMenuId(openFolderMenuId === folder.id ? null : folder.id);
                        }}
                        title="Actions"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '2px 3px', borderRadius: 4, flexShrink: 0,
                          color: 'var(--wings-text-muted)',
                          display: 'flex', alignItems: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = 'var(--wings-text)'; }}
                        onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.color = 'var(--wings-text-muted)'; }}
                      >
                        <MoreVertical size={14} />
                      </button>
                    )}

                    {/* Popover — position absolute dans la carte */}
                    {isEspaceAdmin && openFolderMenuId === folder.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '100%', right: 0,
                          zIndex: 50,
                          marginTop: 4,
                          background: 'var(--wings-surface)',
                          border: '0.5px solid var(--wings-border)',
                          borderRadius: 8,
                          padding: 4,
                          minWidth: 188,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                        }}
                      >
                        {[
                          {
                            label: 'Nouveau sous-dossier',
                            icon: <FolderPlus size={14} style={{ flexShrink: 0 }} />,
                            onClick: e => handleFolderNewSubfolder(e, folder),
                            danger: false,
                          },
                          {
                            label: 'Renommer',
                            icon: <Pencil size={14} style={{ flexShrink: 0 }} />,
                            onClick: e => handleFolderRename(e, folder),
                            danger: false,
                          },
                          {
                            label: 'Supprimer',
                            icon: <Trash2 size={14} style={{ flexShrink: 0 }} />,
                            onClick: e => { e.stopPropagation(); setOpenFolderMenuId(null); setFolderDeleteConfirm({ id: folder.id, nom: folder.nom }); },
                            danger: true,
                          },
                        ].map(item => (
                          <button
                            key={item.label}
                            onClick={item.onClick}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              width: '100%', padding: '8px 12px',
                              background: 'none', border: 'none', borderRadius: 5,
                              fontSize: 12, cursor: 'pointer', textAlign: 'left',
                              fontFamily: 'inherit',
                              color: item.danger ? 'var(--wings-gold)' : 'var(--wings-text-muted)',
                              transition: 'background 0.1s, color 0.1s',
                            }}
                            onMouseEnter={e => {
                              if (item.danger) {
                                e.currentTarget.style.background = 'rgba(255,80,80,0.08)';
                                e.currentTarget.style.color = '#ff7a7a';
                              } else {
                                e.currentTarget.style.background = 'rgba(79,139,255,0.08)';
                                e.currentTarget.style.color = 'var(--wings-text)';
                              }
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'none';
                              e.currentTarget.style.color = item.danger ? 'var(--wings-gold)' : 'var(--wings-text-muted)';
                            }}
                          >
                            {item.icon}
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Grille de fichiers (filtrée par dossier courant) */}
            {visibleFichiers.length === 0 && folders.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 72, paddingBottom: 72 }}>
                <FileText size={40} style={{ color: 'var(--wings-text-muted)', opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 14, color: 'var(--wings-text-muted)', margin: '0 0 4px' }}>Aucun fichier dans cet espace</p>
                <p style={{ fontSize: 12, color: 'var(--wings-text-muted)', opacity: 0.6, margin: 0 }}>Téléversez votre premier fichier pour démarrer la collaboration</p>
              </div>
            ) : visibleFichiers.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--wings-text-muted)', textAlign: 'center', paddingTop: 24, paddingBottom: 24 }}>
                Aucun fichier dans ce dossier
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {visibleFichiers.map(f => {
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
                        outline: selectionMode && selectedFileIds.has(f.id) ? '2px solid var(--wings-blue)' : 'none',
                        outlineOffset: '-2px',
                      }}
                    >
                      {selectionMode && (
                        <div
                          style={{ position: 'absolute', top: 8, left: 8, zIndex: 5 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFileIds.has(f.id)}
                            onChange={() => toggleSelectFile(f.id)}
                            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--wings-blue)' }}
                          />
                        </div>
                      )}
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

                      <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', marginTop: 'auto', overflowX: 'auto' }}>
                        {perms.download && (
                          <button onClick={() => handleDownload(f)} title="Télécharger" style={{ ...actionBtnStyle, flexShrink: 0 }}>
                            <Download size={13} />
                          </button>
                        )}
                        {perms.lecture && (
                          <button onClick={() => navigate(`/versions?fileId=${f.id}`)} title="Historique" style={{ ...actionBtnStyle, flexShrink: 0 }}>
                            <History size={13} />
                          </button>
                        )}
                        {(isAdmin || isOwner) && (
                          <button onClick={() => openAclModal(f)} title="Gérer les accès" style={{ ...actionBtnStyle, flexShrink: 0 }}>
                            <Shield size={13} />
                          </button>
                        )}
                        {perms.lecture && (
                          <button onClick={() => setPreviewFile(f)} title="Aperçu" style={{ ...actionBtnStyle, flexShrink: 0 }}>
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
                            style={{ ...actionBtnStyle, flexShrink: 0 }}
                          >
                            <FilePen size={13} />
                          </button>
                        )}
                        {(isOwner || isEspaceAdmin) && (
                          <button
                            onClick={() => openMoveModalFor(f.id)}
                            title="Déplacer vers..."
                            style={{ ...actionBtnStyle, flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--wings-blue)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--wings-text-muted)'; }}
                          >
                            <Move size={13} />
                          </button>
                        )}
                        {perms.suppression && (
                          <button onClick={() => handleDeleteFile(f.id, f.nom)} title="Supprimer" style={{ ...actionBtnStyle, color: '#e57373', flexShrink: 0 }}>
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

        {/* ── Modal confirmation suppression batch fichiers ── */}
        {showBatchConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border"
                 style={{ borderColor: 'var(--wings-border)' }}>
              <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--wings-border)' }}>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Confirmer la suppression
                </h2>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Vous allez supprimer définitivement{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {selectedFileIds.size} fichier{selectedFileIds.size > 1 ? 's' : ''}
                  </strong>.
                  {' '}Cette action est irréversible.
                </p>
              </div>
              <div className="px-6 py-4 flex justify-end gap-3 border-t" style={{ borderColor: 'var(--wings-border)' }}>
                <button
                  onClick={() => setShowBatchConfirm(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={batchDeleting}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {batchDeleting ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal déplacement batch fichiers ── */}
        {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border overflow-hidden"
                 style={{ borderColor: 'var(--wings-border)' }}>
              <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
                   style={{ borderColor: 'var(--wings-border)' }}>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Déplacer {selectedFileIds.size} fichier{selectedFileIds.size > 1 ? 's' : ''} vers...
                </h2>
                <button
                  onClick={() => { setShowMoveModal(false); setMoveTargetFolderId(null); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Option Racine de l'espace */}
                <div
                  onClick={() => setMoveTargetFolderId(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    marginBottom: 4,
                    background: moveTargetFolderId === null ? 'rgba(79,139,255,0.1)' : 'transparent',
                    border: moveTargetFolderId === null ? '0.5px solid rgba(79,139,255,0.3)' : '0.5px solid transparent',
                  }}
                >
                  <Folder size={16} style={{ color: 'var(--wings-gold)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--wings-text)' }}>Racine de l'espace</span>
                  {currentFolder === null && (
                    <span style={{ fontSize: 11, color: 'var(--wings-text-muted)', fontStyle: 'italic', marginLeft: 4 }}>(dossier actuel)</span>
                  )}
                </div>

                {/* Arborescence des dossiers de cet espace uniquement */}
                {(() => {
                  const tree = buildFolderTreeForEspace();
                  if (tree.length === 0) {
                    return (
                      <p style={{ color: 'var(--wings-text-muted)', fontSize: 12, padding: '8px 10px' }}>
                        Aucun sous-dossier dans cet espace.
                      </p>
                    );
                  }
                  const renderNode = (node, depth) => (
                    <div key={node.id}>
                      <div
                        onClick={() => setMoveTargetFolderId(node.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 10px', paddingLeft: 10 + depth * 16,
                          borderRadius: 8, cursor: 'pointer',
                          background: moveTargetFolderId === node.id ? 'rgba(79,139,255,0.1)' : 'transparent',
                          border: moveTargetFolderId === node.id ? '0.5px solid rgba(79,139,255,0.3)' : '0.5px solid transparent',
                        }}
                      >
                        {node.children.length > 0 ? (
                          <button
                            onClick={e => { e.stopPropagation(); toggleExpand(node.id); }}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--wings-text-muted)', display: 'flex', flexShrink: 0 }}
                          >
                            {expandedFolders.has(node.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        ) : (
                          <span style={{ width: 13, flexShrink: 0, display: 'inline-block' }} />
                        )}
                        <Folder size={14} style={{ color: 'var(--wings-gold)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--wings-text)', flex: 1 }}>{node.nom}</span>
                        {node.id === currentFolder && (
                          <span style={{ fontSize: 11, color: 'var(--wings-text-muted)', fontStyle: 'italic' }}>(dossier actuel)</span>
                        )}
                      </div>
                      {expandedFolders.has(node.id) && node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                  );
                  return tree.map(n => renderNode(n, 0));
                })()}
              </div>

              <div className="px-6 py-4 flex justify-end gap-3 border-t flex-shrink-0"
                   style={{ borderColor: 'var(--wings-border)' }}>
                <button
                  onClick={() => { setShowMoveModal(false); setMoveTargetFolderId(null); }}
                  className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleBatchMove}
                  disabled={moving}
                  style={{
                    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: 'var(--wings-blue)', border: 'none', color: '#fff',
                    cursor: moving ? 'not-allowed' : 'pointer',
                    opacity: moving ? 0.6 : 1, transition: 'opacity 0.2s',
                  }}
                >
                  {moving ? 'Déplacement…' : 'Déplacer ici'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal confirmation suppression dossier ── */}
        {folderDeleteConfirm && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            }}
            onClick={() => setFolderDeleteConfirm(null)}
          >
            <div
              style={{
                width: '100%', maxWidth: 440,
                background: 'var(--wings-surface)',
                border: '0.5px solid var(--wings-border)',
                borderRadius: 16,
                boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                overflow: 'hidden',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '18px 24px', borderBottom: '0.5px solid var(--wings-border)' }}>
                <h2 style={{
                  fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 400,
                  color: 'var(--wings-text)', margin: 0,
                }}>
                  Supprimer le dossier
                </h2>
              </div>
              <div style={{ padding: '16px 24px' }}>
                <p style={{ fontSize: 13, color: 'var(--wings-text-muted)', margin: 0 }}>
                  Supprimer{' '}
                  <strong style={{ color: 'var(--wings-text)' }}>
                    &laquo;&nbsp;{folderDeleteConfirm.nom}&nbsp;&raquo;
                  </strong>{' '}
                  ? Les fichiers qu'il contient seront rattachés à la racine de l'espace. Cette action est irréversible.
                </p>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 10,
                padding: '14px 24px',
                borderTop: '0.5px solid var(--wings-border)',
              }}>
                <button
                  onClick={() => setFolderDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleFolderDelete}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
