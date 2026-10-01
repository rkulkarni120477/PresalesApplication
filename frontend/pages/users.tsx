import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Mail, Calendar } from 'lucide-react';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: any;
  department: string;
  status: string;
  created_at: string;
  last_login: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'bg-red-100 text-red-800';
      case 'Presales Solution Owner':
        return 'bg-presales-light-green text-presales-dark-green';
      case 'Presales Solution Member':
        return 'bg-blue-100 text-blue-800';
      case 'Guest':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="card">
      {loading ? (
        <div className="flex items-center justify-center h-96">Loading users...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-presales-border">
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Department</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Created</th>
                <th className="text-left py-3 px-4 font-semibold text-presales-text">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-presales-border hover:bg-presales-light-green">
                  <td className="py-3 px-4 text-presales-text font-medium">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="py-3 px-4 text-presales-text flex items-center gap-2">
                    <Mail size={16} className="text-presales-text-secondary" />
                    {user.email}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role.name)}`}>
                      {user.role.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-presales-text">{user.department}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-presales-text-secondary text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-presales-text-secondary text-sm">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
