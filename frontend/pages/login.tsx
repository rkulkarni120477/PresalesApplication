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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.svg" alt="Presales" className="w-14 h-14 shadow-lg" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Presales</h1>
              <p className="text-sm text-gray-500">Platform</p>
            </div>
          </div>
          <p className="text-gray-600 mt-2">Opportunity & Artifact Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-presales-dark-green focus:border-transparent transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-presales-dark-green focus:border-transparent transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-presales-dark-green text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Demo Info */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-t border-gray-200 p-6 rounded-b-xl">
            <p className="text-sm font-semibold text-gray-900 mb-3">Demo Credentials</p>
            <div className="space-y-2 text-sm text-gray-700">
              <p><span className="font-medium">Email:</span> priya.sharma@example.com</p>
              <p><span className="font-medium">Password:</span> Demo@123</p>
              <p className="text-xs text-presales-dark-green font-medium mt-3">✓ Use any demo user email with password Demo@123</p>
            </div>
          </div>
        </div>

        {/* Demo Users Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="font-semibold text-gray-900 text-xs mb-2">Presales Solution Owner</p>
            <p className="text-xs text-gray-600">priya.sharma</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="font-semibold text-gray-900 text-xs mb-2">Presales Solution Member</p>
            <p className="text-xs text-gray-600">amit.kulkarni</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="font-semibold text-gray-900 text-xs mb-2">Artifact Repository Owner</p>
            <p className="text-xs text-gray-600">rahul.mehta</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="font-semibold text-gray-900 text-xs mb-2">Presales Administrator</p>
            <p className="text-xs text-gray-600">vikram.shah</p>
          </div>
        </div>
      </div>
    </div>
  );
}
