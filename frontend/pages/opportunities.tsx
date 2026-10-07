import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Plus, Search, Filter, Eye, CheckCircle, Trash2, Upload, LayoutGrid, List } from 'lucide-react';

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
  target_close_date?: string;
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [allOpportunities, setAllOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [industry, setIndustry] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
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

  const loadOpportunities = useCallback(async () => {
    setLoadError('');
    try {
      setLoading(true);
      const filters = {
        search: search || undefined,
        stage: stage || undefined,
        user_id: user?.id,
      };
      const data = await apiClient.getOpportunities(0, 100, filters);
      setAllOpportunities(data);
      const myWork = router.query.scope === 'my-work';
      const scopedOpportunities = myWork
        ? data.filter((opportunity: Opportunity) => opportunity.owner_id === user?.id || opportunity.assigned_to_id === user?.id)
        : data;
      setOpportunities(industry
        ? scopedOpportunities.filter((opportunity: Opportunity) => opportunity.industry === industry)
        : scopedOpportunities);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
      setLoadError('Opportunities could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [search, stage, industry, user?.id, router.query.scope]);

  useEffect(() => {
    if (router.isReady) void loadOpportunities();
  }, [router.isReady, loadOpportunities]);

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
  const industries = useMemo(
    () => Array.from(new Set(allOpportunities.map((opportunity) => opportunity.industry).filter(Boolean))).sort(),
    [allOpportunities]
  );
  const pipelineValue = opportunities
    .filter((opportunity) => opportunity.stage !== 'Closed Won' && opportunity.stage !== 'Closed Lost')
    .reduce((total, opportunity) => total + (Number(opportunity.estimated_value) || 0), 0);
  const activeCount = opportunities.filter(
    (opportunity) => opportunity.stage !== 'Closed Won' && opportunity.stage !== 'Closed Lost'
  ).length;
  const inReviewCount = opportunities.filter((opportunity) => opportunity.stage === 'Proposal').length;
  const wonCount = opportunities.filter((opportunity) => opportunity.stage === 'Closed Won').length;
  const formatPipelineValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(pipelineValue);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Workspace / {router.query.scope === 'my-work' ? 'My Work' : 'Pipeline'}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-presales-text sm:text-4xl">
            {router.query.scope === 'my-work' ? 'My Work' : 'Opportunities'}
          </h1>
          <p className="mt-2 text-presales-text-secondary">
            {loading ? 'Updating your opportunity list...' : `${opportunities.length} opportunities in your current view`}
          </p>
        </div>
        {user?.role === 'Presales Administrator' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-presales-dark-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:self-auto"
          >
            <Plus size={18} />
            New Opportunity
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-presales-text-secondary">Pipeline value</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-presales-text">{formatPipelineValue}</p>
          <p className="mt-2 text-xs text-presales-text-secondary">Excludes closed opportunities</p>
        </div>
        <div className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-presales-text-secondary">Active opportunities</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-presales-text">{activeCount}</p>
          <p className="mt-2 text-xs text-presales-text-secondary">Open across all stages</p>
        </div>
        <div className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-presales-text-secondary">In proposal</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-presales-text">{inReviewCount}</p>
          <p className="mt-2 text-xs text-presales-text-secondary">Awaiting customer decision</p>
        </div>
        <div className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-presales-text-secondary">Closed won</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-presales-text">{wonCount}</p>
          <p className="mt-2 text-xs text-presales-text-secondary">In the current opportunity view</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-presales-border bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-presales-text-secondary" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-full border border-presales-border bg-gray-50 py-3 pl-11 pr-4 text-sm text-presales-text outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-2 text-sm text-presales-text-secondary">
            <Filter size={17} />
            Filters
          </div>
          <select
            aria-label="Filter by industry"
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            className="rounded-full border border-presales-border bg-white px-4 py-3 text-sm text-presales-text outline-none focus:border-blue-300"
          >
            <option value="">All industries</option>
            {industries.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select
            aria-label="Filter by stage"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            className="rounded-full border border-presales-border bg-white px-4 py-3 text-sm text-presales-text outline-none focus:border-blue-300"
          >
            <option value="">All stages</option>
            {stages.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-presales-border bg-gray-50 p-1 lg:ml-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            className={`rounded-full p-2.5 ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-presales-text-secondary'}`}
          >
            <List size={18} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('board')}
            aria-label="Board view"
            aria-pressed={viewMode === 'board'}
            className={`rounded-full p-2.5 ${viewMode === 'board' ? 'bg-white text-blue-700 shadow-sm' : 'text-presales-text-secondary'}`}
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>
      {loadError && (
        <div role="alert" className="flex flex-col justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <span>{loadError}</span>
          <button type="button" onClick={() => void loadOpportunities()} className="w-fit font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

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

      {viewMode === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-3">
          {stages.map((columnStage) => {
            const stageOpportunities = opportunities.filter((opportunity) => opportunity.stage === columnStage);
            return (
              <section key={columnStage} className="w-[260px] shrink-0 rounded-3xl border border-presales-border bg-blue-50/50 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-presales-text">{columnStage}</h2>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-presales-text-secondary">
                    {stageOpportunities.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {stageOpportunities.map((opportunity) => (
                    <Link
                      key={opportunity.id}
                      href={`/opportunities/${opportunity.id}`}
                      className="block rounded-2xl border border-presales-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {opportunity.opportunity_id}
                      </p>
                      <h3 className="mt-2 font-semibold text-presales-text">{opportunity.name}</h3>
                      <p className="mt-1 text-sm text-presales-text-secondary">{opportunity.customer}</p>
                      <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-presales-text-secondary">
                          {opportunity.assigned_to_name || opportunity.owner_name || 'Unassigned'}
                        </span>
                        <span className="font-semibold text-presales-text">
                          {opportunity.estimated_value ? `$${(opportunity.estimated_value / 1000000).toFixed(1)}M` : '—'}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {!loading && !stageOpportunities.length && (
                    <p className="rounded-2xl border border-dashed border-blue-200 bg-white/70 p-4 text-center text-xs text-presales-text-secondary">
                      No opportunities
                    </p>
                  )}
                  {loading && <div className="h-24 animate-pulse rounded-2xl bg-white" />}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-presales-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-presales-border bg-gray-50/80">
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-presales-text-secondary">ID</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-presales-text-secondary">Opportunity</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-presales-text-secondary">Customer</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-presales-text-secondary">Industry</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-presales-text-secondary">Stage</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-presales-text-secondary">Value</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-presales-text-secondary">Current Owner</th>
                  {user?.role === 'Presales Administrator' && (
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-presales-text-secondary">Status</th>
                  )}
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-presales-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={user?.role === 'Presales Administrator' ? 9 : 8} className="py-12 text-center text-sm text-presales-text-secondary">
                      Loading opportunities...
                    </td>
                  </tr>
                ) : opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'Presales Administrator' ? 9 : 8} className="py-12 text-center text-sm text-presales-text-secondary">
                      No opportunities match these filters.
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp) => (
                    <tr key={opp.id} className="border-b border-gray-100 text-sm last:border-0 hover:bg-blue-50/40">
                      <td className="px-4 py-4 font-medium text-presales-text-secondary">{opp.opportunity_id}</td>
                      <td className="px-4 py-4 font-semibold text-presales-text">{opp.name}</td>
                      <td className="px-4 py-4 text-presales-text">{opp.customer}</td>
                      <td className="px-4 py-4 text-presales-text-secondary">{opp.industry}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                          {opp.stage}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium text-presales-text">
                        {opp.estimated_value ? `$${(opp.estimated_value / 1000000).toFixed(1)}M` : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-presales-text">
                          {opp.assigned_to_name || opp.owner_name || 'Unassigned'}
                        </span>
                      </td>
                      {user?.role === 'Presales Administrator' && (
                        <td className="px-4 py-4">
                          {opp.assigned_to_id ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              <CheckCircle size={13} />
                              Assigned
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              Pending
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/opportunities/${opp.id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-blue-700 transition hover:bg-blue-50"
                            title="View opportunity"
                          >
                            <Eye size={17} />
                          </Link>
                          {user?.role === 'Presales Administrator' && !opp.assigned_to_id && (
                            <button
                              onClick={async () => {
                                setSelectedOpportunityId(opp.id);
                                setShowAssignModal(true);
                                await loadPresalesAdmins();
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-blue-700 transition hover:bg-blue-50"
                              title="Assign"
                            >
                              <span aria-hidden="true">📋</span>
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
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50"
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
      )}
    </div>
  );
}
