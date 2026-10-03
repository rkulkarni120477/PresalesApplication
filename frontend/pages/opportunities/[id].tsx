import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Edit, Trash2, Users, FileText, Download, Archive } from 'lucide-react';

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
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null);
  const [assignModalTitle, setAssignModalTitle] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [completionLoading, setCompletionLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    customer: '',
    industry: '',
    stage: '',
    priority: '',
  });

  useEffect(() => {
    if (id) {
      loadOpportunity();
    }
  }, [id]);

  useEffect(() => {
    if (id && opportunity) {
      apiClient.getOpportunityTeam(Number(id)).then(setTeam).catch((e) => console.error('Failed to load team:', e));
    }
  }, [id, opportunity]);

  useEffect(() => {
    if (id && user?.role === 'Presales Solution Owner' && opportunity) {
      apiClient
        .getOpportunityActivityLogs(Number(id))
        .then(setActivityLogs)
        .catch((e) => console.error('Failed to load activity logs:', e));
    }
  }, [id, user?.role, opportunity]);

  useEffect(() => {
    if (showAssignModal) {
      loadAssignableUsers();
    }
  }, [showAssignModal]);

  const loadAssignableUsers = async () => {
    try {
      const users = await apiClient.getUsers();

      // Load users based on current user's role
      if (user?.role === 'Presales Administrator') {
        const solutionOwners = users.filter((u: any) => u.role?.name === 'Presales Solution Owner');
        setAssignableUsers(solutionOwners);
        setAssignModalTitle('Assign to Presales Solution Owner');
      } else if (user?.role === 'Presales Solution Owner') {
        const solutionMembers = users.filter((u: any) => u.role?.name === 'Presales Solution Member');
        setAssignableUsers(solutionMembers);
        setAssignModalTitle('Add Presales Solution Member');
      } else if (user?.role === 'Sales Owner') {
        const admins = users.filter((u: any) => u.role?.name === 'Presales Administrator');
        setAssignableUsers(admins);
        setAssignModalTitle('Assign to Presales Administrator');
      }
    } catch (error) {
      console.error('Failed to load assignable users:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedAssigneeId || !opportunity) return;

    setAssignLoading(true);
    try {
      if (user?.role === 'Presales Solution Owner') {
        // Solution Owner adds collaborators (doesn't transfer assignment)
        await apiClient.addCollaborator(opportunity.id, selectedAssigneeId);
        console.log('Collaborator added successfully');
      } else {
        // Other roles assign the opportunity
        await apiClient.assignOpportunity(opportunity.id, selectedAssigneeId);
        console.log('Opportunity assigned successfully');
      }
      setShowAssignModal(false);
      setSelectedAssigneeId(null);
      await loadOpportunity();
    } catch (error: any) {
      console.error('Failed to assign/add:', error);
      setError('Failed to assign/add: ' + (error?.response?.data?.detail || error?.message));
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

  const handleArchive = async () => {
    if (!opportunity || !confirm('Are you sure you want to archive this opportunity?')) return;

    try {
      await apiClient.updateOpportunity(opportunity.id, { status: 'archived' });
      router.push('/opportunities');
    } catch (error) {
      console.error('Failed to archive opportunity:', error);
      setError('Failed to archive opportunity');
    }
  };

  const handleCompleteAssignment = async () => {
    if (!opportunity) return;

    const confirmMessage = user?.role === 'Presales Solution Member'
      ? 'Is everything uploaded from your side for this task?'
      : 'Are you sure you want to mark this assignment as complete?';

    if (!confirm(confirmMessage)) return;

    setCompletionLoading(true);
    try {
      await apiClient.completeOpportunity(opportunity.id);
      console.log('Opportunity marked as complete');
      router.push('/opportunities');
    } catch (error: any) {
      console.error('Failed to complete opportunity:', error);
      setError('Failed to complete opportunity: ' + (error?.response?.data?.detail || error?.message));
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!opportunity) return;

    setEditLoading(true);
    setFileError('');
    try {
      if (selectedFile) {
        // If a file is selected, use multipart form data
        console.log('Saving with file:', selectedFile.name, selectedFile.size);
        const formData = new FormData();
        formData.append('name', editFormData.name);
        formData.append('customer', editFormData.customer);
        formData.append('industry', editFormData.industry);
        formData.append('stage', editFormData.stage);
        formData.append('priority', editFormData.priority);
        formData.append('file', selectedFile);

        console.log('FormData prepared, sending to backend...');
        const result = await apiClient.updateOpportunityWithFile(opportunity.id, formData);
        console.log('Update successful:', result);
      } else {
        // No file, just update fields
        console.log('Saving without file');
        await apiClient.updateOpportunity(opportunity.id, editFormData);
      }
      setShowEditModal(false);
      setSelectedFile(null);
      console.log('Loading opportunity after save...');
      await loadOpportunity();
      console.log('Opportunity reloaded');
    } catch (error: any) {
      console.error('Failed to update opportunity:', error);
      console.error('Error response:', error?.response?.data);
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to update opportunity';
      setFileError(errorMsg);
      setError(errorMsg);
    } finally {
      setEditLoading(false);
    }
  };

  const loadOpportunity = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getOpportunity(Number(id));
      setOpportunity(data);
      setEditFormData({
        name: data.name || '',
        customer: data.customer || '',
        industry: data.industry || '',
        stage: data.stage || '',
        priority: data.priority || '',
      });
      console.log('Opportunity loaded, loading artifacts...');
      // Make sure to await artifacts loading
      await loadArtifacts(data.id);
      console.log('Artifacts loaded successfully');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to load opportunity';
      setError(errorMsg);
      console.error('Failed to load opportunity:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadArtifacts = async (opportunityId: number) => {
    try {
      setArtifactsLoading(true);
      console.log('Loading artifacts for opportunity:', opportunityId);
      // Clear artifacts first to force a fresh load
      setArtifacts([]);
      const data = await apiClient.getOpportunityArtifacts(opportunityId);
      console.log('Artifacts loaded:', data);
      console.log('Number of artifacts:', data?.length || 0);
      setArtifacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
      setArtifacts([]);
    } finally {
      setArtifactsLoading(false);
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
          {/* Assign buttons */}
          {user?.role === 'Sales Owner' && !opportunity?.assigned_to_id && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-presales-dark-green text-white border border-presales-dark-green rounded-lg hover:bg-presales-medium-green transition-all duration-200"
              title="Assign this opportunity to a Presales Administrator"
            >
              <Users size={16} />
              Assign to Admin
            </button>
          )}
          {user?.role === 'Presales Administrator' && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-presales-dark-green text-white border border-presales-dark-green rounded-lg hover:bg-presales-medium-green transition-all duration-200"
              title="Assign this opportunity to a Presales Solution Owner"
            >
              <Users size={16} />
              Assign to Solution Owner
            </button>
          )}
          {user?.role === 'Presales Solution Owner' && opportunity?.assigned_to_id === user?.id && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-presales-dark-green text-white border border-presales-dark-green rounded-lg hover:bg-presales-medium-green transition-all duration-200"
              title="Add a Presales Solution Member to this opportunity"
            >
              <Users size={16} />
              Add Presales Solution Member
            </button>
          )}

          {/* Edit button - available to Sales Owner, Solution Owner, and Solution Member */}
          {(user?.role === 'Sales Owner' || user?.role === 'Presales Solution Owner' || user?.role === 'Presales Solution Member') && (
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-presales-dark-green border border-presales-border rounded-lg hover:bg-presales-light-green transition-all duration-200"
            >
              <Edit size={16} />
              Edit
            </button>
          )}

          {/* Archive button - only for Solution Owner and Presales Administrator */}
          {(user?.role === 'Presales Solution Owner' || user?.role === 'Presales Administrator') && (
            <button
              onClick={handleArchive}
              className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all duration-200"
            >
              <Archive size={16} />
              Archive
            </button>
          )}

          {/* Delete button - only for Sales Owner */}
          {user?.role === 'Sales Owner' && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-200"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}

          {/* Complete button - available to Solution Owner and Solution Member */}
          {(user?.role === 'Presales Solution Owner' || user?.role === 'Presales Solution Member') && (
            <button
              onClick={handleCompleteAssignment}
              disabled={completionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white border border-green-600 rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Users size={16} />
              {completionLoading
                ? (user?.role === 'Presales Solution Member' ? 'Completing Task...' : 'Completing Assignment...')
                : (user?.role === 'Presales Solution Member' ? 'Complete Task' : 'Complete Assignment')}
            </button>
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
                {opportunity.estimated_value ?
                  (opportunity.estimated_value >= 1000000
                    ? `$${(opportunity.estimated_value / 1000000).toFixed(1)}M`
                    : `$${opportunity.estimated_value.toLocaleString()}`)
                  : 'N/A'}
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

      <div className="card">
        <h2 className="text-xl font-bold text-presales-text mb-4">👥 Team Involved</h2>
        {team.length === 0 ? (
          <p className="text-presales-text-secondary text-sm">No team members yet.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-presales-text-secondary border-b">
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Member Name</th>
                <th className="py-2">Member Email</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4">{m.role}</td>
                  <td className="py-2 pr-4">{m.name}</td>
                  <td className="py-2">{m.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {user?.role === 'Presales Solution Owner' && (
        <div className="card">
          <h2 className="text-xl font-bold text-presales-text mb-4">🕒 Activity Log</h2>
          {activityLogs.length === 0 ? (
            <p className="text-presales-text-secondary text-sm">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activityLogs.map((log) => (
                <li key={log.id} className="p-3 bg-presales-page-bg rounded-lg">
                  <p className="text-presales-text">{log.message}</p>
                  <p className="text-xs text-presales-text-secondary mt-1">
                    {log.user_name} ({log.role}) · {new Date(log.timestamp + 'Z').toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Attachments Section */}
      <div className="card">
        <h2 className="text-xl font-bold text-presales-text mb-4">📎 Attachments</h2>
        {artifactsLoading ? (
          <p className="text-presales-text-secondary">Loading attachments...</p>
        ) : artifacts && artifacts.length > 0 ? (
          <div className="space-y-2">
            {artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="flex items-center justify-between p-3 border border-presales-border rounded-lg hover:bg-presales-page-bg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-presales-dark-green" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-presales-text">{artifact.name}</p>
                    <p className="text-xs text-presales-text-secondary">
                      {artifact.artifact_type} • {new Date(artifact.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Download the file if source_reference is available
                    if (artifact.source_reference) {
                      const link = document.createElement('a');
                      link.href = artifact.source_reference;
                      link.download = artifact.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1 text-presales-dark-green hover:bg-presales-light-green rounded-lg transition-colors"
                  title="Download"
                >
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-presales-text-secondary">No attachments uploaded</p>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-presales-text mb-6">Edit Opportunity</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Opportunity Name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="col-span-2 border border-presales-border rounded-lg px-4 py-2"
                />
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={editFormData.customer}
                  onChange={(e) => setEditFormData({ ...editFormData, customer: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                />
                <input
                  type="text"
                  placeholder="Industry"
                  value={editFormData.industry}
                  onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                />
                <select
                  value={editFormData.stage}
                  onChange={(e) => setEditFormData({ ...editFormData, stage: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                >
                  <option value="">Select Stage</option>
                  <option value="Discovery">Discovery</option>
                  <option value="Qualification">Qualification</option>
                  <option value="Solutioning">Solutioning</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
                <select
                  value={editFormData.priority}
                  onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                  className="border border-presales-border rounded-lg px-4 py-2"
                >
                  <option value="">Select Priority</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="mt-6 p-4 border-2 border-dashed border-presales-border rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <FileText size={20} className="text-presales-dark-green" />
                  <span className="text-sm font-medium text-presales-text">
                    {selectedFile ? selectedFile.name : 'Upload Additional Attachment (Optional)'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Validate file type
                      const supportedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.csv', '.zip', '.md'];
                      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

                      if (!supportedExtensions.includes(fileExtension)) {
                        setFileError(`Unsupported file type: ${fileExtension}. Supported types: ${supportedExtensions.join(', ')}`);
                        return;
                      }

                      // Validate file size
                      if (file.size > 100 * 1024 * 1024) {
                        setFileError('File size must be less than 100 MB');
                        return;
                      }

                      setFileError('');
                      setSelectedFile(file);
                    }}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt,.csv,.zip,.md"
                  />
                </label>
                {fileError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {fileError}
                  </div>
                )}
                {selectedFile && !fileError && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-presales-text-secondary">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileError('');
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p className="text-xs text-presales-text-secondary mt-2">
                  Supported: PDF, DOCX, DOC, TXT, CSV, ZIP, MD (Max 100 MB)
                </p>
              </div>

              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedFile(null);
                    setFileError('');
                  }}
                  disabled={editLoading}
                  className="px-6 py-2 border border-presales-border rounded-lg hover:bg-presales-page-bg transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2 bg-presales-dark-green text-white rounded-lg hover:bg-presales-medium-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
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
            <h3 className="text-2xl font-bold text-presales-text mb-6">{assignModalTitle}</h3>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-presales-text mb-2">
                Select User
              </label>
              <select
                value={selectedAssigneeId || ''}
                onChange={(e) => setSelectedAssigneeId(Number(e.target.value))}
                className="w-full border border-presales-border rounded-lg px-4 py-2 text-presales-text"
              >
                <option value="">-- Choose a User --</option>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAssigneeId(null);
                }}
                disabled={assignLoading}
                className="px-6 py-2 border border-presales-border rounded-lg hover:bg-presales-page-bg transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedAssigneeId || assignLoading}
                className="px-6 py-2 bg-presales-dark-green text-white rounded-lg hover:bg-presales-medium-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assignLoading
                  ? (user?.role === 'Presales Solution Owner' ? 'Adding...' : 'Assigning...')
                  : (user?.role === 'Presales Solution Owner' ? 'Add' : 'Assign')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
