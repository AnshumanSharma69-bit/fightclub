'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router    = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ username: '', email: '', password: '', heightCm: '', weightKg: '', reachCm: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = () => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
    window.location.href = `${apiBase}/api/auth/google`;
  };

  const handleNext = (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.email || !form.password) return setError('All fields are required');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: form.username, email: form.email, password: form.password,
        heightCm: Number(form.heightCm), weightKg: Number(form.weightKg),
        reachCm: form.reachCm ? Number(form.reachCm) : undefined,
      });
      login(res.data.token, res.data.user, res.data.fighter);
      router.push('/map');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setStep(1);
    } finally { setLoading(false); }
  };

  return (
    <div style={s.root}>
      {/* Left panel */}
      <div style={s.left}>
        <div style={s.brand}>FIGHT<span style={s.accent}>CLUB</span></div>
        <div style={s.steps}>
          <Step num={1} label="ACCOUNT"      active={step === 1} done={step > 1} />
          <div style={s.stepConnector} />
          <Step num={2} label="FIGHTER STATS" active={step === 2} done={false} />
        </div>
        <div style={s.stepDesc}>
          {step === 1
            ? 'Create your account. Sign up with Google in one tap.'
            : 'Your stats determine your weight class and matchmaking bracket.'}
        </div>
      </div>

      {/* Right panel */}
      <div style={s.right}>
        <div style={s.formBox}>
          {/* Mobile logo */}
          <div style={s.mobileLogo}>FIGHT<span style={s.accent}>CLUB</span></div>

          {/* Mobile step indicator */}
          <div style={s.mobileSteps}>
            <div style={{ ...s.mobileStep, background: '#cc2200' }}>1</div>
            <div style={s.mobileStepLine} />
            <div style={{ ...s.mobileStep, background: step >= 2 ? '#cc2200' : '#1c1c1c', color: step >= 2 ? '#e8e4dc' : '#4a4a4a' }}>2</div>
          </div>

          <div style={s.formTitle}>{step === 1 ? 'CREATE ACCOUNT' : 'FIGHTER STATS'}</div>

          {error && <div style={s.error}>{error}</div>}

          {step === 1 && (
            <>
              <button style={s.googleBtn} onClick={handleGoogle} type="button">
                <GoogleIcon />
                Sign up with Google
              </button>
              <div style={s.divider}>
                <span style={s.dividerLine} />
                <span style={s.dividerText}>or</span>
                <span style={s.dividerLine} />
              </div>
              <form onSubmit={handleNext} style={s.form}>
                <Field label="USERNAME"                  type="text"     placeholder="bruiser_99"        value={form.username}  onChange={v => setForm({...form, username: v})} />
                <Field label="EMAIL"                     type="email"    placeholder="your@email.com"    value={form.email}     onChange={v => setForm({...form, email: v})} />
                <Field label="PASSWORD (MIN 8 CHARS)"    type="password" placeholder="••••••••"          value={form.password}  onChange={v => setForm({...form, password: v})} />
                <button style={s.submitBtn} type="submit">NEXT →</button>
              </form>
            </>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.rowFields}>
                <Field label="HEIGHT (CM)" type="number" placeholder="175" value={form.heightCm} onChange={v => setForm({...form, heightCm: v})} required />
                <Field label="WEIGHT (KG)" type="number" placeholder="70"  value={form.weightKg} onChange={v => setForm({...form, weightKg: v})} required />
              </div>
              <Field label="REACH (CM) — OPTIONAL" type="number" placeholder="180" value={form.reachCm} onChange={v => setForm({...form, reachCm: v})} required={false} />
              <div style={s.weightHint}>Weight class is auto-assigned from your weight.</div>
              <div style={s.btnRow}>
                <button style={s.backBtn} type="button" onClick={() => setStep(1)}>← BACK</button>
                <button style={{ ...s.submitBtn, flex: 2 }} type="submit" disabled={loading}>
                  {loading ? 'CREATING...' : 'CREATE PROFILE →'}
                </button>
              </div>
            </form>
          )}

          <p style={s.switchLink}>
            Already a fighter? <Link href="/login" style={s.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, placeholder, value, onChange, required = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
      <label style={s.label}>{label}</label>
      <input style={s.input} type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}

