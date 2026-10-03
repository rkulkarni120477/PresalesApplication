import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';

export default function ArtifactDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthStore();
  const [artifact, setArtifact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canDelete = user?.role === 'Artifact Repository Owner';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient
      .getArtifact(Number(id))
      .then(setArtifact)
      .catch((e) => setError(e?.response?.data?.detail || 'Failed to load artifact'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!artifact || !window.confirm(`Delete artifact "${artifact.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.deleteArtifact(artifact.id);
      router.push('/artifacts');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to delete artifact');
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await apiClient.downloadArtifactFile(artifact.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = artifact.name;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('No file available for this artifact');
    }
  };

  if (loading) return <p className="text-presales-text-secondary">Loading artifact...</p>;

  const fields: [string, any][] = artifact
    ? [
        ['Artifact ID', artifact.artifact_id],
        ['Type', artifact.artifact_type],
        ['Category', artifact.category],
        ['Industry', artifact.industry],
        ['Version', artifact.version],
        ['Status', artifact.status],
        ['Usage Count', artifact.usage_count],
        ['Created', artifact.created_at && new Date(artifact.created_at + 'Z').toLocaleDateString()],
      ]
    : [];

  return (
    <div className="space-y-6">
      <Link href="/artifacts" className="inline-flex items-center gap-2 text-presales-dark-green">
        <ArrowLeft size={16} /> Back to Artifacts
      </Link>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {artifact && (
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-presales-text">{artifact.name}</h1>
            <div className="flex gap-2">
              {artifact.source_reference && (
                <button onClick={handleDownload} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                  <Download size={16} /> Download
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fields.map(([label, value]) => (
              <div key={label} className="p-3 bg-presales-page-bg rounded-lg">
                <p className="text-xs uppercase text-presales-text-secondary">{label}</p>
                <p className="font-semibold text-presales-text">{value ?? 'N/A'}</p>
              </div>
            ))}
          </div>

          {artifact.description && (
            <div>
              <h2 className="font-semibold text-presales-text mb-1">Description</h2>
              <p className="text-presales-text-secondary whitespace-pre-wrap">{artifact.description}</p>
            </div>
          )}
          {artifact.summary && (
            <div>
              <h2 className="font-semibold text-presales-text mb-1">Summary</h2>
              <p className="text-presales-text-secondary whitespace-pre-wrap">{artifact.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
