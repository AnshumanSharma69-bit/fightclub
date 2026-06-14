'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.push(user ? '/map' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div style={{
      alignItems: 'center',
      background: '#0f0f0f',
      color: '#888',
      display: 'flex',
      fontSize: '14px',
      height: '100vh',
      justifyContent: 'center',
    }}>
      🥊 Loading...
    </div>
  );
}