'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.push('/map'); // everyone goes to map — guests see it publicly
    }
  }, [loading, router]);

  return (
    <div style={{
      alignItems: 'center',
      background: '#0a0a0a',
      color: '#3a3a3a',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      height: '100vh',
      justifyContent: 'center',
      fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
    }}>
      <div style={{ fontSize: '48px', letterSpacing: '0.06em', color: '#e8e4dc' }}>
        FIGHT<span style={{ color: '#cc2200' }}>CLUB</span>
      </div>
      <div style={{ fontSize: '13px', letterSpacing: '0.2em' }}>LOADING...</div>
    </div>
  );
}
