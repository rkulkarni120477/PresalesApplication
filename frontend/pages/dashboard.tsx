import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Briefcase, Package, RefreshCw, TrendingUp } from 'lucide-react';

interface Opportunity {
  id: number;
  name: string;
  customer: string;
  stage: string;
  estimated_value?: number;
  probability?: number;
  assigned_to_id?: number | null;
  assigned_to_name?: string;
}

interface Artifact {
  id: number;
  name?: string;
  title?: string;
  artifact_type?: string;
  status?: string;
  summary?: string;
  created_at?: string;
}

interface DashboardData {
  opportunities: Opportunity[];
  artifacts: Artifact[];
}

const stages = ['Discovery', 'Qualification', 'Solutioning', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [opportunities, artifacts] = await Promise.all([
        apiClient.getOpportunities(0, 100),
        apiClient.getArtifacts(0, 100),
      ]);
      setData({ opportunities, artifacts });
    } catch (loadError) {
      console.error('Failed to load dashboard data:', loadError);
      setError('Dashboard data could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const metrics = useMemo(() => {
    const opportunities = data?.opportunities || [];
    const closedWon = opportunities.filter((opportunity) => opportunity.stage === 'Closed Won').length;
    const closedLost = opportunities.filter((opportunity) => opportunity.stage === 'Closed Lost').length;
    const closedCount = closedWon + closedLost;
    const pipelineValue = opportunities
      .filter((opportunity) => opportunity.stage !== 'Closed Won' && opportunity.stage !== 'Closed Lost')
      .reduce((total, opportunity) => total + (Number(opportunity.estimated_value) || 0), 0);
    const activeCount = opportunities.filter(
      (opportunity) => opportunity.stage !== 'Closed Won' && opportunity.stage !== 'Closed Lost'
    ).length;
    const stageData = stages.map((stage) => ({
      stage,
      count: opportunities.filter((opportunity) => opportunity.stage === stage).length,
    }));

    return {
      activeCount,
      closedCount,
      closedWon,
      pipelineValue,
      stageData,
      winRate: closedCount ? Math.round((closedWon / closedCount) * 100) : null,
      unassigned: opportunities.filter((opportunity) => !opportunity.assigned_to_id).slice(0, 3),
    };
  }, [data]);

  const latestArtifact = data?.artifacts[0];
  const pipelineLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(metrics.pipelineValue);

  if (loading) {
    return (
      <div className="space-y-6" aria-label="Loading dashboard">
        <div className="h-24 animate-pulse rounded-3xl bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="h-80 animate-pulse rounded-3xl bg-white xl:col-span-2" />
          <div className="h-80 animate-pulse rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-red-700">{error || 'Dashboard data is unavailable.'}</p>
        <button
          type="button"
          onClick={loadDashboardData}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-presales-dark-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  const formatValue = (value?: number) => value
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    : 'Not set';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Overview</p>
          <h1 className="text-3xl font-bold tracking-tight text-presales-text sm:text-4xl">
            Good to see you, {user?.first_name || 'there'}
          </h1>
          <p className="mt-2 text-presales-text-secondary">
            Here&apos;s the latest across your opportunities and presales resources.
          </p>
        </div>
        <Link
          href="/opportunities"
          className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-presales-dark-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:self-auto"
        >
          View opportunities
          <ArrowRight size={17} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Briefcase}
          label="Open pipeline"
          value={pipelineLabel}
          caption="Open opportunities in your view"
          tone="blue"
        />
        <MetricCard
          icon={TrendingUp}
          label="Active opportunities"
          value={String(metrics.activeCount)}
          caption="Not yet closed"
          tone="violet"
        />
        <MetricCard
          icon={TrendingUp}
          label="Win rate"
          value={metrics.winRate === null ? '—' : `${metrics.winRate}%`}
          caption={metrics.closedCount ? `${metrics.closedWon} won of ${metrics.closedCount} closed` : 'No closed opportunities yet'}
          tone="green"
        />
        <MetricCard
          icon={Package}
          label="Published artifacts"
          value={String(data.artifacts.filter((artifact) => artifact.status === 'active').length)}
          caption="Active presales resources"
          tone="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-presales-text">Opportunity pipeline</h2>
              <p className="mt-1 text-sm text-presales-text-secondary">Current opportunities by sales stage</p>
            </div>
            <Link href="/opportunities" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
              View all
            </Link>
          </div>
          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.stageData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7EDF6" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#6B7280' }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Opportunities"
                  stroke="#2D66E8"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  dot={{ r: 4, fill: '#2D66E8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-sm">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[28px] border-white/10" />
          <div className="relative flex h-full min-h-[310px] flex-col">
            <div className="mb-8 flex items-center justify-between">
              <div className="rounded-2xl bg-white/15 p-3">
                <Package size={22} />
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Knowledge loop</span>
            </div>
            <p className="text-sm font-medium text-blue-100">Latest resource</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight">
              {latestArtifact?.name || latestArtifact?.title || 'Build your resource library'}
            </h2>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-blue-100">
              {latestArtifact?.summary || (latestArtifact
                ? `${latestArtifact.artifact_type || 'Presales resource'} added to the library.`
                : 'Approved artifacts and reusable knowledge will appear here as they are added.')}
            </p>
            <Link href="/artifacts" className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold hover:text-blue-100">
              Explore artifacts
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-presales-text">Needs assignment</h2>
            <p className="mt-1 text-sm text-presales-text-secondary">Opportunities without a solution owner</p>
          </div>
          {metrics.unassigned.length ? (
            <div className="space-y-3">
              {metrics.unassigned.map((opportunity) => (
                <Link
                  key={opportunity.id}
                  href={`/opportunities/${opportunity.id}`}
                  className="block rounded-2xl border border-presales-border p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-presales-text">{opportunity.name}</p>
                      <p className="mt-1 text-sm text-presales-text-secondary">{opportunity.customer}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {opportunity.stage}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-blue-50/70 p-5 text-sm text-presales-text-secondary">
              No unassigned opportunities in the current view.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-presales-text">Pipeline by stage</h2>
            <p className="mt-1 text-sm text-presales-text-secondary">Live count from accessible opportunities</p>
          </div>
          <div className="h-[255px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.stageData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7EDF6" />
                <XAxis dataKey="stage" hide />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip />
                <Bar dataKey="count" name="Opportunities" fill="#4C8BF5" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {metrics.stageData.filter((stage) => stage.count > 0).slice(0, 4).map((stage) => (
              <span key={stage.stage} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
                {stage.stage}: {stage.count}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-presales-text">Opportunity details</h2>
              <p className="mt-1 text-sm text-presales-text-secondary">Recent activity in your pipeline</p>
            </div>
            <Briefcase size={20} className="text-blue-600" />
          </div>
          {data.opportunities.slice(0, 3).map((opportunity) => (
            <Link
              key={opportunity.id}
              href={`/opportunities/${opportunity.id}`}
              className="flex items-center justify-between gap-3 border-b border-gray-100 py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-presales-text">{opportunity.name}</p>
                <p className="mt-1 text-xs text-presales-text-secondary">{opportunity.customer}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-presales-text">{formatValue(opportunity.estimated_value)}</p>
                <p className="mt-1 text-xs text-blue-700">{opportunity.probability ? `${Math.round(opportunity.probability * 100)}% probability` : opportunity.stage}</p>
              </div>
            </Link>
          ))}
          {!data.opportunities.length && (
            <p className="rounded-2xl bg-blue-50/70 p-5 text-sm text-presales-text-secondary">
              No opportunities are available in your current view.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  caption: string;
  tone: 'blue' | 'violet' | 'green' | 'amber';
}

function MetricCard({ icon: Icon, label, value, caption, tone }: MetricCardProps) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-presales-text-secondary">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-presales-text">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-3 text-xs text-presales-text-secondary">{caption}</p>
    </div>
  );
}
