import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Edit, Trash2, Users } from 'lucide-react';

interface Opportunity {
  id: number;
  opportunity_id: string;
  name: string;
  customer: string;
  industry: string;
  region: string;
  description: string;
  business_problem: string;
  requirements: string;
  proposed_solution: string;
  estimated_value: number;
  currency: string;
  stage: string;
  probability: number;
  priority: string;
  owner_id: number;
  assigned_to_id: number;
  team: string;
  target_close_date: string;
  status: string;
  technologies: string[];
  risks: string;
  assumptions: string;
  source_type: string;
  source_reference: string;
  created_at: string;
  updated_at: string;
}

export default function OpportunityDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthStore();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [presalesAdmins, setPresalesAdmins] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      loadOpportunity();
    }
  }, [id]);

  useEffect(() => {
    if (showAssignModal) {
      loadPresalesAdmins();
    }
  }, [showAssignModal]);

  const loadPresalesAdmins = async () => {
    try {
      const users = await apiClient.getUsers();
      const admins = users.filter((u: any) => u.role?.name === 'Presales Administrator');
      setPresalesAdmins(admins);
    } catch (error) {
      console.error('Failed to load Presales Administrators:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedAdminId || !opportunity) return;

    setAssignLoading(true);
    try {
      await apiClient.assignOpportunity(opportunity.id, selectedAdminId);
      setShowAssignModal(false);
      setSelectedAdminId(null);
      await loadOpportunity();
    } catch (error) {
      console.error('Failed to assign opportunity:', error);
      setError('Failed to assign opportunity');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunity || !confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      await apiClient.deleteOpportunity(opportunity.id);
      router.push('/opportunities');
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
      setError('Failed to delete opportunity');
    }
  };

  const loadOpportunity = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getOpportunity(Number(id));
      setOpportunity(data);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to load opportunity';
      setError(errorMsg);
      console.error('Failed to load opportunity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-presales-text-secondary">Loading opportunity details...</div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="space-y-6">
        <Link href="/opportunities" className="inline-flex items-center gap-2 text-presales-dark-green hover:underline">
          <ArrowLeft size={20} />
          Back to Opportunities
        </Link>
        <div className="card bg-red-50 border border-red-200">
          <p className="text-red-700">{error || 'Opportunity not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/opportunities" className="inline-flex items-center gap-2 text-presales-dark-green hover:underline">
          <ArrowLeft size={20} />
          Back to Opportunities
        </Link>
        <div className="flex items-center gap-2">
          {user?.role === 'Sales Owner' && (
            <>
              {!opportunity?.assigned_to_id && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-presales-dark-green text-white border border-presales-dark-green rounded-lg hover:bg-presales-medium-green transition-all duration-200"
                >
                  <Users size={16} />
                  Assign to Admin
                </button>
              )}
              <button className="inline-flex items-center gap-2 px-4 py-2 text-presales-dark-green border border-presales-border rounded-lg hover:bg-presales-light-green transition-all duration-200">
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-200"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Details */}
      <div className="card space-y-6">
        <div className="border-b border-presales-border pb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-presales-text-secondary mb-2">{opportunity.opportunity_id}</p>
              <h1 className="text-3xl font-bold text-presales-text mb-4">{opportunity.name}</h1>
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <p className="text-sm text-presales-text-secondary">Customer</p>
                  <p className="text-lg font-medium text-presales-text">{opportunity.customer}</p>
                </div>
                <div>
                  <p className="text-sm text-presales-text-secondary">Industry</p>
                  <p className="text-lg font-medium text-presales-text">{opportunity.industry}</p>
                </div>
                <div>
                  <p className="text-sm text-presales-text-secondary">Region</p>
                  <p className="text-lg font-medium text-presales-text">{opportunity.region}</p>
                </div>
                <div>
                  <p className="text-sm text-presales-text-secondary">Stage</p>
                  <span className="px-3 py-1 bg-presales-light-green text-presales-dark-green rounded-full text-sm font-medium">
                    {opportunity.stage}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-presales-text-secondary mb-2">Estimated Value</p>
              <p className="text-3xl font-bold text-presales-dark-green">
                {opportunity.estimated_value ? `${opportunity.currency} ${(opportunity.estimated_value / 1000000).toFixed(1)}M` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-presales-page-bg rounded-lg">
            <p className="text-xs text-presales-text-secondary uppercase mb-1">Probability</p>
            <p className="text-2xl font-bold text-presales-text">{opportunity.probability ? `${(opportunity.probability * 100).toFixed(0)}%` : 'N/A'}</p>
          </div>
          <div className="p-4 bg-presales-page-bg rounded-lg">
            <p className="text-xs text-presales-text-secondary uppercase mb-1">Priority</p>
            <p className="text-lg font-bold text-presales-text">{opportunity.priority}</p>
          </div>
          <div className="p-4 bg-presales-page-bg rounded-lg">
            <p className="text-xs text-presales-text-secondary uppercase mb-1">Status</p>
            <p className="text-lg font-bold text-presales-text capitalize">{opportunity.status}</p>
          </div>
          <div className="p-4 bg-presales-page-bg rounded-lg">
            <p className="text-xs text-presales-text-secondary uppercase mb-1">Team</p>
            <p className="text-lg font-bold text-presales-text">{opportunity.team || 'N/A'}</p>
          </div>
        </div>

        {/* Description Section */}
        {opportunity.description && (
          <div>
            <h2 className="text-xl font-bold text-presales-text mb-3">Overview</h2>
            <p className="text-presales-text-secondary whitespace-pre-wrap">{opportunity.description}</p>
          </div>
        )}

        {/* Business Problem */}
        {opportunity.business_problem && (
          <div>
            <h2 className="text-xl font-bold text-presales-text mb-3">Business Problem</h2>
            <p className="text-presales-text-secondary whitespace-pre-wrap">{opportunity.business_problem}</p>
          </div>
        )}

        {/* Requirements */}
        {opportunity.requirements && (
          <div>
            <h2 className="text-xl font-bold text-presales-text mb-3">Requirements</h2>
            <p className="text-presales-text-secondary whitespace-pre-wrap">{opportunity.requirements}</p>
          </div>
        )}

        {/* Proposed Solution */}
        {opportunity.proposed_solution && (
          <div>
            <h2 className="text-xl font-bold text-presales-text mb-3">Proposed Solution</h2>
            <p className="text-presales-text-secondary whitespace-pre-wrap">{opportunity.proposed_solution}</p>
          </div>
        )}

        {/* Risk & Assumptions */}
        <div className="grid grid-cols-2 gap-6">
          {opportunity.risks && (
            <div>
              <h2 className="text-lg font-bold text-presales-text mb-3">Risks</h2>
              <p className="text-presales-text-secondary whitespace-pre-wrap">{opportunity.risks}</p>
            </div>
          )}
          {opportunity.assumptions && (
            <div>
              <h2 className="text-lg font-bold text-presales-text mb-3">Assumptions</h2>
              <p className="text-presales-text-secondary whitespace-pre-wrap">{opportunity.assumptions}</p>
            </div>
          )}
        </div>

        {/* Technologies */}
        {opportunity.technologies && opportunity.technologies.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-presales-text mb-3">Technologies</h2>
            <div className="flex flex-wrap gap-2">
              {opportunity.technologies.map((tech, idx) => (
                <span key={idx} className="px-3 py-1 bg-presales-light-green text-presales-dark-green rounded-full text-sm">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-presales-border">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-presales-text-secondary">Created</p>
              <p className="text-presales-text">{new Date(opportunity.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-presales-text-secondary">Last Updated</p>
              <p className="text-presales-text">{new Date(opportunity.updated_at).toLocaleDateString()}</p>
            </div>
            {opportunity.target_close_date && (
              <div>
                <p className="text-presales-text-secondary">Target Close Date</p>
                <p className="text-presales-text">{new Date(opportunity.target_close_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-2xl font-bold text-presales-text mb-6">Assign to Presales Administrator</h3>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-presales-text mb-2">
                Select Administrator
              </label>
              <select
                value={selectedAdminId || ''}
                onChange={(e) => setSelectedAdminId(Number(e.target.value))}
                className="w-full border border-presales-border rounded-lg px-4 py-2 text-presales-text"
              >
                <option value="">-- Choose an Administrator --</option>
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
    </div>
  );
}