function Step({ num, label, active, done }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '2px',
        background: done ? '#cc2200' : active ? '#cc2200' : '#1c1c1c',
        border: `1px solid ${active || done ? '#cc2200' : '#2a2a2a'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#e8e4dc', fontSize: '12px', fontWeight: '700', flexShrink: 0,
      }}>
        {done ? '✓' : num}
      </div>
      <span style={{ color: active ? '#e8e4dc' : done ? '#cc2200' : '#3a3a3a', fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em' }}>
        {label}
      </span>
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

const s = {
  root:       { display: 'flex', minHeight: '100vh', background: '#0a0a0a', fontFamily: "'Inter', sans-serif" },
  left:       { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px', borderRight: '1px solid #1c1c1c' },
  brand:      { fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: 'clamp(48px, 6vw, 80px)', color: '#e8e4dc', letterSpacing: '0.04em', lineHeight: '0.9', marginBottom: '48px' },
  accent:     { color: '#cc2200' },
  steps:      { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  stepConnector: { width: '40px', height: '1px', background: '#2a2a2a' },
  stepDesc:   { color: '#3a3a3a', fontSize: '13px', lineHeight: '1.7', maxWidth: '280px' },
  right:      { width: '420px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: '#0d0d0d' },
  formBox:    { width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '16px' },
  mobileLogo: { display: 'none', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '32px', color: '#e8e4dc', letterSpacing: '0.04em' },
  mobileSteps:{ display: 'none', alignItems: 'center', gap: '8px' },
  mobileStep: { width: '24px', height: '24px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8e4dc', fontSize: '11px', fontWeight: '700' },
  mobileStepLine: { flex: 1, height: '1px', background: '#1c1c1c' },
  formTitle:  { fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '24px', color: '#e8e4dc', letterSpacing: '0.08em' },
  error:      { background: '#1a0800', border: '1px solid #cc2200', borderRadius: '2px', color: '#cc2200', fontSize: '13px', padding: '10px 12px' },
  googleBtn:  { alignItems: 'center', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e8e4dc', cursor: 'pointer', display: 'flex', fontSize: '14px', fontWeight: '500', gap: '10px', justifyContent: 'center', padding: '13px', width: '100%' },
  divider:    { alignItems: 'center', display: 'flex', gap: '12px', margin: '4px 0' },
  dividerLine:{ flex: 1, height: '1px', background: '#1c1c1c', display: 'block' },
  dividerText:{ color: '#3a3a3a', fontSize: '12px', letterSpacing: '0.08em' },
  form:       { display: 'flex', flexDirection: 'column', gap: '12px' },
  label:      { color: '#4a4a4a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.12em' },
  input:      { background: '#111', border: '1px solid #1c1c1c', borderRadius: '6px', color: '#e8e4dc', fontSize: '14px', outline: 'none', padding: '14px', width: '100%' },
  submitBtn:  { background: '#cc2200', border: 'none', borderRadius: '6px', color: '#e8e4dc', cursor: 'pointer', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '17px', letterSpacing: '0.1em', padding: '14px' },
  rowFields:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  weightHint: { color: '#3a3a3a', fontSize: '11px', letterSpacing: '0.02em', marginTop: '-4px' },
  btnRow:     { display: 'flex', gap: '10px', marginTop: '4px' },
  backBtn:    { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#4a4a4a', cursor: 'pointer', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '15px', letterSpacing: '0.08em', padding: '14px 16px' },
  switchLink: { color: '#3a3a3a', fontSize: '13px', textAlign: 'center', marginTop: '4px' },
  link:       { color: '#cc2200', textDecoration: 'none' },
};
