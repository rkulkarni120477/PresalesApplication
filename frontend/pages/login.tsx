import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { AlertCircle, ArrowRight, Briefcase, HelpCircle, Layers, Lock, Mail, Shield } from 'lucide-react';

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
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative isolate flex min-h-[620px] flex-col overflow-hidden bg-gradient-to-br from-[#2458df] via-[#4387f2] to-[#69aff8] px-7 py-7 text-white sm:px-10 lg:min-h-screen lg:px-12 xl:px-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-36 h-[30rem] w-[30rem] rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-white/10" />

        <header className="relative z-10 flex items-center gap-3">
          <img src="/logo.svg" alt="" aria-hidden="true" className="h-9 w-9 brightness-0 invert" />
          <span className="text-xl font-bold tracking-tight">Academian</span>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-12 lg:py-8">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Presales &amp; Solutions
            <br className="hidden sm:block" /> Development Portal
          </h1>
          <p className="mt-4 max-w-xl text-base text-blue-50 sm:text-lg">
            Build stronger proposals faster by reusing what already wins.
          </p>

          <div className="relative mx-auto mt-12 h-56 w-full max-w-2xl sm:h-64">
            <svg
              aria-hidden="true"
              className="absolute inset-0 hidden h-full w-full sm:block"
              viewBox="0 0 640 240"
              preserveAspectRatio="none"
            >
              <defs>
                <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" fill="white" />
                </marker>
              </defs>
              <path d="M205 86 C270 24 370 24 435 86" fill="none" stroke="white" strokeWidth="3" strokeDasharray="7 8" strokeLinecap="round" markerEnd="url(#flow-arrow)" />
              <path d="M435 154 C370 216 270 216 205 154" fill="none" stroke="white" strokeWidth="3" strokeDasharray="7 8" strokeLinecap="round" markerEnd="url(#flow-arrow)" />
            </svg>

            <p className="absolute left-1/2 top-0 hidden -translate-x-1/2 text-sm font-medium sm:block">
              Reuse what wins
            </p>
            <div className="absolute left-0 top-1/2 w-[42%] -translate-y-1/2 rounded-3xl border border-white/40 bg-white/15 p-4 shadow-sm backdrop-blur-sm sm:w-[34%] sm:p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600">
                <Briefcase size={20} />
              </span>
              <h2 className="font-semibold">Opportunities</h2>
              <p className="mt-1 text-xs text-blue-50 sm:text-sm">Create · assign · review · win</p>
            </div>

            <div className="absolute right-0 top-1/2 w-[42%] -translate-y-1/2 rounded-3xl border border-white/40 bg-white/15 p-4 shadow-sm backdrop-blur-sm sm:w-[34%] sm:p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600">
                <Layers size={20} />
              </span>
              <h2 className="font-semibold">Artifacts</h2>
              <p className="mt-1 text-xs text-blue-50 sm:text-sm">Ingest · enrich · search · reuse</p>
            </div>
            <p className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 text-sm font-medium sm:block">
              Add new learnings
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:mt-10 sm:gap-4">
            {[
              ['Faster', 'response cycles'],
              ['Shared', 'solution knowledge'],
              ['Clear', 'visibility for everyone'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/20 bg-white/15 px-3 py-3 backdrop-blur-sm sm:px-4">
                <p className="font-semibold sm:text-lg">{title}</p>
                <p className="text-[10px] leading-snug text-blue-50 sm:text-xs">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-10 lg:min-h-screen lg:px-12 xl:px-20">
        <div className="w-full max-w-md">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Shield size={25} strokeWidth={1.8} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
            Sign in with your Academian account to continue.
          </p>

          {error && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            Demo access
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-blue-600"><Mail size={19} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">Guest reviewer</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Try the reviewer demo profile. Demo users share the password <span className="font-medium text-slate-700">Demo@123</span>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('sneha.patil@example.com');
                    setPassword('Demo@123');
                    setError(null);
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Use guest reviewer demo <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Lock size={14} className="text-emerald-600" />
            Demo access uses local application credentials.
          </p>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <HelpCircle size={15} />
            Trouble signing in?
            <span className="font-semibold text-blue-600">Contact your Presales Admin</span>
          </p>
        </div>
      </section>
    </main>
  );
}
