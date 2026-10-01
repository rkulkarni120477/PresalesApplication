import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, setError, error, isLoading, setLoading } = useAuthStore();
  const [email, setEmail] = useState('priya.sharma@example.com');
  const [password, setPassword] = useState('Demo@123');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.login(email, password);
      login(
        {
          id: response.user_id,
          first_name: response.user_name.split(' ')[0],
          last_name: response.user_name.split(' ')[1] || '',
          email,
          role: response.role,
        },
        response.access_token
      );
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-presales-page-bg flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-presales-dark-green rounded-lg flex items-center justify-center font-bold text-white text-xl">
              PA
            </div>
            <h1 className="text-3xl font-bold text-presales-dark-green">Presales</h1>
          </div>
          <p className="text-presales-text-secondary">Opportunity & Artifact Management Platform</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-2xl font-bold text-presales-text mb-6">Sign In</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-presales-text mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-presales-border rounded-lg px-4 py-2 text-presales-text focus:outline-none focus:border-presales-dark-green"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-presales-text mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full border border-presales-border rounded-lg px-4 py-2 text-presales-text focus:outline-none focus:border-presales-dark-green"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-presales-dark-green text-white py-2 rounded-lg font-medium hover:bg-presales-medium-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-presales-light-green border border-presales-border rounded-lg">
            <p className="text-sm text-presales-text font-medium mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-presales-text-secondary">
              <p><strong>Email:</strong> priya.sharma@example.com</p>
              <p><strong>Password:</strong> Demo@123</p>
              <p className="mt-3 text-presales-dark-green font-medium">Try any demo user email with password Demo@123</p>
            </div>
          </div>
        </div>

        {/* Demo Users */}
        <div className="mt-6 p-4 bg-white border border-presales-border rounded-lg">
          <p className="text-sm font-medium text-presales-text mb-3">Available Demo Users:</p>
          <div className="space-y-2 text-xs text-presales-text-secondary">
            <div className="flex justify-between">
              <span><strong>Priya Sharma</strong> - Solution Owner</span>
              <code>priya.sharma@example.com</code>
            </div>
            <div className="flex justify-between">
              <span><strong>Rahul Mehta</strong> - Solution Member</span>
              <code>rahul.mehta@example.com</code>
            </div>
            <div className="flex justify-between">
              <span><strong>Neha Joshi</strong> - Guest</span>
              <code>neha.joshi@example.com</code>
            </div>
            <div className="flex justify-between">
              <span><strong>Vikram Shah</strong> - Admin</span>
              <code>vikram.shah@example.com</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
