'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const WEIGHT_CLASSES = [
  { max:52, label:'Strawweight' },{ max:56, label:'Flyweight' },{ max:61, label:'Bantamweight' },
  { max:66, label:'Featherweight' },{ max:70, label:'Lightweight' },{ max:77, label:'Welterweight' },
  { max:84, label:'Middleweight' },{ max:93, label:'Light Heavyweight' },{ max:120, label:'Heavyweight' },
  { max:999, label:'Super Heavyweight' },
];

function getWeightClass(kg) {
  return WEIGHT_CLASSES.find(w => kg <= w.max)?.label || 'Super Heavyweight';
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, fighter, loading, updateFighter } = useAuth();
  const [form, setForm]   = useState({ heightCm:'', weightKg:'', reachCm:'' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) { router.push('/login'); return; }
      if (fighter && !fighter.needsOnboarding) { router.push('/map'); }
    }
  }, [user, fighter, loading]);

  if (loading || !user) return null;

  const weightClass = form.weightKg ? getWeightClass(Number(form.weightKg)) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);
    if (!heightCm || !weightKg) return setError('Height and weight are required');
    if (heightCm < 100 || heightCm > 250) return setError('Height must be 100–250 cm');
    if (weightKg < 40  || weightKg > 200) return setError('Weight must be 40–200 kg');
    setSaving(true);
    try {
      const res = await api.patch('/fighter/me', {
        heightCm, weightKg,
        ...(form.reachCm ? { reachCm: Number(form.reachCm) } : {}),
        needsOnboarding: false,
      });
      updateFighter(res.data);
      router.push('/map');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save stats');
    } finally { setSaving(false); }
  };

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logo}>FIGHT<span style={s.accent}>CLUB</span></div>
        <div style={s.title}>COMPLETE YOUR PROFILE</div>
        <div style={s.subtitle}>
          Welcome, <span style={{ color:'#e8e4dc' }}>{user.username}</span>. Enter your physical stats to get matched with fighters in your weight class.
        </div>

        {weightClass && (
          <div style={s.weightPreview}>
            <div style={s.weightPreviewLabel}>YOUR WEIGHT CLASS</div>
            <div style={s.weightPreviewValue}>{weightClass}</div>
          </div>
        )}

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Stack on mobile, side by side on larger screens */}
          <div style={s.rowFields}>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', flex:1 }}>
              <label style={s.label}>HEIGHT (CM)</label>
              <input style={s.input} type="number" placeholder="175"
                value={form.heightCm} onChange={e => setForm({...form, heightCm: e.target.value})} required />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', flex:1 }}>
              <label style={s.label}>WEIGHT (KG)</label>
              <input style={s.input} type="number" placeholder="70"
                value={form.weightKg} onChange={e => setForm({...form, weightKg: e.target.value})} required />
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            <label style={s.label}>REACH (CM) — OPTIONAL</label>
            <input style={s.input} type="number" placeholder="180"
              value={form.reachCm} onChange={e => setForm({...form, reachCm: e.target.value})} />
          </div>

          {/* Compact weight class reference */}
          <div style={s.classRef}>
            <div style={s.classRefTitle}>WEIGHT CLASS REFERENCE</div>
            <div style={s.classGrid}>
              {WEIGHT_CLASSES.map(w => (
                <div key={w.label} style={{ ...s.classItem, ...(weightClass === w.label ? s.classItemActive : {}) }}>
                  <span style={s.classMax}>≤{w.max}kg</span>
                  <span style={s.classLabel}>{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button style={s.btn} type="submit" disabled={saving}>
            {saving ? 'SAVING...' : 'ENTER THE ARENA →'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  root:   { alignItems:'center', background:'#0a0a0a', display:'flex', justifyContent:'center', minHeight:'100vh', padding:'16px', fontFamily:"'Inter', sans-serif" },
  card:   { background:'#0d0d0d', border:'1px solid #1c1c1c', borderTop:'2px solid #cc2200', borderRadius:'4px', display:'flex', flexDirection:'column', gap:'16px', maxWidth:'480px', padding:'clamp(20px, 5vw, 32px)', width:'100%' },
  logo:   { color:'#e8e4dc', fontFamily:"'Bebas Neue', 'Arial Black', sans-serif", fontSize:'28px', letterSpacing:'0.06em', lineHeight:1 },
  accent: { color:'#cc2200' },
  title:  { color:'#e8e4dc', fontFamily:"'Bebas Neue', sans-serif", fontSize:'20px', letterSpacing:'0.08em', lineHeight:1 },
  subtitle: { color:'#4a4a4a', fontSize:'13px', lineHeight:'1.6', letterSpacing:'0.02em' },
  weightPreview: { background:'#111', border:'1px solid #1c1c1c', borderLeft:'3px solid #cc2200', borderRadius:'2px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px' },
  weightPreviewLabel: { color:'#4a4a4a', fontSize:'9px', fontWeight:'700', letterSpacing:'0.15em' },
  weightPreviewValue: { color:'#cc2200', fontFamily:"'Bebas Neue', sans-serif", fontSize:'18px', letterSpacing:'0.06em' },
  error:  { background:'#1a0800', border:'1px solid #cc2200', borderRadius:'2px', color:'#cc2200', fontSize:'12px', padding:'10px 12px' },
  form:   { display:'flex', flexDirection:'column', gap:'12px' },
  rowFields: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' },
  label:  { color:'#4a4a4a', fontSize:'9px', fontWeight:'700', letterSpacing:'0.15em' },
  input:  { background:'#111', border:'1px solid #1c1c1c', borderRadius:'2px', color:'#e8e4dc', fontSize:'14px', outline:'none', padding:'12px', width:'100%' },
  classRef: { background:'#080808', border:'1px solid #1c1c1c', borderRadius:'2px', padding:'10px' },
  classRefTitle: { color:'#2a2a2a', fontSize:'9px', fontWeight:'700', letterSpacing:'0.15em', marginBottom:'8px' },
  classGrid: { display:'flex', flexDirection:'column', gap:'3px' },
  classItem: { alignItems:'center', borderRadius:'2px', display:'flex', justifyContent:'space-between', padding:'4px 6px' },
  classItemActive: { background:'#cc220022', border:'1px solid #cc220044' },
  classMax:  { color:'#3a3a3a', fontSize:'10px', fontWeight:'700', letterSpacing:'0.06em' },
  classLabel:{ color:'#3a3a3a', fontSize:'10px', letterSpacing:'0.04em' },
  btn:    { background:'#cc2200', border:'none', borderRadius:'2px', color:'#e8e4dc', cursor:'pointer', fontFamily:"'Bebas Neue', sans-serif", fontSize:'18px', letterSpacing:'0.1em', padding:'14px', marginTop:'4px' },
};
