import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { AlertCircle, ArrowUpRight, Bell, CheckCircle, LogOut, Server, User } from 'lucide-react';

type SettingsSection = 'profile' | 'notifications' | 'system';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const requestedSection = router.query.section;
  const section: SettingsSection = requestedSection === 'notifications' || requestedSection === 'system'
    ? requestedSection
    : 'profile';
  const [aiHealth, setAiHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [healthError, setHealthError] = useState('');

  useEffect(() => {
    if (section !== 'system') return;
    let isMounted = true;
    setLoading(true);
    setHealthError('');
    apiClient.getAIHealth()
      .then((health) => {
        if (isMounted) setAiHealth(health);
      })
      .catch((error) => {
        console.error('Failed to check AI health:', error);
        if (isMounted) setHealthError('Failed to check AI service health.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [section]);

  const navigateToSection = (nextSection: SettingsSection) => {
    void router.push({ pathname: '/settings', query: { section: nextSection } }, undefined, { shallow: true });
  };

  const initials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Workspace / Settings</p>
        <h1 className="text-3xl font-bold tracking-tight text-presales-text sm:text-4xl">Profile &amp; Settings</h1>
        <p className="mt-2 text-presales-text-secondary">Manage your account information and review application services.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-presales-border bg-white p-4 shadow-sm">
          <div className="border-b border-gray-100 px-2 pb-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 font-bold text-blue-700">
                {initials || <User size={20} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-presales-text">{user?.first_name} {user?.last_name}</p>
                <p className="truncate text-xs text-presales-text-secondary">{user?.role}</p>
              </div>
            </div>
          </div>
          <nav aria-label="Settings sections" className="space-y-1 py-3">
            <SettingsNavButton
              active={section === 'profile'}
              icon={<User size={17} />}
              label="My Profile"
              onClick={() => navigateToSection('profile')}
            />
            <SettingsNavButton
              active={section === 'notifications'}
              icon={<Bell size={17} />}
              label="Notification Settings"
              onClick={() => navigateToSection('notifications')}
            />
            <SettingsNavButton
              active={section === 'system'}
              icon={<Server size={17} />}
              label="System Configuration"
              onClick={() => navigateToSection('system')}
            />
          </nav>
          <button
            type="button"
            onClick={() => {
              logout();
              void router.push('/login');
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </aside>

        <div className="min-w-0">
          {section === 'profile' && (
            <div className="space-y-5">
              <section className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col justify-between gap-5 border-b border-gray-100 pb-6 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-bold text-white">
                      {initials || <User size={24} />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-presales-text">{user?.first_name} {user?.last_name}</h2>
                      <p className="mt-1 text-sm text-presales-text-secondary">{user?.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Signed in
                  </span>
                </div>

                <div className="mt-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-presales-text">Account information</h3>
                    <p className="mt-1 text-sm text-presales-text-secondary">
                      Your account details are managed by your Presales Administrator.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField label="First name" value={user?.first_name} />
                    <ProfileField label="Last name" value={user?.last_name} />
                    <ProfileField label="Work email" value={user?.email} />
                    <ProfileField label="Application role" value={user?.role} />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm sm:p-7">
                <h3 className="text-lg font-bold text-presales-text">Account access</h3>
                <p className="mt-1 text-sm text-presales-text-secondary">
                  Your role determines which opportunities, artifacts, and workspace tools are available to you.
                </p>
                <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl bg-blue-50/70 p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-presales-text">{user?.role}</p>
                    <p className="mt-1 text-xs text-presales-text-secondary">Current access role</p>
                  </div>
                  <Link href="/audit-logs" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900">
                    View activity
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </section>
            </div>
          )}

          {section === 'notifications' && (
            <section className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Bell size={21} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-presales-text">Notification settings</h2>
                  <p className="mt-1 text-sm leading-6 text-presales-text-secondary">
                    Review the notification channels currently available in this workspace.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex flex-col justify-between gap-3 rounded-2xl border border-presales-border p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-presales-text">In-app activity</p>
                    <p className="mt-1 text-sm text-presales-text-secondary">Opportunity changes and user actions are recorded in the audit log.</p>
                  </div>
                  <Link href="/audit-logs" className="inline-flex w-fit items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100">
                    Available
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
                <div className="flex flex-col justify-between gap-3 rounded-2xl border border-presales-border p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-presales-text">Email notifications</p>
                    <p className="mt-1 text-sm text-presales-text-secondary">Email delivery is not configured for this application.</p>
                  </div>
                  <span className="w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">Not configured</span>
                </div>
                <div className="flex flex-col justify-between gap-3 rounded-2xl border border-presales-border p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-presales-text">Microsoft Teams</p>
                    <p className="mt-1 text-sm text-presales-text-secondary">A Teams notification integration is not connected.</p>
                  </div>
                  <span className="w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">Not connected</span>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>Notification delivery controls will be available when email or collaboration integrations are configured.</p>
              </div>
            </section>
          )}

          {section === 'system' && (
            <div className="space-y-5">
              <section className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-presales-text">AI service configuration</h2>
                  <p className="mt-1 text-sm text-presales-text-secondary">Current connectivity and model configuration.</p>
                </div>
                {healthError && (
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle size={18} />
                    {healthError}
                  </div>
                )}
                {loading ? (
                  <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
                ) : aiHealth ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-2xl bg-blue-50/70 p-4">
                      <div>
                        <p className="text-sm text-presales-text-secondary">Bedrock configuration</p>
                        <p className="mt-1 font-bold text-presales-text">
                          {aiHealth.bedrock_configured ? 'Configured' : 'Not configured'}
                        </p>
                      </div>
                      <span className={`h-3 w-3 rounded-full ${aiHealth.bedrock_configured ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ProfileField label="AWS region" value={aiHealth.aws_region} />
                      <ProfileField label="Configured model" value={aiHealth.configured_model} />
                      <div className="rounded-2xl border border-presales-border p-4 sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-presales-text-secondary">Connectivity status</p>
                        <p className="mt-2 font-semibold capitalize text-presales-text">{aiHealth.connectivity_status}</p>
                      </div>
                    </div>
                  </div>
                ) : !healthError ? (
                  <p className="rounded-2xl bg-gray-50 p-4 text-sm text-presales-text-secondary">AI service health is unavailable.</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setHealthError('');
                    apiClient.getAIHealth()
                      .then(setAiHealth)
                      .catch((error) => {
                        console.error('Failed to refresh AI health:', error);
                        setHealthError('Failed to refresh AI service health.');
                      })
                      .finally(() => setLoading(false));
                  }}
                  disabled={loading}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-presales-dark-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  Refresh status
                </button>
              </section>

              <section className="rounded-3xl border border-presales-border bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-bold text-presales-text">Application information</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ProfileField label="Application" value="Presales Opportunity & Artifact Management Platform" />
                  <ProfileField label="Version" value="1.0.0" />
                  <ProfileField label="API endpoint" value={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'} />
                  <div className="rounded-2xl border border-presales-border p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-presales-text-secondary">Core features</p>
                    <p className="mt-2 text-sm font-semibold text-presales-text">
                      Opportunities, artifacts, role-based access, and audit logs
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SettingsNavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function SettingsNavButton({ active, icon, label, onClick }: SettingsNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition ${
        active ? 'bg-blue-50 text-blue-800' : 'text-presales-text-secondary hover:bg-gray-50 hover:text-presales-text'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0 rounded-2xl border border-presales-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-presales-text-secondary">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-presales-text">{value || 'Not provided'}</p>
    </div>
  );
}
