'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [zones,   setZones]   = useState([]);
  const [tab,     setTab]     = useState('badges');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/zone/leaderboard'), api.get('/zone/all')])
      .then(([l, z]) => { setLeaders(l.data); setZones(z.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={s.root}>
      <div style={s.navbar}>
        <Link href="/map" style={s.back}>← MAP</Link>
        <div style={s.logo}>FIGHT<span style={s.accent}>CLUB</span></div>
        <div style={{ width: 60 }} />
      </div>

      <div style={s.pageHeader}>
        <div style={s.pageTitle}>LEADERBOARD</div>
        <div style={s.pageSub}>Territory holders &amp; top fighters</div>
      </div>

      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'badges' ? s.tabActive : {}) }} onClick={() => setTab('badges')}>🏅 BADGES</button>
        <button style={{ ...s.tab, ...(tab === 'zones'  ? s.tabActive : {}) }} onClick={() => setTab('zones')}>🗺 ZONES</button>
      </div>

      <div style={s.content}>
        {loading ? <div style={s.loading}>LOADING...</div>
          : tab === 'badges' ? <BadgeLeaderboard leaders={leaders} />
          : <ZoneList zones={zones} />}
      </div>
    </div>
  );
}

function BadgeLeaderboard({ leaders }) {
  if (leaders.length === 0) return (
    <div style={s.empty}>
      <div style={s.emptyIcon}>🏅</div>
      <div style={s.emptyTitle}>NO BADGE HOLDERS YET</div>
      <div style={s.emptyHint}>Win fights in a city zone to claim the badge</div>
    </div>
  );
  return (
    <div style={s.list}>
      {leaders.map((fighter, i) => (
        <Link key={fighter._id} href={`/fighter/${fighter._id}`} style={s.leaderCard}>
          <div style={{ ...s.rank, color: i===0?'#f59e0b':i===1?'#9ca3af':i===2?'#b45309':'#3a3a3a', borderColor: i===0?'#f59e0b33':i===1?'#9ca3af33':i===2?'#b4530933':'#1c1c1c' }}>
            {i < 3 ? ['①','②','③'][i] : `#${i+1}`}
          </div>
          <div style={s.leaderAvatar}>{fighter.username?.[0]?.toUpperCase()}</div>
          <div style={s.leaderInfo}>
            <div style={s.leaderName}>{fighter.username}</div>
            <div style={s.leaderMeta}>ELO {fighter.eloRating} · {fighter.wins}W {fighter.losses}L</div>
            <div style={s.badgeRow}>
              {fighter.badges.slice(0,3).map(b => <span key={b.name} style={s.badgePill}>{b.emoji} {b.name}</span>)}
              {fighter.badges.length > 3 && <span style={s.badgePill}>+{fighter.badges.length-3}</span>}
            </div>
          </div>
          <div style={s.badgeCount}>
            <div style={s.badgeCountNum}>{fighter.badgeCount}</div>
            <div style={s.badgeCountLabel}>BADGES</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ZoneList({ zones }) {
  return (
    <div style={s.list}>
      {zones.map(zone => (
        <div key={zone._id} style={{ ...s.zoneCard, borderLeft: `3px solid ${zone.color}` }}>
          <div style={s.zoneEmoji}>{zone.badgeEmoji}</div>
          <div style={s.zoneInfo}>
            <div style={s.zoneName}>{zone.name}</div>
            <div style={s.zoneState}>{zone.state}</div>
          </div>
          <div style={s.zoneRight}>
            {zone.holder
              ? <><div style={{ color: zone.color, fontSize:'11px', fontWeight:'700', letterSpacing:'0.06em' }}>👑 {zone.holder.username}</div><div style={{ color:'#3a3a3a', fontSize:'10px', marginTop:'2px' }}>ELO {zone.holder.eloRating}</div></>
              : <div style={{ color:'#3a3a3a', fontSize:'10px', fontWeight:'700', letterSpacing:'0.1em' }}>UNCLAIMED</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

const s = {
  root:    { background:'#0a0a0a', minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:"'Inter', sans-serif" },
  navbar:  { alignItems:'center', background:'#0d0d0d', borderBottom:'1px solid #1c1c1c', display:'flex', height:'48px', justifyContent:'space-between', padding:'0 16px', flexShrink:0 },
  back:    { color:'#4a4a4a', fontSize:'10px', fontWeight:'700', letterSpacing:'0.15em', textDecoration:'none' },
  logo:    { color:'#e8e4dc', fontFamily:"'Bebas Neue', 'Arial Black', sans-serif", fontSize:'22px', letterSpacing:'0.06em' },
  accent:  { color:'#cc2200' },
  pageHeader: { padding:'20px 16px 0' },
  pageTitle:  { color:'#e8e4dc', fontFamily:"'Bebas Neue', sans-serif", fontSize:'clamp(28px, 8vw, 40px)', letterSpacing:'0.06em', lineHeight:1 },
  pageSub:    { color:'#4a4a4a', fontSize:'11px', fontWeight:'600', letterSpacing:'0.1em', marginTop:'4px' },
  tabs:    { display:'flex', borderBottom:'1px solid #1c1c1c', padding:'0 16px', marginTop:'16px' },
  tab:     { background:'transparent', border:'none', borderBottom:'2px solid transparent', color:'#3a3a3a', cursor:'pointer', fontFamily:"'Bebas Neue', sans-serif", fontSize:'14px', letterSpacing:'0.1em', padding:'10px 16px', marginBottom:'-1px' },
  tabActive: { color:'#e8e4dc', borderBottomColor:'#cc2200' },
  content: { flex:1, overflow:'auto', padding:'16px' },
  loading: { color:'#3a3a3a', fontFamily:"'Bebas Neue', sans-serif", fontSize:'16px', letterSpacing:'0.15em', padding:'48px', textAlign:'center' },
  empty:   { textAlign:'center', padding:'60px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' },
  emptyIcon: { fontSize:'40px' }, emptyTitle: { color:'#3a3a3a', fontFamily:"'Bebas Neue', sans-serif", fontSize:'20px', letterSpacing:'0.1em' }, emptyHint: { color:'#2a2a2a', fontSize:'12px' },
  list:    { display:'flex', flexDirection:'column', gap:'8px', maxWidth:'600px', margin:'0 auto' },
  leaderCard: { background:'#0d0d0d', border:'1px solid #1c1c1c', borderRadius:'2px', display:'flex', alignItems:'center', gap:'10px', padding:'12px', textDecoration:'none' },
  rank:    { border:'1px solid', borderRadius:'2px', fontFamily:"'Bebas Neue', sans-serif", fontSize:'16px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', width:'30px', flexShrink:0 },
  leaderAvatar: { width:'36px', height:'36px', borderRadius:'2px', background:'#cc2200', color:'#e8e4dc', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue', sans-serif", fontSize:'16px', flexShrink:0 },
  leaderInfo: { flex:1, minWidth:0 },
  leaderName: { color:'#e8e4dc', fontFamily:"'Bebas Neue', sans-serif", fontSize:'15px', letterSpacing:'0.06em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  leaderMeta: { color:'#4a4a4a', fontSize:'10px', fontWeight:'600', letterSpacing:'0.08em', marginTop:'2px' },
  badgeRow:   { display:'flex', flexWrap:'wrap', gap:'4px', marginTop:'5px' },
  badgePill:  { background:'#1a1000', border:'1px solid #3a2800', borderRadius:'2px', color:'#f59e0b', fontSize:'10px', fontWeight:'600', padding:'2px 6px' },
  badgeCount: { textAlign:'right', flexShrink:0 },
  badgeCountNum: { color:'#cc2200', fontFamily:"'Bebas Neue', sans-serif", fontSize:'24px', lineHeight:1 },
  badgeCountLabel: { color:'#4a4a4a', fontSize:'8px', fontWeight:'700', letterSpacing:'0.15em', marginTop:'2px' },
  zoneCard:  { background:'#0d0d0d', border:'1px solid #1c1c1c', borderRadius:'2px', display:'flex', alignItems:'center', gap:'10px', padding:'12px' },
  zoneEmoji: { fontSize:'20px', flexShrink:0 },
  zoneInfo:  { flex:1 },
  zoneName:  { color:'#e8e4dc', fontFamily:"'Bebas Neue', sans-serif", fontSize:'14px', letterSpacing:'0.06em' },
  zoneState: { color:'#3a3a3a', fontSize:'10px', fontWeight:'600', letterSpacing:'0.08em', marginTop:'2px' },
  zoneRight: { textAlign:'right' },
};
