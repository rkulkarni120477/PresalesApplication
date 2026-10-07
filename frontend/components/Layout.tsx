import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Bell, ChevronDown, LogOut, MoreHorizontal, Settings, User } from 'lucide-react';
import { initializeAuth, useAuthStore } from '../lib/store';

interface LayoutProps {
  children: React.ReactNode;
}

const primaryNavigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'My Work', href: '/opportunities?scope=my-work' },
  { name: 'Opportunities', href: '/opportunities' },
  { name: 'Artifacts', href: '/artifacts' },
  { name: 'Reports', href: '/reports' },
];

const secondaryNavigation = [
  { name: 'Opportunity-Artifact Mapping', href: '/mapping' },
  { name: 'Users', href: '/users', adminOnly: true },
  { name: 'AI Assistant', href: '/ai-assistant' },
  { name: 'Audit Logs', href: '/audit-logs' },
  { name: 'Settings', href: '/settings?section=profile' },
];

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
    setMoreMenuOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return <>{children}</>;

  const isRepositoryOwner = user.role === 'Artifact Repository Owner';
  const isAdmin = user.role === 'Presales Administrator';
  const visiblePrimaryNavigation = primaryNavigation.filter(
    (item) => !(isRepositoryOwner && (item.name === 'My Work' || item.name === 'Opportunities'))
  );
  const visibleSecondaryNavigation = secondaryNavigation.filter(
    (item) => !item.adminOnly || isAdmin
  );
  const activeHref = (href: string) => {
    if (href === '/opportunities?scope=my-work') {
      return router.pathname === '/opportunities' && router.query.scope === 'my-work';
    }
    if (href === '/opportunities') {
      return router.pathname === '/opportunities' && router.query.scope !== 'my-work';
    }
    return router.pathname === href.split('?')[0];
  };
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-presales-page-bg">
      <div className="mx-auto min-h-screen max-w-[1600px] px-3 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-3 z-40 flex min-h-[68px] items-center justify-between gap-3 rounded-full border border-presales-border bg-white px-4 shadow-sm sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
            <img src="/logo.svg" alt="Presales Portal" className="h-9 w-9" />
            <span className="hidden text-sm font-bold tracking-wide text-presales-text sm:block">
              Presales Portal
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center justify-center gap-1 lg:flex">
            {visiblePrimaryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeHref(item.href)
                    ? 'bg-blue-50 text-presales-dark-green'
                    : 'text-presales-text-secondary hover:bg-gray-50 hover:text-presales-text'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2" ref={menuRef}>
            <Link
              href="/settings?section=profile"
              aria-label="Settings"
              title="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-full text-presales-text-secondary transition-colors hover:bg-gray-100 hover:text-presales-text"
            >
              <Settings size={19} />
            </Link>
            <Link
              href="/audit-logs"
              aria-label="Activity"
              title="Activity"
              className="flex h-10 w-10 items-center justify-center rounded-full text-presales-text-secondary transition-colors hover:bg-gray-100 hover:text-presales-text"
            >
              <Bell size={19} />
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(!moreMenuOpen);
                  setUserMenuOpen(false);
                }}
                aria-label="More navigation"
                aria-expanded={moreMenuOpen}
                className="flex h-10 items-center gap-1 rounded-full px-2 text-presales-text-secondary transition-colors hover:bg-gray-100 hover:text-presales-text"
              >
                <MoreHorizontal size={20} />
                <span className="hidden text-sm font-medium sm:inline">More</span>
                <ChevronDown size={14} />
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-presales-border bg-white p-2 shadow-xl">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Workspace
                  </p>
                  {visibleSecondaryNavigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
                        activeHref(item.href)
                          ? 'bg-blue-50 font-medium text-presales-dark-green'
                          : 'text-presales-text hover:bg-gray-50'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setMoreMenuOpen(false);
                }}
                aria-label="Open user menu"
                aria-expanded={userMenuOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-presales-dark-green text-sm font-bold text-white transition-colors hover:bg-blue-700"
              >
                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-presales-border bg-white p-2 shadow-xl">
                  <div className="border-b border-gray-100 px-3 py-3">
                    <p className="text-sm font-semibold text-presales-text">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="mt-1 text-xs text-presales-text-secondary">{user.email}</p>
                    <p className="mt-2 text-xs font-medium text-presales-dark-green">{user.role}</p>
                  </div>
                  <Link
                    href="/settings?section=profile"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-presales-text hover:bg-gray-50"
                  >
                    <User size={16} />
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <nav aria-label="Mobile navigation" className="mt-3 flex flex-wrap gap-2 pb-1 lg:hidden">
          {visiblePrimaryNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
                activeHref(item.href)
                  ? 'border-blue-100 bg-blue-50 text-presales-dark-green'
                  : 'border-presales-border bg-white text-presales-text-secondary'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <main className="mx-auto w-full py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
