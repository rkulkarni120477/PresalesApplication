import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Clock, User, Activity } from 'lucide-react';

interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number;
  action: string;
  entity: string;
  entity_id: number;
  previous_value?: any;
  new_value?: any;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAuditLogs(0, 100);
      setLogs(data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600 bg-green-50';
      case 'update':
        return 'text-blue-600 bg-blue-50';
      case 'delete':
        return 'text-red-600 bg-red-50';
      case 'map_artifact':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-96">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-presales-text-secondary">
            No audit logs found
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map(log => (
              <div
                key={log.id}
                className="border border-presales-border rounded-lg p-4 hover:bg-presales-light-green transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                      <Activity size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-presales-text capitalize">
                          {log.action}
                        </span>
                        <span className="text-presales-text-secondary text-sm">
                          {log.entity}
                        </span>
                        <span className="text-presales-text-secondary text-sm">
                          #{log.entity_id}
                        </span>
                      </div>
                      <p className="text-sm text-presales-text-secondary mb-2">
                        {log.previous_value && log.new_value && (
                          <>
                            Changed from {JSON.stringify(log.previous_value).substring(0, 50)}... to {JSON.stringify(log.new_value).substring(0, 50)}...
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-presales-text-secondary">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          User #{log.user_id}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
