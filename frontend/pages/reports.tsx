import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [oppsData, artsData] = await Promise.all([
        apiClient.getOpportunities(0, 100),
        apiClient.getArtifacts(0, 100),
      ]);
      setOpportunities(oppsData);
      setArtifacts(artsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading reports...</div>;
  }

  // Prepare data for charts
  const opportunitiesByStage = [
    { stage: 'Discovery', count: opportunities.filter((o: any) => o.stage === 'Discovery').length },
    { stage: 'Qualification', count: opportunities.filter((o: any) => o.stage === 'Qualification').length },
    { stage: 'Solutioning', count: opportunities.filter((o: any) => o.stage === 'Solutioning').length },
    { stage: 'Proposal', count: opportunities.filter((o: any) => o.stage === 'Proposal').length },
    { stage: 'Negotiation', count: opportunities.filter((o: any) => o.stage === 'Negotiation').length },
  ];

  const artifactsByType = Array.from(
    artifacts.reduce((map: Map<string, number>, art: any) => {
      const count = (map.get(art.artifact_type) || 0) + 1;
      map.set(art.artifact_type, count);
      return map;
    }, new Map())
  ).map(([name, value]) => ({ name, value }));

  const totalValue = opportunities.reduce((sum: number, o: any) => sum + (o.estimated_value || 0), 0);
  const avgProbability = opportunities.length > 0
    ? (opportunities.reduce((sum: number, o: any) => sum + (o.probability || 0), 0) / opportunities.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-presales-text-secondary text-sm font-medium mb-1">Total Pipeline Value</p>
          <p className="text-2xl font-bold text-presales-dark-green">
            ${(totalValue / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="card">
          <p className="text-presales-text-secondary text-sm font-medium mb-1">Average Probability</p>
          <p className="text-2xl font-bold text-presales-dark-green">
            {avgProbability.toFixed(0)}%
          </p>
        </div>
        <div className="card">
          <p className="text-presales-text-secondary text-sm font-medium mb-1">Total Opportunities</p>
          <p className="text-2xl font-bold text-presales-dark-green">
            {opportunities.length}
          </p>
        </div>
        <div className="card">
          <p className="text-presales-text-secondary text-sm font-medium mb-1">Total Artifacts</p>
          <p className="text-2xl font-bold text-presales-dark-green">
            {artifacts.length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-presales-text mb-4">Opportunities by Stage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={opportunitiesByStage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE5E1" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0B5D3B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-presales-text mb-4">Artifacts by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={artifactsByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE5E1" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#148A58" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Opportunity Statistics */}
      <div className="card">
        <h3 className="text-lg font-bold text-presales-text mb-4">Top Opportunities by Value</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-presales-border">
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Industry</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Value</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Probability</th>
              </tr>
            </thead>
            <tbody>
              {opportunities
                .sort((a: any, b: any) => (b.estimated_value || 0) - (a.estimated_value || 0))
                .slice(0, 10)
                .map((opp: any) => (
                  <tr key={opp.id} className="border-b border-presales-border hover:bg-presales-light-green">
                    <td className="py-3 px-4 text-presales-text font-medium">{opp.name}</td>
                    <td className="py-3 px-4 text-presales-text">{opp.industry}</td>
                    <td className="py-3 px-4 text-presales-text">
                      ${(opp.estimated_value / 1000000).toFixed(1)}M
                    </td>
                    <td className="py-3 px-4 text-presales-text">
                      {(opp.probability * 100).toFixed(0)}%
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
