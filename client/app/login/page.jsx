'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'google') setError('Google sign-in failed. Try again.');
    if (err === 'server') setError('Something went wrong. Try again.');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user, res.data.fighter);
      router.push('/map');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
    window.location.href = `${apiBase}/api/auth/google`;
  };

  return (
    <div style={s.root}>
      {/* Left panel — hidden on mobile via CSS */}
      <div style={s.left}>
        <div style={s.brand}>FIGHT<span style={s.brandAccent}>CLUB</span></div>
        <div style={s.tagline}>STEP UP.<br />SHOW OUT.<br />CLAIM YOUR TURF.</div>
        <div style={s.subTagline}>Location-based fighter matchmaking.<br />Beat the city. Own the badge.</div>
        <div style={s.decorLine} />
        <div style={s.stats}>
          <StatPill label="TERRITORIES" value="9" />
          <StatPill label="ELO RANKED"  value="YES" />
          <StatPill label="REAL-TIME"   value="✓" />
        </div>
      </div>

      {/* Right panel — full screen on mobile */}
      <div style={s.right}>
        <div style={s.formBox}>
          {/* Mobile-only logo */}
          <div style={s.mobileLogo}>FIGHT<span style={s.brandAccent}>CLUB</span></div>

          <div style={s.formTitle}>SIGN IN</div>

          {error && <div style={s.error}>{error}</div>}

          <button style={s.googleBtn} onClick={handleGoogle} type="button">
            <GoogleIcon />
            Continue with Google
          </button>

          <div style={s.divider}>
            <span style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <span style={s.dividerLine} />
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.fieldGroup}>
              <label style={s.label}>EMAIL</label>
              <input style={s.input} type="email" placeholder="your@email.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>PASSWORD</label>
              <input style={s.input} type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button style={s.submitBtn} type="submit" disabled={loading}>
              {loading ? 'SIGNING IN...' : 'SIGN IN →'}
            </button>
          </form>

          <p style={s.switchLink}>
            New fighter? <Link href="/register" style={s.link}>Create profile</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .auth-left-panel  { display: none !important; }
          .auth-right-panel { width: 100% !important; padding: 48px 24px 40px !important; }
          .mobile-logo      { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#cc2200', fontSize: '18px', fontWeight: '700', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>{value}</div>
      <div style={{ color: '#4a4a4a', fontSize: '10px', letterSpacing: '0.15em', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ alignItems: 'center', background: '#0a0a0a', color: '#666', display: 'flex', height: '100vh', justifyContent: 'center', fontSize: '14px' }}>
        🥊 Loading...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

const s = {
  root:       { display: 'flex', minHeight: '100vh', background: '#0a0a0a', fontFamily: "'Inter', sans-serif" },
  left:       { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px', background: 'linear-gradient(135deg, #0a0a0a 0%, #111 50%, #0f0a0a 100%)', borderRight: '1px solid #1c1c1c' },
  brand:      { fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: 'clamp(56px, 7vw, 96px)', color: '#e8e4dc', letterSpacing: '0.04em', lineHeight: '0.9', marginBottom: '32px' },
  brandAccent:{ color: '#cc2200' },
  tagline:    { fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: 'clamp(28px, 3.5vw, 48px)', color: '#4a4a4a', letterSpacing: '0.06em', lineHeight: '1.1', marginBottom: '20px' },
  subTagline: { color: '#3a3a3a', fontSize: '13px', lineHeight: '1.7', letterSpacing: '0.02em', maxWidth: '280px' },
  decorLine:  { width: '48px', height: '3px', background: '#cc2200', margin: '32px 0' },
  stats:      { display: 'flex', gap: '32px' },
  right:      { width: '420px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: '#0d0d0d' },
  formBox:    { width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '16px' },
  mobileLogo: { display: 'none', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '36px', color: '#e8e4dc', letterSpacing: '0.04em', marginBottom: '8px' },
  formTitle:  { fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '28px', color: '#e8e4dc', letterSpacing: '0.08em' },
  error:      { background: '#1a0800', border: '1px solid #cc2200', borderRadius: '2px', color: '#cc2200', fontSize: '13px', padding: '10px 12px' },
  googleBtn:  { alignItems: 'center', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e8e4dc', cursor: 'pointer', display: 'flex', fontSize: '14px', fontWeight: '500', gap: '10px', justifyContent: 'center', padding: '13px', width: '100%' },
  divider:    { alignItems: 'center', display: 'flex', gap: '12px', margin: '4px 0' },
  dividerLine:{ flex: 1, height: '1px', background: '#1c1c1c', display: 'block' },
  dividerText:{ color: '#3a3a3a', fontSize: '12px', letterSpacing: '0.08em' },
  form:       { display: 'flex', flexDirection: 'column', gap: '12px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:      { color: '#4a4a4a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.12em' },
  input:      { background: '#111', border: '1px solid #1c1c1c', borderRadius: '6px', color: '#e8e4dc', fontSize: '14px', outline: 'none', padding: '14px', width: '100%' },
  submitBtn:  { background: '#cc2200', border: 'none', borderRadius: '6px', color: '#e8e4dc', cursor: 'pointer', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '18px', letterSpacing: '0.1em', marginTop: '4px', padding: '14px' },
  switchLink: { color: '#3a3a3a', fontSize: '13px', textAlign: 'center', marginTop: '4px' },
  link:       { color: '#cc2200', textDecoration: 'none' },
};
