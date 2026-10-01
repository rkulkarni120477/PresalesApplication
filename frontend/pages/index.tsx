import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [user, router]);

  return null;
}
