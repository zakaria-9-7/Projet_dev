import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Files, Share2, History, Settings, LogOut, 
  Search, Bell, FolderPlus, UploadCloud, ChevronDown, Grid, List, 
  MoreVertical, ArrowLeft, Folder, FileText, Image as ImageIcon, 
  FileSpreadsheet, FileIcon, CheckCircle2, Network
} from 'lucide-react';

// --- Données simulées ---
const initialFiles = [
  { id: 1, type: 'folder', name: 'Documents', count: 24, date: 'Il y a 1 jour', perms: { ver: false } },
  { id: 2, type: 'folder', name: 'Images', count: 156, date: 'Il y a 3 jours', perms: { ver: false } },
  { id: 3, type: 'folder', name: 'Projets', count: 8, date: 'Il y a 1 semaine', perms: { ver: false } },
  { id: 4, type: 'file', name: 'Rapport_Q1_2024.pdf', ft: 'PDF', size: '2.4 MB', date: 'Il y a 2 heures', perms: { ver: true } },
  { id: 5, type: 'file', name: 'Presentation.pptx', ft: 'PPT', size: '8.1 MB', date: 'Il y a 5 heures', perms: { ver: true } },
  { id: 6, type: 'file', name: 'Budget_2024.xlsx', ft: 'XLS', size: '1.2 MB', date: 'Hier', perms: { ver: true } },
  { id: 7, type: 'file', name: 'Logo_Final.png', ft: 'IMG', size: '450 KB', date: 'Il y a 2 jours', perms: { ver: true } },
];

const initialVersions = {
  4: [
    { n: 3, date: '27 Avr 2026, 14:32', author: 'Nizar El Amrani', size: '2.6 MB', sha: 'a3f9d1c2e8b047fa', current: true },
    { n: 2, date: '25 Avr 2026, 09:15', author: 'Walid Errahoui', size: '2.4 MB', sha: 'b7e2f4a9c3d801e5', current: false },
    { n: 1, date: '20 Avr 2026, 16:44', author: 'Nizar El Amrani', size: '2.1 MB', sha: 'c9a5b3d7e1f204b6', current: false }
  ],
  6: [
    { n: 1, date: 'Hier, 16:00', author: 'Walid Errahoui', size: '1.2 MB', sha: 'f6a0b4c3d7e205f9', current: true }
  ]
};

