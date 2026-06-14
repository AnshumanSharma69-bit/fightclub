'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    heightCm: '', weightKg: '', reachCm: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        username:  form.username,
        email:     form.email,
        password:  form.password,
        heightCm:  Number(form.heightCm),
        weightKg:  Number(form.weightKg),
        reachCm:   form.reachCm ? Number(form.reachCm) : undefined,
      };
      const res = await api.post('/auth/register', payload);
      login(res.data.token, res.data.user, res.data.fighter);
      router.push('/map');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f0f', padding:'20px' }}>
      <div style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'12px', padding:'40px', width:'100%', maxWidth:'420px' }}>
        <h1 style={{ color:'#fff', fontSize:'26px', fontWeight:'700', margin:'0 0 8px', textAlign:'center' }}>🥊 Create Profile</h1>
        <p style={{ color:'#888', fontSize:'14px', textAlign:'center', margin:'0 0 24px' }}>Enter your fighter stats</p>

        {error && <div style={{ background:'#2a1a1a', border:'1px solid #e63946', borderRadius:'8px', color:'#e63946', fontSize:'13px', marginBottom:'16px', padding:'10px 14px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <p style={{ color:'#555', fontSize:'11px', fontWeight:'600', letterSpacing:'0.08em', margin:'8px 0 2px', textTransform:'uppercase' }}>Account</p>
          <input style={{ background:'#111', border:'1px solid #333', borderRadius:'8px', color:'#fff', fontSize:'14px', padding:'12px 14px', outline:'none' }}
            type="text" placeholder="Username" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input style={{ background:'#111', border:'1px solid #333', borderRadius:'8px', color:'#fff', fontSize:'14px', padding:'12px 14px', outline:'none' }}
            type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input style={{ background:'#111', border:'1px solid #333', borderRadius:'8px', color:'#fff', fontSize:'14px', padding:'12px 14px', outline:'none' }}
            type="password" placeholder="Password (min 8 chars)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />

          <p style={{ color:'#555', fontSize:'11px', fontWeight:'600', letterSpacing:'0.08em', margin:'8px 0 2px', textTransform:'uppercase' }}>Fighter Stats</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <input style={{ background:'#111', border:'1px solid #333', borderRadius:'8px', color:'#fff', fontSize:'14px', padding:'12px 14px', outline:'none' }}
              type="number" placeholder="Height (cm)" value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })} required />
            <input style={{ background:'#111', border:'1px solid #333', borderRadius:'8px', color:'#fff', fontSize:'14px', padding:'12px 14px', outline:'none' }}
              type="number" placeholder="Weight (kg)" value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required />
          </div>
          <input style={{ background:'#111', border:'1px solid #333', borderRadius:'8px', color:'#fff', fontSize:'14px', padding:'12px 14px', outline:'none' }}
            type="number" placeholder="Reach (cm) — optional" value={form.reachCm}
            onChange={(e) => setForm({ ...form, reachCm: e.target.value })} />

          <button style={{ background:'#e63946', border:'none', borderRadius:'8px', color:'#fff', cursor:'pointer', fontSize:'15px', fontWeight:'600', marginTop:'8px', padding:'13px' }}
            type="submit" disabled={loading}>
            {loading ? 'Creating profile...' : 'Create Fighter Profile'}
          </button>
        </form>

        <p style={{ color:'#888', fontSize:'13px', marginTop:'20px', textAlign:'center' }}>
          Already have an account? <Link href="/login" style={{ color:'#e63946', textDecoration:'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}