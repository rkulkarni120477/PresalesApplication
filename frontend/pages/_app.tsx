import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useAuthStore, initializeAuth } from '@/lib/store';
import Layout from '@/components/Layout';
import '@/styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    // Initialize auth from localStorage on app load
    initializeAuth();
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const isLoginPage = router.pathname === '/login';
    const hasAuth = user && token;

    // Redirect to login if not authenticated and not on login page
    if (!hasAuth && !isLoginPage) {
      router.push('/login');
    }

    // Redirect to dashboard if authenticated and on login page
    if (hasAuth && isLoginPage) {
      router.push('/dashboard');
    }
  }, [user, token, router]);

  // Show nothing while checking auth
  if (router.pathname !== '/login' && !user) {
    return null;
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
