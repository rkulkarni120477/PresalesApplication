import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Plus, Search, Filter, Eye, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

interface Artifact {
  id: number;
  artifact_id: string;
  name: string;
  artifact_type: string;
  category: string;
  industry: string;
  version: string;
  usage_count: number;
  status: string;
}

export default function ArtifactsPage() {
  const { user } = useAuthStore();
  const canDelete = user?.role === 'Artifact Repository Owner';
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [artifactType, setArtifactType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    artifact_type: 'Proposal',
    category: '',
    industry: '',
    description: '',
    summary: '',
    file: null as File | null,
  });

  useEffect(() => {
    const timer = setTimeout(loadArtifacts, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, artifactType]);

  const loadArtifacts = async () => {
    try {
      setLoading(true);
      const filters = {
        search: search || undefined,
        artifact_type: artifactType || undefined,
      };
      const data = await apiClient.getArtifacts(0, 100, filters);
      setArtifacts(data);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArtifact = async (art: Artifact) => {
    if (!window.confirm(`Delete artifact "${art.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.deleteArtifact(art.id);
      setArtifacts((prev) => prev.filter((a) => a.id !== art.id));
    } catch (error: any) {
      alert(error?.response?.data?.detail || 'Failed to delete artifact');
    }
  };

  const handleCreateArtifact = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (formData.file && formData.file.size > 100 * 1024 * 1024) {
      setCreateError('File size exceeds 100 MB limit');
      return;
    }

    setCreateLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('artifact_type', formData.artifact_type);
      submitData.append('category', formData.category);
      submitData.append('industry', formData.industry);
      submitData.append('description', formData.description);
      submitData.append('summary', formData.summary);
      if (formData.file) {
        submitData.append('file', formData.file);
      }

      await apiClient.createArtifactWithFile(submitData);
      setShowCreateModal(false);
      setFormData({
        name: '',
        artifact_type: 'Proposal',
        category: '',
        industry: '',
        description: '',
        summary: '',
        file: null,
      });
      loadArtifacts();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to create artifact';
      setCreateError(errorMsg);
      console.error('Failed to create artifact:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const types = [
    'Proposal',
    'Architecture',
    'Solution Design',
    'Case Study',
    'Reference Architecture',
    'Technical Document',
    'Security Document',
    'Compliance Document',
    'Presentation',
    'Demo',
    'Estimation',
    'Statement of Work',
    'RFP Response',
    'Business Case',
    'Implementation Plan',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search size={20} className="text-presales-text-secondary" />
          <input
            type="text"
            placeholder="Semantic search artifacts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="flex-1 border border-presales-border rounded-lg px-4 py-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={20} className="text-presales-text-secondary" />
          <select
            value={artifactType}
            onChange={(e) => {
              setArtifactType(e.target.value);
            }}
            className="border border-presales-border rounded-lg px-4 py-2"
          >
            <option value="">All Types</option>
            {types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-presales-dark-green text-white px-6 py-2 rounded-lg font-medium hover:bg-presales-medium-green transition-all duration-200 flex items-center gap-2"
        >
          <Plus size={20} />
          Create Artifact
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-presales-text mb-6">Create Artifact</h3>

            {createError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{createError}</p>
              </div>
            )}

            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">⚠️ Maximum file size: 100 MB</p>
              <p className="text-xs text-red-600 mt-1">Files will be processed and stored securely. Content will be parsed, tokenized, and added to vector database.</p>
            </div>

            <form onSubmit={handleCreateArtifact} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Artifact Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-2 border border-presales-border rounded-lg px-4 py-2"
                  required
                />
                <select
                  value={formData.artifact_type}
                  onChange={(e) => setFormData({ ...formData, artifact_type: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                  required
                >
                  {types.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                />
                <input
                  type="text"
                  placeholder="Industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="col-span-2 border border-presales-border rounded-lg px-4 py-2"
                />
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-2 border border-presales-border rounded-lg px-4 py-2 h-24"
                />
                <textarea
                  placeholder="Summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="col-span-2 border border-presales-border rounded-lg px-4 py-2 h-24"
                />
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-presales-text mb-2">Upload File (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    className="block w-full text-sm text-presales-text-secondary border border-presales-border rounded-lg cursor-pointer p-2 file:px-4 file:py-2 file:border-0 file:rounded file:bg-presales-dark-green file:text-white file:cursor-pointer file:font-medium hover:file:bg-presales-medium-green"
                    accept="*/*"
                  />
                  {formData.file && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-presales-text-secondary">
                        Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                      {formData.file.size > 50 * 1024 * 1024 && (
                        <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                          ⚠️ Large file detected ({(formData.file.size / 1024 / 1024).toFixed(2)} MB). Processing may take several minutes. Please wait while the file is parsed and indexed.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError('');
                  }}
                  disabled={createLoading}
                  className="px-6 py-2 border border-presales-border rounded-lg hover:bg-presales-page-bg transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2 bg-presales-dark-green text-white rounded-lg hover:bg-presales-medium-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-hidden">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b-2 border-presales-border">
              <th className="w-[9%] text-left py-3 px-2 font-semibold text-presales-text">ID</th>
              <th className="w-[22%] text-left py-3 px-2 font-semibold text-presales-text">Name</th>
              <th className="w-[14%] text-left py-3 px-2 font-semibold text-presales-text">Type</th>
              <th className="w-[11%] text-left py-3 px-2 font-semibold text-presales-text">Category</th>
              <th className="w-[10%] text-left py-3 px-2 font-semibold text-presales-text">Industry</th>
              <th className="w-[8%] text-left py-3 px-2 font-semibold text-presales-text">Version</th>
              <th className="w-[9%] text-left py-3 px-2 font-semibold text-presales-text">Usage Count</th>
              <th className="w-[17%] text-center py-3 px-2 font-semibold text-presales-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-presales-text-secondary">
                  Loading artifacts...
                </td>
              </tr>
            ) : artifacts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-presales-text-secondary">
                  No artifacts found
                </td>
              </tr>
            ) : (
              artifacts.map((art) => (
                <tr key={art.id} className="border-b border-presales-border hover:bg-presales-light-green">
                  <td className="py-3 px-2 text-presales-text text-sm font-medium">{art.artifact_id}</td>
                  <td className="py-3 px-2 text-presales-text font-medium break-words">{art.name}</td>
                  <td className="py-3 px-2 text-presales-text">{art.artifact_type}</td>
                  <td className="py-3 px-2 text-presales-text">{art.category}</td>
                  <td className="py-3 px-2 text-presales-text">{art.industry}</td>
                  <td className="py-3 px-2 text-presales-text">{art.version}</td>
                  <td className="py-3 px-2">
                    <span className="px-3 py-1 bg-presales-light-green text-presales-dark-green rounded-full text-sm font-medium">
                      {art.usage_count}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center whitespace-nowrap">
                    <Link
                      href={`/artifacts/${art.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-presales-dark-green hover:bg-presales-light-green transition-all duration-200"
                    >
                      <Eye size={16} />
                      <span className="text-sm">View</span>
                    </Link>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteArtifact(art)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200"
                      >
                        <Trash2 size={16} />
                        <span className="text-sm">Delete</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
