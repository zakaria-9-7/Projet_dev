// frontend/src/pages/FileVersions.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/files'; 

export default function FileVersions() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [fileName, setFileName] = useState("Document sans nom");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tâche NE-02 : Récupérer la liste des versions via l'API
    const fetchVersions = async () => {
      try {
        const response = await api.get(`/files/${fileId}/versions`);
        setVersions(response.data);
      } catch (err) {
        console.error("Erreur lors du chargement des versions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [fileId]);

  const handleRestore = async (versionNum) => {
    if (window.confirm(`Voulez-vous vraiment restaurer la version ${versionNum} ?`)) {
      try {
        // Appeler ton endpoint POST /files/{id}/versions/{n}/restore (NE-02)
        // await api.post(`/files/${fileId}/versions/${versionNum}/restore`);
        alert(`Version ${versionNum} restaurée !`);
        navigate('/dashboard'); // Ou rafraîchir la liste
      } catch (err) {
        alert("Erreur lors de la restauration.");
      }
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-2 block">
            ← Retour aux fichiers
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Historique des versions</h1>
          <p className="text-gray-500">Fichier : <span className="font-mono">{fileName}</span></p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date de modification</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auteur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taille</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {versions.map((v) => (
              <tr key={v.id} className={v.estCourante ? "bg-blue-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-sm font-bold ${v.estCourante ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                    v{v.numeroVersion} {v.estCourante && "(actuelle)"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{v.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{v.auteur}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{v.taille}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!v.estCourante && (
                    <button 
                      onClick={() => handleRestore(v.numeroVersion)}
                      className="text-blue-600 hover:text-blue-900 font-semibold"
                    >
                      Restaurer
                    </button>
                  )}
                  <div className="text-[10px] text-gray-400 font-mono mt-1" title={v.sha256}>
                    SHA-256: {v.sha256.substring(0, 8)}...
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}