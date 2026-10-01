import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const [aiHealth, setAiHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const health = await apiClient.getAIHealth();
      setAiHealth(health);
    } catch (error) {
      console.error('Failed to check AI health:', error);
      setShowNotification({
        type: 'error',
        message: 'Failed to check AI service health',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {showNotification && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            showNotification.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {showNotification.type === 'success' ? (
            <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <p
            className={`text-sm ${
              showNotification.type === 'success'
                ? 'text-green-700'
                : 'text-red-700'
            }`}
          >
            {showNotification.message}
          </p>
        </div>
      )}

      {/* AI Service Health */}
      <div className="card">
        <h3 className="text-2xl font-bold text-presales-text mb-6">AI Service Configuration</h3>

        {loading ? (
          <div className="flex items-center justify-center h-48">Loading...</div>
        ) : aiHealth ? (
          <div className="space-y-4">
            <div className="p-4 bg-presales-light-green border border-presales-border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-presales-text-secondary">Bedrock Configuration</p>
                  <p className="text-lg font-bold text-presales-dark-green">
                    {aiHealth.bedrock_configured ? 'Configured' : 'Not Configured'}
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full ${aiHealth.bedrock_configured ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-presales-border rounded-lg">
                <p className="text-sm font-medium text-presales-text-secondary mb-1">AWS Region</p>
                <p className="text-lg font-bold text-presales-text">{aiHealth.aws_region}</p>
              </div>

              <div className="p-4 border border-presales-border rounded-lg">
                <p className="text-sm font-medium text-presales-text-secondary mb-1">Configured Model</p>
                <p className="text-lg font-bold text-presales-text text-sm truncate" title={aiHealth.configured_model}>
                  {aiHealth.configured_model}
                </p>
              </div>

              <div className="p-4 col-span-2 border border-presales-border rounded-lg">
                <p className="text-sm font-medium text-presales-text-secondary mb-1">Connectivity Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    aiHealth.connectivity_status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <p className="text-lg font-bold text-presales-text capitalize">
                    {aiHealth.connectivity_status}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={checkHealth}
              className="w-full bg-presales-dark-green text-white py-2 rounded-lg font-medium hover:bg-presales-medium-green transition-all duration-200"
            >
              Refresh Status
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-presales-text-secondary">
            Failed to load AI service health
          </div>
        )}
      </div>

      {/* Application Information */}
      <div className="card">
        <h3 className="text-2xl font-bold text-presales-text mb-6">Application Information</h3>

        <div className="space-y-4">
          <div className="p-4 border border-presales-border rounded-lg">
            <p className="text-sm font-medium text-presales-text-secondary mb-1">Application Name</p>
            <p className="text-lg font-bold text-presales-text">Presales Opportunity & Artifact Management Platform</p>
          </div>

          <div className="p-4 border border-presales-border rounded-lg">
            <p className="text-sm font-medium text-presales-text-secondary mb-1">Version</p>
            <p className="text-lg font-bold text-presales-text">1.0.0</p>
          </div>

          <div className="p-4 border border-presales-border rounded-lg">
            <p className="text-sm font-medium text-presales-text-secondary mb-1">API Endpoint</p>
            <p className="text-lg font-bold text-presales-text text-sm truncate">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
            </p>
          </div>

          <div className="p-4 border border-presales-border rounded-lg">
            <p className="text-sm font-medium text-presales-text-secondary mb-1">Features</p>
            <ul className="space-y-1 text-presales-text">
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>Opportunity Management</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>Artifact Management</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>Role-Based Access Control</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>AI-Powered Recommendations</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>Audit Logging</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