export default function TransferlyApp() {
  const [activePage, setActivePage] = useState('myfiles');
  const [viewMode, setViewMode] = useState('grid');
  const [currentFileId, setCurrentFileId] = useState(null);
  const [versionsData, setVersionsData] = useState(initialVersions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '' });

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const handleRestoreRequest = (fileId, vNum) => {
    setRestoreTarget({ fileId, vNum });
    setIsModalOpen(true);
  };

  const confirmRestore = () => {
    if (!restoreTarget) return;
    const { fileId, vNum } = restoreTarget;
    
    setVersionsData(prev => ({
      ...prev,
      [fileId]: prev[fileId].map(v => ({ ...v, current: v.n === vNum }))
    }));
    
    setIsModalOpen(false);
    showToast(`Version v${vNum} restaurée avec succès.`);
  };

  const currentFile = initialFiles.find(f => f.id === currentFileId);
  const fileVersions = versionsData[currentFileId] || [];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      
      {/* ── SIDEBAR ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-5 border-b border-gray-100">
          <Network className="w-6 h-6 text-cyan-500" />
          <span className="font-bold text-gray-900 text-lg">Transferly</span>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1">
          <SidebarItem icon={LayoutDashboard} label="Tableau de bord" />
          <SidebarItem 
            icon={Files} 
            label="Mes Fichiers" 
            isActive={activePage === 'myfiles'} 
            onClick={() => setActivePage('myfiles')} 
          />
          <SidebarItem icon={Share2} label="Partagés avec moi" />
          <SidebarItem 
            icon={History} 
            label="Versions" 
            isActive={activePage === 'versions'} 
            onClick={() => setActivePage('versions')} 
          />
        </nav>

        <div className="p-4 border-t border-gray-100 flex flex-col gap-1">
          <SidebarItem icon={Settings} label="Paramètres" />
          <button className="flex items-center gap-3 px-4 py-2 w-full text-left text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* ── TOPBAR ── */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-6 shrink-0">
          <div className="flex-1 max-w-xl flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher des fichiers..." 
              className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
            <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer">
              U
            </div>
          </div>
        </header>

        {/* ── VIEWS ── */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {/* VIEW: MES FICHIERS */}
          {activePage === 'myfiles' && (
            <div className="max-w-6xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Mes Fichiers</h1>
              <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                <span>Racine</span>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <FolderPlus className="w-4 h-4" /> Nouveau dossier
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors shadow-sm">
                    <UploadCloud className="w-4 h-4" /> Téléverser un fichier
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    Trier par nom <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-cyan-50 text-cyan-600' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-2 border-l border-gray-200 ${viewMode === 'list' ? 'bg-cyan-50 text-cyan-600' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
                {initialFiles.map(file => (
                  <FileCard 
                    key={file.id} 
                    file={file} 
                    onOpenVersions={() => { setCurrentFileId(file.id); setActivePage('versions'); }} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* VIEW: VERSIONS */}
          {activePage === 'versions' && (
            <div className="max-w-5xl mx-auto">
              <button 
                onClick={() => setActivePage('myfiles')}
                className="flex items-center gap-2 text-cyan-600 text-sm font-medium hover:text-cyan-700 mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Retour aux fichiers
              </button>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Historique des versions</h1>
              <p className="text-gray-500 text-sm mb-8">Fichier : <span className="font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">{currentFile?.name}</span></p>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[100px_1fr_1fr_100px_150px] gap-4 p-4 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <div>Version</div>
                  <div>Date de modification</div>
                  <div>Auteur</div>
                  <div>Taille</div>
                  <div className="text-right">Action</div>
                </div>
                
                <div className="divide-y divide-gray-50">
                  {fileVersions.map((v) => (
                    <div key={v.n} className={`grid grid-cols-[100px_1fr_1fr_100px_150px] gap-4 p-4 items-center ${v.current ? 'bg-blue-50/50' : 'hover:bg-gray-50 transition-colors'}`}>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${v.current ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          v{v.n} {v.current && <span className="ml-1 font-normal opacity-75">actuelle</span>}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{v.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">
                          {v.author.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-600">{v.author}</span>
                      </div>
                      <div className="text-sm text-gray-500">{v.size}</div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        {v.current ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Courante
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleRestoreRequest(currentFileId, v.n)}
                            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
                          >
                            Restaurer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {fileVersions.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-sm">Aucun historique de version pour ce fichier.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
              <History className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Restaurer la version v{restoreTarget?.vNum} ?</h3>
            <p className="text-sm text-gray-500 mb-6 line-clamp-3">La version courante sera archivée et cette version deviendra la version active du fichier. Cette action est réversible.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button 
                onClick={confirmRestore}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 shadow-lg transition-all duration-300 ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">{toast.msg}</span>
      </div>
    </div>
  );
}

// ── COMPOSANTS SECONDAIRES ──

function SidebarItem({ icon: Icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors w-[calc(100%-16px)] text-left
        ${isActive 
          ? 'bg-cyan-50 text-cyan-700 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-cyan-500 before:rounded-r-md' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );
}

function FileCard({ file, onOpenVersions }) {
  const isFolder = file.type === 'folder';
  
  // Icônes spécifiques selon le type
  const renderIcon = () => {
    if (isFolder) return <Folder className="w-10 h-10 text-cyan-400 stroke-[1.5]" />;
    if (file.ft === 'PDF' || file.ft === 'PPT') return <FileText className="w-10 h-10 text-gray-400 stroke-[1.5]" />;
    if (file.ft === 'XLS') return <FileSpreadsheet className="w-10 h-10 text-gray-400 stroke-[1.5]" />;
    if (file.ft === 'IMG') return <ImageIcon className="w-10 h-10 text-gray-400 stroke-[1.5]" />;
    return <FileIcon className="w-10 h-10 text-gray-400 stroke-[1.5]" />;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col hover:shadow-md hover:border-cyan-200 transition-all group relative min-h-[160px]">
      <button className="absolute top-3 right-3 p-1.5 text-gray-400 hover:bg-gray-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
        <MoreVertical className="w-4 h-4" />
      </button>
      
      <div className="mb-4">
        {renderIcon()}
      </div>
      
      <div className="mt-auto">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate pr-6" title={file.name}>
          {file.name}
        </h3>
        
        {isFolder ? (
          <p className="text-xs text-gray-500">{file.count} fichiers</p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{file.size}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                {file.ft}
              </span>
            </div>
            <p className="text-xs text-gray-400">{file.date}</p>
          </div>
        )}
      </div>

      {/* Actions Hover */}
      {!isFolder && file.perms.ver && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
            onClick={onOpenVersions}
            className="p-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:text-cyan-600 hover:border-cyan-200 rounded-md shadow-sm"
            title="Historique des versions"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
