import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { initializeAuth, useAuthStore } from '@/lib/store';
import Layout from '@/components/Layout';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated and not on login page
    if (!user && router.pathname !== '/login') {
      router.push('/login');
    }
  }, [user, router]);

  // Login page doesn't need layout
  if (router.pathname === '/login') {
    return <Component {...pageProps} />;
  }

  // Protected pages need layout
  if (!user) {
    return null;
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
