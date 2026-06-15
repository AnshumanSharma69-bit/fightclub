'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

const WEIGHT_CLASSES = [
  'All', 'Strawweight', 'Flyweight', 'Bantamweight', 'Featherweight',
  'Lightweight', 'Welterweight', 'Middleweight', 'Light Heavyweight',
  'Heavyweight', 'Super Heavyweight',
];

export default function FighterSearchPage() {
  const [fighters, setFighters]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [weightClass, setWeightClass] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy]         = useState('elo'); // elo | wins | badges

  const fetchFighters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/fighter/nearby');
      setFighters(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFighters(); }, [fetchFighters]);

  // Filter + sort client-side
  const filtered = fighters
    .filter(f => {
      if (search && !f.username?.toLowerCase().includes(search.toLowerCase())) return false;
      if (weightClass !== 'All' && f.weightClass !== weightClass) return false;
      if (availableOnly && !f.availableToFight) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'elo')    return (b.eloRating || 0) - (a.eloRating || 0);
      if (sortBy === 'wins')   return (b.wins || 0) - (a.wins || 0);
      if (sortBy === 'badges') return (b.badgesEarned?.length || 0) - (a.badgesEarned?.length || 0);
      return 0;
    });

  return (
    <div style={s.root}>
      {/* Navbar */}
      <div style={s.navbar}>
        <Link href="/map" style={s.back}>← MAP</Link>
        <div style={s.logo}>FIGHT<span style={s.accent}>CLUB</span></div>
        <div style={{ width: 60 }} />
      </div>

      {/* Page header */}
      <div style={s.pageHeader}>
        <div style={s.pageTitle}>FIND FIGHTERS</div>
        <div style={s.pageSub}>{fighters.length} fighters registered</div>
      </div>

      {/* Filters */}
      <div style={s.filters}>
        {/* Search */}
        <input
          style={s.searchInput}
          type="text"
          placeholder="SEARCH BY USERNAME..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Weight class */}
        <select
          style={s.select}
          value={weightClass}
          onChange={e => setWeightClass(e.target.value)}
        >
          {WEIGHT_CLASSES.map(w => (
            <option key={w} value={w}>{w === 'All' ? 'ALL CLASSES' : w.toUpperCase()}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          style={s.select}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="elo">SORT: ELO</option>
          <option value="wins">SORT: WINS</option>
          <option value="badges">SORT: BADGES</option>
        </select>

        {/* Available toggle */}
        <button
          style={{ ...s.availBtn, ...(availableOnly ? s.availBtnOn : {}) }}
          onClick={() => setAvailableOnly(!availableOnly)}
        >
          {availableOnly ? '● AVAILABLE ONLY' : '○ SHOW ALL'}
        </button>
      </div>

      {/* Results count */}
      <div style={s.resultsMeta}>
        {loading ? 'LOADING...' : `${filtered.length} FIGHTER${filtered.length !== 1 ? 'S' : ''} FOUND`}
      </div>

      {/* Fighter list */}
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
                {/* Rank */}
                <div style={s.cardRank}>#{i + 1}</div>

                {/* Avatar + name */}
                <div style={s.cardTop}>
                  <div style={s.cardAvatar}>{fighter.username?.[0]?.toUpperCase() || '?'}</div>
                  <div style={s.cardInfo}>
                    <div style={s.cardName}>{fighter.username}</div>
                    <div style={s.cardClass}>{fighter.weightClass}</div>
                  </div>
                  {fighter.availableToFight && (
                    <div style={s.availDot}>●</div>
                  )}
                </div>

                {/* Stats row */}
                <div style={s.cardStats}>
                  <MiniStat label="ELO"     value={fighter.eloRating} accent />
                  <MiniStat label="W"        value={fighter.wins} />
                  <MiniStat label="L"        value={fighter.losses} />
                  <MiniStat label="BADGES"  value={fighter.badgesEarned?.length || 0} />
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
      <div style={{ ...s.miniStatVal, ...(accent ? { color: '#cc2200' } : {}) }}>{value}</div>
      <div style={s.miniStatLabel}>{label}</div>
    </div>
  );
}

const s = {
  root:     { background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
  navbar:   { alignItems: 'center', background: '#0d0d0d', borderBottom: '1px solid #1c1c1c', display: 'flex', height: '48px', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 },
  back:     { color: '#4a4a4a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.15em', textDecoration: 'none' },
  logo:     { color: '#e8e4dc', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '22px', letterSpacing: '0.06em' },
  accent:   { color: '#cc2200' },
  pageHeader: { padding: '24px 24px 0', borderBottom: '1px solid #1c1c1c', paddingBottom: '16px' },
  pageTitle:  { color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', letterSpacing: '0.06em', lineHeight: 1 },
  pageSub:    { color: '#4a4a4a', fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', marginTop: '4px' },
  filters:  { display: 'flex', gap: '8px', padding: '16px 24px', borderBottom: '1px solid #1c1c1c', flexWrap: 'wrap' },
  searchInput: { background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#e8e4dc', flex: 1, fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', minWidth: '160px', outline: 'none', padding: '9px 12px' },
  select:   { background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', outline: 'none', padding: '9px 12px' },
  availBtn: { background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', padding: '9px 12px', whiteSpace: 'nowrap' },
  availBtnOn: { background: '#0a1f0a', borderColor: '#1a5c1a', color: '#4ade80' },
  resultsMeta: { color: '#2a2a2a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.2em', padding: '10px 24px' },
  content:  { flex: 1, overflow: 'auto', padding: '0 24px 48px' },
  loading:  { color: '#3a3a3a', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '0.15em', padding: '48px', textAlign: 'center' },
  empty:    { alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '8px', padding: '60px 20px', textAlign: 'center' },
  emptyIcon:  { color: '#2a2a2a', fontSize: '36px' },
  emptyTitle: { color: '#3a3a3a', fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', letterSpacing: '0.1em' },
  emptyHint:  { color: '#2a2a2a', fontSize: '11px', letterSpacing: '0.04em' },
  grid:     { display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', paddingTop: '8px' },
  card:     { background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', position: 'relative', textDecoration: 'none', transition: 'border-color 0.15s' },
  cardRank: { color: '#2a2a2a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', position: 'absolute', top: '10px', right: '12px' },
  cardTop:  { display: 'flex', alignItems: 'center', gap: '10px' },
  cardAvatar: { width: '38px', height: '38px', borderRadius: '2px', background: '#cc2200', color: '#e8e4dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardClass:{ color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', marginTop: '2px' },
  availDot: { color: '#4ade80', fontSize: '12px', flexShrink: 0 },
  cardStats:{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' },
  miniStat: { background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', padding: '6px 4px', textAlign: 'center' },
  miniStatVal:   { color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '0.04em', lineHeight: 1 },
  miniStatLabel: { color: '#3a3a3a', fontSize: '8px', fontWeight: '700', letterSpacing: '0.1em', marginTop: '2px' },
};
