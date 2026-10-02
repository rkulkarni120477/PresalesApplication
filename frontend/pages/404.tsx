import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-presales-page-bg via-presales-light-green to-presales-page-bg">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-presales-dark-green mb-4">404</h1>
        <p className="text-2xl text-presales-text mb-8">Page Not Found</p>
        <p className="text-presales-text-secondary mb-8">The page you're looking for doesn't exist.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-presales-dark-green text-white rounded-lg font-medium hover:bg-presales-medium-green transition-all duration-200"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
