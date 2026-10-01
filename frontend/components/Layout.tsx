import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store';
import { Menu, X, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Opportunities', href: '/opportunities', icon: '🎯' },
    { name: 'Artifacts', href: '/artifacts', icon: '📦' },
    { name: 'Mapping', href: '/mapping', icon: '🔗' },
    { name: 'Users', href: '/users', icon: '👥', admin: true },
    { name: 'Reports', href: '/reports', icon: '📈' },
    { name: 'AI Assistant', href: '/ai-assistant', icon: '🤖' },
    { name: 'Audit Logs', href: '/audit-logs', icon: '📋' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  if (!user) {
    return <>{children}</>;
  }

  const isAdmin = user.role === 'Administrator';
  const filteredNavigation = navigation.filter(item => !item.admin || isAdmin);

  return (
    <div className="flex h-screen bg-presales-page-bg">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-presales-dark-green to-presales-deep-green text-white transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-presales-deep-green">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Presales" className="w-10 h-10" />
            {sidebarOpen && <span className="font-bold text-lg">Presales</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-presales-medium-green text-white'
                    : 'text-presales-light-green hover:bg-presales-deep-green'
                }`}
                title={item.name}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-presales-deep-green p-4 space-y-2">
          {sidebarOpen && (
            <div className="text-sm text-presales-light-green">
              <p className="font-medium truncate">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-presales-light-green/75">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-presales-light-green hover:bg-presales-deep-green transition-all duration-200"
            title="Logout"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <div className="border-t border-presales-deep-green p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-presales-deep-green transition-all duration-200"
            title="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-presales-dark-green to-presales-medium-green bg-clip-text text-transparent">
              {router.pathname === '/dashboard' && 'Dashboard'}
              {router.pathname === '/opportunities' && 'Opportunities'}
              {router.pathname === '/artifacts' && 'Artifacts'}
              {router.pathname === '/mapping' && 'Opportunity-Artifact Mapping'}
              {router.pathname === '/users' && 'Users'}
              {router.pathname === '/reports' && 'Reports'}
              {router.pathname === '/ai-assistant' && 'AI Assistant'}
              {router.pathname === '/audit-logs' && 'Audit Logs'}
              {router.pathname === '/settings' && 'Settings'}
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <p className="text-xs font-medium text-presales-dark-green mt-1">{user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-presales-dark-green text-white flex items-center justify-center font-bold">
                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
