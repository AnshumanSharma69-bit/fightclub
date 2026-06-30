'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

const WEIGHT_CLASSES = ['All','Strawweight','Flyweight','Bantamweight','Featherweight','Lightweight','Welterweight','Middleweight','Light Heavyweight','Heavyweight','Super Heavyweight'];

export default function FighterSearchPage() {
  const [fighters, setFighters]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [weightClass, setWeightClass] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy]       = useState('elo');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.get('/fighter/nearby')
      .then(r => setFighters(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = fighters
    .filter(f => {
      if (search && !f.username?.toLowerCase().includes(search.toLowerCase())) return false;
      if (weightClass !== 'All' && f.weightClass !== weightClass) return false;
      if (availableOnly && !f.availableToFight) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'elo')    return (b.eloRating||0) - (a.eloRating||0);
      if (sortBy === 'wins')   return (b.wins||0) - (a.wins||0);
      if (sortBy === 'badges') return (b.badgesEarned?.length||0) - (a.badgesEarned?.length||0);
      return 0;
    });

  return (
    <div style={s.root}>
      <div style={s.navbar}>
        <Link href="/map" style={s.back}>← MAP</Link>
        <div style={s.logo}>FIGHT<span style={s.accent}>CLUB</span></div>
        <button style={s.filterToggle} onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? 'HIDE' : 'FILTER'}
        </button>
      </div>

      <div style={s.pageHeader}>
        <div style={s.pageTitle}>FIGHTERS</div>
        <div style={s.pageSub}>{fighters.length} registered</div>
      </div>

      {/* Search always visible */}
      <div style={s.searchRow}>
        <input
          style={s.searchInput}
          type="text"
          placeholder="SEARCH BY USERNAME..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter panel — toggleable on mobile */}
      {showFilters && (
        <div style={s.filterPanel}>
          <select style={s.select} value={weightClass} onChange={e => setWeightClass(e.target.value)}>
            {WEIGHT_CLASSES.map(w => <option key={w} value={w}>{w === 'All' ? 'ALL CLASSES' : w.toUpperCase()}</option>)}
          </select>
          <select style={s.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="elo">SORT: ELO</option>
            <option value="wins">SORT: WINS</option>
            <option value="badges">SORT: BADGES</option>
          </select>
          <button
            style={{ ...s.availBtn, ...(availableOnly ? s.availBtnOn : {}) }}
            onClick={() => setAvailableOnly(!availableOnly)}
          >
            {availableOnly ? '● AVAILABLE ONLY' : '○ ALL FIGHTERS'}
          </button>
        </div>
      )}

      <div style={s.resultsMeta}>
        {loading ? 'LOADING...' : `${filtered.length} FIGHTER${filtered.length !== 1 ? 'S' : ''}`}
      </div>

      <div style={s.content}>
        {loading ? (
          <div style={s.loading}>LOADING FIGHTERS...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>⚔</div>
            <div style={s.emptyTitle}>NO FIGHTERS FOUND</div>
            <div style={s.emptyHint}>Try adjusting your filters</div>
          </div>
        ) : (
          <div style={s.grid}>
            {filtered.map((fighter, i) => (
              <Link key={fighter._id} href={`/fighter/${fighter._id}`} style={s.card}>
                <div style={s.cardRank}>#{i+1}</div>
                <div style={s.cardTop}>
                  <div style={s.cardAvatar}>{fighter.username?.[0]?.toUpperCase()||'?'}</div>
                  <div style={s.cardInfo}>
                    <div style={s.cardName}>{fighter.username}</div>
                    <div style={s.cardClass}>{fighter.weightClass}</div>
                  </div>
                  {fighter.availableToFight && <div style={s.availDot}>●</div>}
                </div>
                <div style={s.cardStats}>
                  <MiniStat label="ELO"    value={fighter.eloRating} accent />
                  <MiniStat label="W"       value={fighter.wins} />
                  <MiniStat label="L"       value={fighter.losses} />
                  <MiniStat label="BADGES" value={fighter.badgesEarned?.length||0} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div style={s.miniStat}>
      <div style={{ ...s.miniStatVal, ...(accent ? { color:'#cc2200' } : {}) }}>{value}</div>
      <div style={s.miniStatLabel}>{label}</div>
    </div>
  );
}

const s = {
  root:    { background:'#0a0a0a', minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:"'Inter', sans-serif" },
  navbar:  { alignItems:'center', background:'#0d0d0d', borderBottom:'1px solid #1c1c1c', display:'flex', height:'48px', justifyContent:'space-between', padding:'0 16px', flexShrink:0 },
  back:    { color:'#4a4a4a', fontSize:'10px', fontWeight:'700', letterSpacing:'0.15em', textDecoration:'none' },
  logo:    { color:'#e8e4dc', fontFamily:"'Bebas Neue', 'Arial Black', sans-serif", fontSize:'22px', letterSpacing:'0.06em' },
  accent:  { color:'#cc2200' },
  filterToggle: { background:'transparent', border:'1px solid #1c1c1c', borderRadius:'2px', color:'#4a4a4a', cursor:'pointer', fontSize:'9px', fontWeight:'700', letterSpacing:'0.15em', padding:'5px 10px' },
  pageHeader: { padding:'16px 16px 0' },
  pageTitle:  { color:'#e8e4dc', fontFamily:"'Bebas Neue', sans-serif", fontSize:'clamp(28px, 8vw, 36px)', letterSpacing:'0.06em', lineHeight:1 },
  pageSub:    { color:'#4a4a4a', fontSize:'11px', fontWeight:'600', letterSpacing:'0.1em', marginTop:'4px' },
  searchRow:  { padding:'12px 16px 0' },
  searchInput: { background:'#111', border:'1px solid #1c1c1c', borderRadius:'2px', color:'#e8e4dc', fontSize:'13px', fontWeight:'700', letterSpacing:'0.08em', outline:'none', padding:'11px 12px', width:'100%' },
  filterPanel: { display:'flex', gap:'8px', padding:'8px 16px', flexWrap:'wrap' },
  select:  { background:'#111', border:'1px solid #1c1c1c', borderRadius:'2px', color:'#4a4a4a', cursor:'pointer', fontSize:'10px', fontWeight:'700', letterSpacing:'0.1em', outline:'none', padding:'9px 10px', flex:1, minWidth:'120px' },
  availBtn:{ background:'transparent', border:'1px solid #1c1c1c', borderRadius:'2px', color:'#4a4a4a', cursor:'pointer', fontSize:'10px', fontWeight:'700', letterSpacing:'0.1em', padding:'9px 12px', whiteSpace:'nowrap' },
  availBtnOn: { background:'#0a1f0a', borderColor:'#1a5c1a', color:'#4ade80' },
  resultsMeta: { color:'#2a2a2a', fontSize:'9px', fontWeight:'700', letterSpacing:'0.2em', padding:'10px 16px' },
  content: { flex:1, overflow:'auto', padding:'0 16px 48px' },
  loading: { color:'#3a3a3a', fontFamily:"'Bebas Neue', sans-serif", fontSize:'16px', letterSpacing:'0.15em', padding:'48px', textAlign:'center' },
  empty:   { alignItems:'center', display:'flex', flexDirection:'column', gap:'8px', padding:'60px 20px', textAlign:'center' },
  emptyIcon: { color:'#2a2a2a', fontSize:'36px' },
  emptyTitle: { color:'#3a3a3a', fontFamily:"'Bebas Neue', sans-serif", fontSize:'18px', letterSpacing:'0.1em' },
  emptyHint: { color:'#2a2a2a', fontSize:'11px' },
  grid:    { display:'grid', gap:'8px', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))' },
  card:    { background:'#0d0d0d', border:'1px solid #1c1c1c', borderRadius:'2px', display:'flex', flexDirection:'column', gap:'10px', padding:'12px', position:'relative', textDecoration:'none' },
  cardRank:{ color:'#2a2a2a', fontSize:'9px', fontWeight:'700', letterSpacing:'0.12em', position:'absolute', top:'10px', right:'10px' },
  cardTop: { display:'flex', alignItems:'center', gap:'10px' },
  cardAvatar: { width:'36px', height:'36px', borderRadius:'2px', background:'#cc2200', color:'#e8e4dc', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue', sans-serif", fontSize:'16px', flexShrink:0 },
  cardInfo:{ flex:1, minWidth:0 },
  cardName:{ color:'#e8e4dc', fontFamily:"'Bebas Neue', sans-serif", fontSize:'15px', letterSpacing:'0.06em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  cardClass:{ color:'#4a4a4a', fontSize:'9px', fontWeight:'700', letterSpacing:'0.1em', marginTop:'2px' },
  availDot:{ color:'#4ade80', fontSize:'12px', flexShrink:0 },
  cardStats:{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'4px' },
  miniStat: { background:'#111', border:'1px solid #1c1c1c', borderRadius:'2px', padding:'6px 4px', textAlign:'center' },
  miniStatVal:   { color:'#e8e4dc', fontFamily:"'Bebas Neue', sans-serif", fontSize:'15px', lineHeight:1 },
  miniStatLabel: { color:'#3a3a3a', fontSize:'8px', fontWeight:'700', letterSpacing:'0.1em', marginTop:'2px' },
};
