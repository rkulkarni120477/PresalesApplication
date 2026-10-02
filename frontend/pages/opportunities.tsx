import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Plus, Search, Filter, Eye, CheckCircle } from 'lucide-react';

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
    setCreateLoading(true);

    try {
      await apiClient.createOpportunity({
        ...formData,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      });
      setShowCreateModal(false);
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

        {user?.role === 'Sales Owner' && (
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
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-presales-border">
              <th className="text-left py-3 px-4 font-semibold text-presales-text">ID</th>
              <th className="text-left py-3 px-4 font-semibold text-presales-text">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-presales-text">Customer</th>
              <th className="text-left py-3 px-4 font-semibold text-presales-text">Industry</th>
              <th className="text-left py-3 px-4 font-semibold text-presales-text">Stage</th>
              <th className="text-left py-3 px-4 font-semibold text-presales-text">Value</th>
              {user?.role === 'Presales Administrator' && (
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Status</th>
              )}
              <th className="text-center py-3 px-4 font-semibold text-presales-text">Actions</th>
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
                <tr key={opp.id} className="border-b border-presales-border hover:bg-presales-light-green">
                  <td className="py-3 px-4 text-presales-text text-sm font-medium">{opp.opportunity_id}</td>
                  <td className="py-3 px-4 text-presales-text font-medium">{opp.name}</td>
                  <td className="py-3 px-4 text-presales-text">{opp.customer}</td>
                  <td className="py-3 px-4 text-presales-text">{opp.industry}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-presales-light-green text-presales-dark-green rounded-full text-sm font-medium">
                      {opp.stage}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-presales-text">
                    {opp.estimated_value ? `$${(opp.estimated_value / 1000000).toFixed(1)}M` : '-'}
                  </td>
                  {user?.role === 'Presales Administrator' && (
                    <td className="py-3 px-4">
                      {opp.assigned_to_id ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <CheckCircle size={14} />
                          Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          Pending
                        </span>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/opportunities/${opp.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-presales-dark-green hover:bg-presales-light-green transition-all duration-200"
                      >
                        <Eye size={16} />
                        <span className="text-sm">View</span>
                      </Link>
                      {user?.role === 'Presales Administrator' && !opp.assigned_to_id && (
                        <button
                          onClick={() => {
                            // Open assignment modal - we'll add this functionality next
                            console.log('Assign opportunity:', opp.id);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-presales-dark-green hover:bg-presales-light-green transition-all duration-200"
                        >
                          <span className="text-sm">Assign</span>
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
