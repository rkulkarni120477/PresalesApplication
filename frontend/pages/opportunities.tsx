import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Plus, Search, Filter, Eye, CheckCircle, Trash2, Upload } from 'lucide-react';

interface Opportunity {
  id: number;
  opportunity_id: string;
  name: string;
  customer: string;
  industry: string;
  stage: string;
  estimated_value: number;
  probability: number;
  priority: string;
  owner_id: number;
  assigned_to_id?: number;
  owner_name?: string;
  assigned_to_name?: string;
}

export default function OpportunitiesPage() {
  const { user } = useAuthStore();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null);
  const [presalesAdmins, setPresalesAdmins] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    customer: '',
    industry: '',
    region: '',
    stage: 'Discovery',
    priority: 'Medium',
    estimated_value: '',
  });

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const filters = {
        search: search || undefined,
        stage: stage || undefined,
        user_id: user?.id,
      };
      const data = await apiClient.getOpportunities(0, 100, filters);
      setOpportunities(data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setFileError('');
    setCreateLoading(true);

    try {
      const formDataWithFile = new FormData();
      formDataWithFile.append('name', formData.name);
      formDataWithFile.append('customer', formData.customer);
      formDataWithFile.append('industry', formData.industry);
      formDataWithFile.append('region', formData.region);
      formDataWithFile.append('stage', formData.stage);
      formDataWithFile.append('priority', formData.priority);
      if (formData.estimated_value) {
        formDataWithFile.append('estimated_value', formData.estimated_value);
      }

      if (selectedFile) {
        formDataWithFile.append('file', selectedFile);
      }

      await apiClient.createOpportunityWithFile(formDataWithFile);
      setShowCreateModal(false);
      setSelectedFile(null);
      setFormData({
        name: '',
        customer: '',
        industry: '',
        region: '',
        stage: 'Discovery',
        priority: 'Medium',
        estimated_value: '',
      });
      await loadOpportunities();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to create opportunity';
      setCreateError(errorMsg);
      console.error('Failed to create opportunity:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const loadPresalesAdmins = async () => {
    try {
      const users = await apiClient.getUsers();
      const admins = users.filter((u: any) => u.role?.name === 'Presales Solution Owner');
      setPresalesAdmins(admins);
    } catch (error) {
      console.error('Failed to load Presales Solution Owners:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedAdminId || !selectedOpportunityId) return;

    setAssignLoading(true);
    try {
      await apiClient.assignOpportunity(selectedOpportunityId, selectedAdminId);
      setShowAssignModal(false);
      setSelectedAdminId(null);
      setSelectedOpportunityId(null);
      await loadOpportunities();
    } catch (error) {
      console.error('Failed to assign opportunity:', error);
      alert('Failed to assign opportunity');
    } finally {
      setAssignLoading(false);
    }
  };

  const stages = ['Discovery', 'Qualification', 'Solutioning', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search size={20} className="text-presales-text-secondary" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            onKeyUp={() => loadOpportunities()}
            className="flex-1 border border-presales-border rounded-lg px-4 py-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={20} className="text-presales-text-secondary" />
          <select
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              loadOpportunities();
            }}
            className="border border-presales-border rounded-lg px-4 py-2"
          >
            <option value="">All Stages</option>
            {stages.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {user?.role === 'Presales Administrator' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-presales-dark-green text-white px-6 py-2 rounded-lg font-medium hover:bg-presales-medium-green transition-all duration-200 flex items-center gap-2"
          >
            <Plus size={20} />
            Create Opportunity
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-presales-text mb-6">Create Opportunity</h3>

            {createError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{createError}</p>
              </div>
            )}

            <form onSubmit={handleCreateOpportunity} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Opportunity Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-2 border border-presales-border rounded-lg px-4 py-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                />
                <input
                  type="number"
                  placeholder="Estimated Value"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                />
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                >
                  {stages.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* File Upload Section */}
              <div className="mt-6 p-4 border-2 border-dashed border-presales-border rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Upload size={20} className="text-presales-dark-green" />
                  <span className="text-sm font-medium text-presales-text">
                    {selectedFile ? selectedFile.name : 'Upload Artifact (Optional)'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 100 * 1024 * 1024) {
                          setFileError('File size must be less than 100 MB');
                          setSelectedFile(null);
                        } else {
                          setFileError('');
                          setSelectedFile(file);
                        }
                      }
                    }}
                    className="hidden"
                    accept=".pdf,.docx,.txt,.csv,.doc,.zip"
                  />
                </label>
                {fileError && (
                  <p className="text-sm text-red-600 mt-2">{fileError}</p>
                )}
                {selectedFile && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-presales-text-secondary">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p className="text-xs text-presales-text-secondary mt-2">
                  Maximum file size: 100 MB. Supported formats: PDF, DOCX, TXT, CSV, ZIP
                </p>
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

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-2xl font-bold text-presales-text mb-6">Assign to Presales Solution Owner</h3>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-presales-text mb-2">
                Select Solution Owner
              </label>
              <select
                value={selectedAdminId || ''}
                onChange={(e) => setSelectedAdminId(Number(e.target.value))}
                className="w-full border border-presales-border rounded-lg px-4 py-2 text-presales-text"
              >
                <option value="">-- Choose a Solution Owner --</option>
                {presalesAdmins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.first_name} {admin.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAdminId(null);
                  setSelectedOpportunityId(null);
                }}
                disabled={assignLoading}
                className="px-6 py-2 border border-presales-border rounded-lg hover:bg-presales-page-bg transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedAdminId || assignLoading}
                className="px-6 py-2 bg-presales-dark-green text-white rounded-lg hover:bg-presales-medium-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assignLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b-2 border-presales-border">
              <th className="text-left py-2 px-2 font-semibold text-presales-text text-xs">ID</th>
              <th className="text-left py-2 px-2 font-semibold text-presales-text text-xs">Name</th>
              <th className="text-left py-2 px-2 font-semibold text-presales-text text-xs">Customer</th>
              <th className="text-left py-2 px-2 font-semibold text-presales-text text-xs">Industry</th>
              <th className="text-left py-2 px-2 font-semibold text-presales-text text-xs">Stage</th>
              <th className="text-left py-2 px-2 font-semibold text-presales-text text-xs">Value</th>
              <th className="text-left py-2 px-2 font-semibold text-presales-text text-xs">Current Owner</th>
              {user?.role === 'Presales Administrator' && (
                <th className="text-left py-2 px-2 font-semibold text-presales-text text-xs">Status</th>
              )}
              <th className="text-center py-2 px-2 font-semibold text-presales-text text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-presales-text-secondary">
                  Loading opportunities...
                </td>
              </tr>
            ) : opportunities.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-presales-text-secondary">
                  No opportunities found
                </td>
              </tr>
            ) : (
              opportunities.map((opp) => (
                <tr key={opp.id} className="border-b border-presales-border hover:bg-presales-light-green text-sm">
                  <td className="py-2 px-2 text-presales-text font-medium">{opp.opportunity_id}</td>
                  <td className="py-2 px-2 text-presales-text font-medium">{opp.name}</td>
                  <td className="py-2 px-2 text-presales-text">{opp.customer}</td>
                  <td className="py-2 px-2 text-presales-text">{opp.industry}</td>
                  <td className="py-2 px-2">
                    <span className="px-2 py-1 bg-presales-light-green text-presales-dark-green rounded-full text-xs font-medium">
                      {opp.stage}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-presales-text">
                    {opp.estimated_value ? `$${(opp.estimated_value / 1000000).toFixed(1)}M` : '-'}
                  </td>
                  <td className="py-2 px-2">
                    <span className="inline-flex items-center px-2 py-1 bg-presales-light-green text-presales-dark-green rounded-full text-xs font-medium">
                      {opp.assigned_to_name || opp.owner_name || 'Unassigned'}
                    </span>
                  </td>
                  {user?.role === 'Presales Administrator' && (
                    <td className="py-2 px-2">
                      {opp.assigned_to_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          <CheckCircle size={12} />
                          Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      )}
                    </td>
                  )}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/opportunities/${opp.id}`}
                        className="inline-flex items-center justify-center p-1 rounded-lg text-presales-dark-green hover:bg-presales-light-green transition-all duration-200"
                        title="View"
                      >
                        <Eye size={16} />
                      </Link>
                      {user?.role === 'Presales Administrator' && !opp.assigned_to_id && (
                        <button
                          onClick={async () => {
                            setSelectedOpportunityId(opp.id);
                            setShowAssignModal(true);
                            await loadPresalesAdmins();
                          }}
                          className="inline-flex items-center justify-center p-1 rounded-lg text-presales-dark-green hover:bg-presales-light-green transition-all duration-200"
                          title="Assign"
                        >
                          <span className="text-sm">📋</span>
                        </button>
                      )}
                      {user?.role === 'Presales Administrator' && (
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this opportunity?')) {
                              try {
                                await apiClient.deleteOpportunity(opp.id);
                                await loadOpportunities();
                              } catch (error) {
                                console.error('Failed to delete opportunity:', error);
                                alert('Failed to delete opportunity');
                              }
                            }
                          }}
                          className="inline-flex items-center justify-center p-1 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
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
