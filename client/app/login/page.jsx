'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f0f' }}>
      <div style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'12px', padding:'40px', width:'100%', maxWidth:'400px' }}>
        <h1 style={{ color:'#fff', fontSize:'28px', fontWeight:'700', margin:'0 0 8px', textAlign:'center' }}>🥊 FightClub</h1>
        <p style={{ color:'#888', fontSize:'14px', textAlign:'center', margin:'0 0 28px' }}>Sign in to find fighters near you</p>

        {error && <div style={{ background:'#2a1a1a', border:'1px solid #e63946', borderRadius:'8px', color:'#e63946', fontSize:'13px', marginBottom:'16px', padding:'10px 14px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <input style={{ background:'#111', border:'1px solid #333', borderRadius:'8px', color:'#fff', fontSize:'14px', padding:'12px 14px', outline:'none', width:'100%' }}
            type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input style={{ background:'#111', border:'1px solid #333', borderRadius:'8px', color:'#fff', fontSize:'14px', padding:'12px 14px', outline:'none', width:'100%' }}
            type="password" placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button style={{ background:'#e63946', border:'none', borderRadius:'8px', color:'#fff', cursor:'pointer', fontSize:'15px', fontWeight:'600', marginTop:'4px', padding:'13px' }}
            type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ color:'#888', fontSize:'13px', marginTop:'20px', textAlign:'center' }}>
          No account? <Link href="/register" style={{ color:'#e63946', textDecoration:'none' }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}