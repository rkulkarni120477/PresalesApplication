import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, Users, Target } from 'lucide-react';

interface DashboardData {
  totalOpportunities: number;
  activeOpportunities: number;
  totalArtifacts: number;
  publishedArtifacts: number;
  mappings: number;
  opportunities: any[];
  artifacts: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch smaller dataset for faster dashboard load (20 records instead of 100)
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Dashboard load timeout')), 15000) // 15 second timeout
      );

      const [oppsResponse, artsResponse] = await Promise.race([
        Promise.all([
          apiClient.getOpportunities(0, 20), // Reduced from 100 to 20
          apiClient.getArtifacts(0, 20), // Reduced from 100 to 20
        ]),
        timeoutPromise
      ]) as any;

      setData({
        totalOpportunities: oppsResponse.length,
        activeOpportunities: oppsResponse.filter((o: any) => o.stage !== 'Closed Lost').length,
        totalArtifacts: artsResponse.length,
        publishedArtifacts: artsResponse.filter((a: any) => a.status === 'active').length,
        mappings: 0,
        opportunities: oppsResponse,
        artifacts: artsResponse,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set empty data to stop loading spinner
      setData({
        totalOpportunities: 0,
        activeOpportunities: 0,
        totalArtifacts: 0,
        publishedArtifacts: 0,
        mappings: 0,
        opportunities: [],
        artifacts: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100"></div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card h-80 animate-pulse bg-gray-100"></div>
          ))}
        </div>
        <div className="card h-64 animate-pulse bg-gray-100"></div>
      </div>
    );
  }

  // Prepare chart data
  const stageData = [
    { stage: 'Discovery', count: data.opportunities.filter((o: any) => o.stage === 'Discovery').length },
    { stage: 'Qualification', count: data.opportunities.filter((o: any) => o.stage === 'Qualification').length },
    { stage: 'Solutioning', count: data.opportunities.filter((o: any) => o.stage === 'Solutioning').length },
    { stage: 'Proposal', count: data.opportunities.filter((o: any) => o.stage === 'Proposal').length },
    { stage: 'Negotiation', count: data.opportunities.filter((o: any) => o.stage === 'Negotiation').length },
    { stage: 'Closed Won', count: data.opportunities.filter((o: any) => o.stage === 'Closed Won').length },
    { stage: 'Closed Lost', count: data.opportunities.filter((o: any) => o.stage === 'Closed Lost').length },
  ];

  const typeData = Array.from(
    data.artifacts.reduce((map: Map<string, number>, art: any) => {
      const count = (map.get(art.artifact_type) || 0) + 1;
      map.set(art.artifact_type, count);
      return map;
    }, new Map())
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#0B5D3B', '#148A58', '#06452D', '#EAF6F0', '#DDE5E1'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Target}
          title="Total Opportunities"
          value={data.totalOpportunities}
          color="bg-presales-dark-green"
        />
        <KpiCard
          icon={TrendingUp}
          title="Active Opportunities"
          value={data.activeOpportunities}
          color="bg-presales-medium-green"
        />
        <KpiCard
          icon={Package}
          title="Total Artifacts"
          value={data.totalArtifacts}
          color="bg-presales-dark-green"
        />
        <KpiCard
          icon={Package}
          title="Published Artifacts"
          value={data.publishedArtifacts}
          color="bg-presales-medium-green"
        />
        <KpiCard
          icon={Users}
          title="Artifact Mappings"
          value={data.opportunities.reduce((sum: number, o: any) => sum + (o.artifacts?.length || 0), 0)}
          color="bg-presales-dark-green"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opportunities by Stage */}
        <div className="card">
          <h3 className="text-lg font-bold text-presales-text mb-4">Opportunities by Stage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE5E1" />
              <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0B5D3B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Artifacts by Type */}
        <div className="card">
          <h3 className="text-lg font-bold text-presales-text mb-4">Artifacts by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Opportunities */}
      <div className="card">
        <h3 className="text-lg font-bold text-presales-text mb-4">Recent Opportunities</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-presales-border">
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Stage</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Value</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Probability</th>
              </tr>
            </thead>
            <tbody>
              {data.opportunities.slice(0, 5).map((opp: any) => (
                <tr key={opp.id} className="border-b border-presales-border hover:bg-presales-light-green">
                  <td className="py-3 px-4 text-presales-text font-medium">{opp.name}</td>
                  <td className="py-3 px-4 text-presales-text">{opp.customer}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-presales-light-green text-presales-dark-green rounded-full text-sm font-medium">
                      {opp.stage}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-presales-text">
                    {opp.estimated_value ? `$${(opp.estimated_value / 1000000).toFixed(1)}M` : '-'}
                  </td>
                  <td className="py-3 px-4 text-presales-text">
                    {opp.probability ? `${(opp.probability * 100).toFixed(0)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  icon: any;
  title: string;
  value: number;
  color: string;
}

function KpiCard({ icon: Icon, title, value, color }: KpiCardProps) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`${color} p-3 rounded-lg`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-presales-text-secondary text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-presales-text">{value}</p>
      </div>
    </div>
  );
}
