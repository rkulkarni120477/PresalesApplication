import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

interface Opportunity {
  id: number;
  opportunity_id: string;
  name: string;
}

interface Artifact {
  id: number;
  artifact_id: string;
  name: string;
}

interface Mapping {
  id: number;
  opportunity_id: number;
  artifact_id: number;
  mapping_date: string;
  artifact: Artifact;
}

export default function MappingPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<number | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedOpportunity) {
      loadMappings();
    }
  }, [selectedOpportunity]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [oppsData, artsData] = await Promise.all([
        apiClient.getOpportunities(0, 100),
        apiClient.getArtifacts(0, 100),
      ]);
      setOpportunities(oppsData);
      setArtifacts(artsData);
      if (oppsData.length > 0) {
        setSelectedOpportunity(oppsData[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async () => {
    if (!selectedOpportunity) return;
    try {
      const data = await apiClient.getOpportunityArtifacts(selectedOpportunity);
      setMappings(data.map((art: any, idx: number) => ({
        id: idx,
        opportunity_id: selectedOpportunity,
        artifact_id: art.id,
        artifact: art,
        mapping_date: new Date().toISOString(),
      })));
    } catch (error) {
      console.error('Failed to load mappings:', error);
    }
  };

  const handleMapArtifact = async (artifactId: number) => {
    if (!selectedOpportunity) return;
    try {
      await apiClient.mapArtifact(selectedOpportunity, artifactId);
      loadMappings();
    } catch (error) {
      console.error('Failed to map artifact:', error);
    }
  };

  const handleUnmapArtifact = async (artifactId: number) => {
    if (!selectedOpportunity) return;
    try {
      await apiClient.unmapArtifact(selectedOpportunity, artifactId);
      loadMappings();
    } catch (error) {
      console.error('Failed to unmap artifact:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  const mappedArtifactIds = mappings.map(m => m.artifact_id);
  const unmappedArtifacts = artifacts.filter(a => !mappedArtifactIds.includes(a.id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Opportunities */}
        <div className="card">
          <h3 className="text-lg font-bold text-presales-text mb-4">Select Opportunity</h3>
          <div className="space-y-2">
            {opportunities.map(opp => (
              <div
                key={opp.id}
                onClick={() => setSelectedOpportunity(opp.id)}
                className={`p-3 rounded-lg cursor-pointer border-2 transition-all duration-200 ${
                  selectedOpportunity === opp.id
                    ? 'border-presales-dark-green bg-presales-light-green'
                    : 'border-presales-border hover:border-presales-dark-green'
                }`}
              >
                <p className="font-medium text-presales-text">{opp.name}</p>
                <p className="text-xs text-presales-text-secondary">{opp.opportunity_id}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mapped Artifacts */}
        <div className="card">
          <h3 className="text-lg font-bold text-presales-text mb-4">Mapped Artifacts</h3>
          {mappings.length === 0 ? (
            <p className="text-presales-text-secondary text-sm">No artifacts mapped yet</p>
          ) : (
            <div className="space-y-2">
              {mappings.map(mapping => (
                <div
                  key={mapping.artifact_id}
                  className="flex items-center justify-between p-3 bg-presales-light-green border border-presales-border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-presales-text">{mapping.artifact.name}</p>
                    <p className="text-xs text-presales-text-secondary">{mapping.artifact.artifact_id}</p>
                  </div>
                  <button
                    onClick={() => handleUnmapArtifact(mapping.artifact_id)}
                    className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available Artifacts to Map */}
      <div className="card">
        <h3 className="text-lg font-bold text-presales-text mb-4">Available Artifacts</h3>
        {unmappedArtifacts.length === 0 ? (
          <p className="text-presales-text-secondary text-sm">All artifacts are already mapped</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unmappedArtifacts.map(art => (
              <div
                key={art.id}
                className="p-4 border border-presales-border rounded-lg hover:shadow-lg transition-all duration-200"
              >
                <p className="font-medium text-presales-text">{art.name}</p>
                <p className="text-xs text-presales-text-secondary mb-3">{art.artifact_id}</p>
                <button
                  onClick={() => handleMapArtifact(art.id)}
                  className="w-full bg-presales-dark-green text-white py-2 rounded-lg font-medium hover:bg-presales-medium-green transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Map Artifact
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
