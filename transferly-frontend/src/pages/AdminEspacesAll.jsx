import { useState, useEffect } from 'react';
import { FolderOpen, HardDrive, Users, FileText, Trash2, X, UserMinus, Crown, User } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import API from '../api/auth';

export default function AdminEspacesAll() {
  const [espaces,        setEspaces]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [toast,          setToast]          = useState(null);
  const [selectedEspace, setSelectedEspace] = useState(null);
  const [members,        setMembers]        = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/espaces');
      setEspaces(res.data);
    } catch (e) {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadMembers = async (espace) => {
    setSelectedEspace(espace);
    setMembersLoading(true);
    try {
      const res = await API.get(`/admin/espaces/${espace.id}/members`);
      setMembers(res.data);
    } catch (e) {
      showToast('Erreur chargement membres', 'error');
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleDelete = async (id, nom) => {
    if (!confirm(`Supprimer l'espace "${nom}" et tout son contenu ? Action de modération irréversible.`)) return;
    try {
      await API.delete(`/admin/espaces/${id}`);
      showToast('Espace supprimé');
      if (selectedEspace?.id === id) setSelectedEspace(null);
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  const colHeaderStyle = {
    fontFamily: 'monospace',
    fontSize: '10px',
    letterSpacing: '2px',
    color: 'var(--wings-text-muted)',
    opacity: 0.6,
    textTransform: 'uppercase',
  };

  const handleRemoveMember = async (userId, userNom) => {
    if (!confirm(`Retirer "${userNom}" de l'espace "${selectedEspace.nom}" ?`)) return;
    try {
      await API.delete(`/admin/espaces/${selectedEspace.id}/members/${userId}`);
      showToast(`${userNom} retiré de l'espace`);
      loadMembers(selectedEspace);
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  return (
    <AppLayout>
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 50,
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          background: toast.type === 'error' ? '#dc2626' : '#059669',
          color: '#fff',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* En-tête */}
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--wings-text)', fontWeight: 400, margin: 0, marginBottom: 4 }}>
            Gestion des espaces
          </h1>
          <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>
            Superviser et modérer tous les espaces de la plateforme
          </p>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* COLONNE GAUCHE : Liste des espaces */}
          <div style={{ flex: selectedEspace ? '0 0 55%' : '1 1 auto', minWidth: 0, transition: 'flex-basis 0.2s' }}>
            {loading ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 13 }}>
                Chargement…
              </div>
            ) : espaces.length === 0 ? (
              <div style={{ padding: '64px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <FolderOpen size={40} style={{ color: 'var(--wings-text-muted)', opacity: 0.4 }} />
                <p style={{ color: 'var(--wings-text-muted)', fontSize: 13, margin: 0 }}>Aucun espace sur la plateforme</p>
              </div>
            ) : (
              <div>
                {/* En-tête colonnes */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 20px', marginBottom: 6 }}>
                  <span style={{ ...colHeaderStyle, flex: '0 0 200px' }}>Espace</span>
                  <span style={{ ...colHeaderStyle, flex: 1 }}>Administrateur</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 80px' }}>Membres</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 80px' }}>Fichiers</span>
                  <span style={{ ...colHeaderStyle, flex: '0 0 60px', textAlign: 'right' }}>Action</span>
                </div>

                {/* Lignes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {espaces.map(e => (
                    <div
                      key={e.id}
                      onClick={() => loadMembers(e)}
                      style={{
                        display: 'flex', alignItems: 'center',
                        background: selectedEspace?.id === e.id ? 'var(--wings-surface)' : 'transparent',
                        border: selectedEspace?.id === e.id ? '0.5px solid var(--wings-gold)' : '0.5px solid var(--wings-border)',
                        borderRadius: 12, padding: '14px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={ev => { if (selectedEspace?.id !== e.id) ev.currentTarget.style.background = 'var(--wings-surface)'; }}
                      onMouseLeave={ev => { if (selectedEspace?.id !== e.id) ev.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <FolderOpen size={14} style={{ color: 'var(--wings-gold)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--wings-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.nom}
                        </span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                        <div style={{ color: 'var(--wings-text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.admin_nom}
                        </div>
                        <div style={{ color: 'var(--wings-text-muted)', fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.admin_email}
                        </div>
                      </div>

                      <div style={{ flex: '0 0 80px', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Users size={13} style={{ color: 'var(--wings-text-muted)', opacity: 0.7, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--wings-text)' }}>{e.nb_membres}</span>
                      </div>

                      <div style={{ flex: '0 0 80px', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FileText size={13} style={{ color: 'var(--wings-text-muted)', opacity: 0.7, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--wings-text)' }}>{e.nb_fichiers}</span>
                      </div>

                      <div style={{ flex: '0 0 60px', display: 'flex', justifyContent: 'flex-end' }} onClick={ev => ev.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(e.id, e.nom)}
                          title="Supprimer cet espace (modération)"
                          style={{
                            background: 'none', border: 'none', padding: 4,
                            color: 'var(--wings-text-muted)', cursor: 'pointer', borderRadius: 6,
                            display: 'flex', alignItems: 'center',
                          }}
                          onMouseEnter={el => el.currentTarget.style.color = '#e57373'}
                          onMouseLeave={el => el.currentTarget.style.color = 'var(--wings-text-muted)'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COLONNE DROITE : Panneau détail membres (visible seulement si un espace est sélectionné) */}
          {selectedEspace && (
            <div style={{
              flex: '0 0 45%',
              background: 'var(--wings-surface)',
              border: '0.5px solid var(--wings-border)',
              borderRadius: 12,
              padding: 20,
              alignSelf: 'flex-start',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--wings-text)', fontWeight: 500 }}>
                    Membres
                  </div>
                  <div style={{ color: 'var(--wings-text-muted)', fontSize: 11, fontFamily: 'monospace' }}>
                    {selectedEspace.nom}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEspace(null)}
                  style={{
                    background: 'none', border: 'none', padding: 4,
                    color: 'var(--wings-text-muted)', cursor: 'pointer', borderRadius: 6,
                  }}
                  title="Fermer"
                >
                  ×
                </button>
              </div>

              {membersLoading ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 12 }}>
                  Chargement des membres…
                </div>
              ) : !members || members.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--wings-text-muted)', fontSize: 12 }}>
                  Aucun membre
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {members.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      background: 'var(--wings-bg)',
                      border: '0.5px solid var(--wings-border)',
                      borderRadius: 8,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--wings-blue)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600, flexShrink: 0,
                      }}>
                        {(m.nom || m.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--wings-text)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.nom}
                        </div>
                        <div style={{ color: 'var(--wings-text-muted)', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.email}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(m.id, m.nom)}
                        title="Retirer ce membre"
                        style={{
                          background: 'none', border: 'none', padding: 4,
                          color: 'var(--wings-text-muted)', cursor: 'pointer', borderRadius: 6,
                          display: 'flex', alignItems: 'center', flexShrink: 0,
                        }}
                        onMouseEnter={el => el.currentTarget.style.color = '#e57373'}
                        onMouseLeave={el => el.currentTarget.style.color = 'var(--wings-text-muted)'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
