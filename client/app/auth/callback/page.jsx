'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

function CallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      router.push('/login?error=google');
      return;
    }

    localStorage.setItem('token', token);

    api.get('/auth/me')
      .then(res => {
        login(token, res.data.user, res.data.fighter);
        if (!res.data.fighter || res.data.fighter.needsOnboarding) {
          router.push('/onboarding');
        } else {
          router.push('/map');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        router.push('/login?error=server');
      });
  }, []);

  return (
    <div style={{
      alignItems: 'center',
      background: '#0a0a0a',
      color: '#e8e4dc',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '100vh',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ fontSize: '32px' }}>🥊</div>
      <div style={{ fontSize: '14px', color: '#666' }}>Signing you in...</div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        alignItems: 'center',
        background: '#0a0a0a',
        color: '#666',
        display: 'flex',
        height: '100vh',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
      }}>
        🥊 Loading...
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
