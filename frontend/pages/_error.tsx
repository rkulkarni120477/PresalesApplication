import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface Props {
  statusCode?: number;
}

function Error({ statusCode }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-presales-page-bg via-presales-light-green to-presales-page-bg">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-presales-dark-green mb-4">
          {statusCode || 'Error'}
        </h1>
        <p className="text-2xl text-presales-text mb-8">
          {statusCode === 404
            ? 'Page Not Found'
            : statusCode === 500
            ? 'Server Error'
            : 'An Error Occurred'}
        </p>
        <p className="text-presales-text-secondary mb-8">
          {statusCode === 404
            ? "The page you're looking for doesn't exist."
            : 'Something went wrong. Please try again.'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-presales-light-green text-presales-dark-green rounded-lg font-medium hover:bg-presales-medium-green transition-all duration-200"
          >
            Go Back
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-presales-dark-green text-white rounded-lg font-medium hover:bg-presales-medium-green transition-all duration-200"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
