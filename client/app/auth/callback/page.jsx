'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// Google redirects to this page after OAuth with ?token=...
// We store the token and fetch the user profile, then redirect to /map
export default function AuthCallbackPage() {
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

    // Store token temporarily so api.js interceptor picks it up
    localStorage.setItem('token', token);

    // Fetch user + fighter profile with the new token
    api.get('/auth/me')
      .then(res => {
        login(token, res.data.user, res.data.fighter);
        // If fighter needs onboarding (new Google user with no real stats)
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
