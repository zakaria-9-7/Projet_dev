import React, { useState, useEffect } from 'react';
// import api from '../api/files'; // Le service configuré pour inclure le JWT

export default function MyFiles() {
  const [items, setItems] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Racine' }]);
  const [viewMode, setViewMode] = useState('list'); // 'list' ou 'grid'

  // Simule le chargement des données (à remplacer par ton fetch API)
  useEffect(() => {
    const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;
    // Exemple de données retournées par l'API (filtrées par le backend selon l'ACL)
    const fetchData = async () => {
      // const response = await api.get(`/folders/${currentFolderId}`);
      // setItems(response.data);
      setItems([
        { id: 1, type: 'folder', name: 'Projets', permissions: { lecture: true, ecriture: true, suppression: false } },
        { id: 2, type: 'file', name: 'rapport_transferly.pdf', size: '2.4 MB', date: '24/04/2026', permissions: { lecture: true, download: true, ecriture: false, suppression: false, partage: false } },
      ]);
    };
    fetchData();
  }, [breadcrumbs]);

  // Navigation dans les dossiers
  const navigateToFolder = (folderId, folderName) => {
    setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
  };

  const goBackTo = (index) => {
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* HEADER : Fil d'ariane et vue */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <nav className="flex space-x-2 text-sm font-medium text-gray-600">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id || 'root'} className="flex items-center">
              <button 
                onClick={() => goBackTo(index)}
                className="hover:text-blue-600 transition-colors"
              >
                {crumb.name}
              </button>
              {index < breadcrumbs.length - 1 && <span className="mx-2 text-gray-400">/</span>}
            </div>
          ))}
        </nav>

        <div className="flex space-x-2">
          <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
            Liste
          </button>
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
            Grille
          </button>
        </div>
      </div>

      {/* CONTENU : Grille ou Liste */}
      <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" : "space-y-2"}>
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`flex ${viewMode === 'grid' ? 'flex-col justify-center text-center p-6' : 'flex-row items-center justify-between p-4'} bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow`}
          >
            {/* Infos du fichier/dossier */}
            <div 
              className={`flex ${viewMode === 'grid' ? 'flex-col items-center' : 'flex-row items-center space-x-4'} cursor-pointer`}
              onClick={() => item.type === 'folder' && navigateToFolder(item.id, item.name)}
            >
              <div className="text-3xl mb-2">
                {item.type === 'folder' ? '📁' : '📄'}
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">{item.name}</p>
                {item.type === 'file' && (
                  <p className="text-xs text-gray-500">{item.size} • Modifié le {item.date}</p>
                )}
              </div>
            </div>

            {/* NE-05 : ACTIONS CONTEXTUELLES SELON ACL */}
            <div className={`flex space-x-2 ${viewMode === 'grid' ? 'mt-4' : ''}`}>
              {item.permissions.download && item.type === 'file' && (
                <button className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">
                  Télécharger
                </button>
              )}
              {item.permissions.ecriture && (
                <button className="text-sm bg-gray-50 text-gray-600 px-3 py-1 rounded hover:bg-gray-200">
                  Renommer
                </button>
              )}
              {item.permissions.suppression && (
                <button className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100">
                  Supprimer
                </button>
              )}
              {item.permissions.partage && (
                <button className="text-sm bg-green-50 text-green-600 px-3 py-1 rounded hover:bg-green-100">
                  Partager
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}