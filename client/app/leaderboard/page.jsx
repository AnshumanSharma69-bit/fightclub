'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaders, setLeaders] = useState([]);
  const [zones,   setZones]   = useState([]);
  const [tab,     setTab]     = useState('badges'); // 'badges' | 'zones'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lRes, zRes] = await Promise.all([
          api.get('/zone/leaderboard'),
          api.get('/zone/all'),
        ]);
        setLeaders(lRes.data);
        setZones(zRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={s.root}>
      {/* Navbar */}
      <div style={s.navbar}>
        <Link href="/map" style={s.back}>← Map</Link>
        <span style={s.logo}>🏆 Leaderboard</span>
        <div style={{ width: 60 }} />
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(tab === 'badges' ? s.tabActive : {}) }}
          onClick={() => setTab('badges')}
        >
          🏅 Badge Holders
        </button>
        <button
          style={{ ...s.tab, ...(tab === 'zones' ? s.tabActive : {}) }}
          onClick={() => setTab('zones')}
        >
          🗺️ All Zones
        </button>
      </div>

      <div style={s.content}>
        {loading ? (
          <div style={s.loading}>Loading...</div>
        ) : tab === 'badges' ? (
          <BadgeLeaderboard leaders={leaders} />
        ) : (
          <ZoneList zones={zones} />
        )}
      </div>
    </div>
  );
}

function BadgeLeaderboard({ leaders }) {
  if (leaders.length === 0) {
    return (
      <div style={s.empty}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🥊</div>
        <div style={{ color: '#888', fontSize: '15px' }}>No badge holders yet</div>
        <div style={{ color: '#555', fontSize: '13px', marginTop: '6px' }}>
          Win fights in a city to claim its badge
        </div>
      </div>
    );
  }

  return (
    <div style={s.list}>
      {leaders.map((fighter, i) => (
        <div key={fighter._id} style={s.leaderCard}>
          <div style={s.rank}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
          </div>
          <div style={s.leaderAvatar}>{fighter.username?.[0]?.toUpperCase()}</div>
          <div style={s.leaderInfo}>
            <div style={s.leaderName}>{fighter.username}</div>
            <div style={s.leaderMeta}>
              ELO {fighter.eloRating} · {fighter.wins}W {fighter.losses}L
            </div>
            <div style={s.badgeRow}>
              {fighter.badges.map(b => (
                <span key={b.name} style={s.badgePill}>
                  {b.emoji} {b.name}
                </span>
              ))}
            </div>
          </div>
          <div style={s.badgeCount}>{fighter.badgeCount} 🏅</div>
        </div>
      ))}
    </div>
  );
}

function ZoneList({ zones }) {
  return (
    <div style={s.list}>
      {zones.map(zone => (
        <div key={zone._id} style={{ ...s.zoneCard, borderLeft: `3px solid ${zone.color}` }}>
          <div style={{ fontSize: '24px' }}>{zone.badgeEmoji}</div>
          <div style={s.zoneInfo}>
            <div style={s.zoneName}>{zone.name}</div>
            <div style={s.zoneMeta}>{zone.state}</div>
          </div>
          <div style={s.zoneHolder}>
            {zone.holder ? (
              <>
                <div style={{ color: zone.color, fontSize: '12px', fontWeight: '600' }}>
                  👑 {zone.holder.username}
                </div>
                <div style={{ color: '#555', fontSize: '11px' }}>
                  ELO {zone.holder.eloRating}
                </div>
              </>
            ) : (
              <div style={{ color: '#444', fontSize: '12px' }}>Unclaimed</div>
            )}
          </div>
          {zone.captureCount > 0 && (
            <div style={s.captureCount}>🔄 {zone.captureCount}</div>
          )}
        </div>
      ))}
    </div>
  );
}

const s = {
  root:    { background: '#0f0f0f', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  navbar:  { alignItems: 'center', background: '#111', borderBottom: '1px solid #222', display: 'flex', height: '52px', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 },
  back:    { color: '#888', fontSize: '13px', textDecoration: 'none' },
  logo:    { color: '#fff', fontSize: '17px', fontWeight: '600' },
  tabs:    { display: 'flex', borderBottom: '1px solid #222', padding: '0 16px' },
  tab:     { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#666', cursor: 'pointer', fontSize: '13px', fontWeight: '500', padding: '12px 16px', marginBottom: '-1px' },
  tabActive: { color: '#fff', borderBottom: '2px solid #e63946' },
  content: { flex: 1, overflow: 'auto', padding: '16px' },
  loading: { color: '#666', fontSize: '14px', textAlign: 'center', padding: '40px' },
  empty:   { textAlign: 'center', padding: '60px 20px' },
  list:    { display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px', margin: '0 auto' },
  leaderCard: { background: '#161616', border: '1px solid #222', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' },
  rank:    { color: '#888', fontSize: '18px', width: '32px', textAlign: 'center', flexShrink: 0 },
  leaderAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#e63946', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', flexShrink: 0 },
  leaderInfo: { flex: 1 },
  leaderName: { color: '#fff', fontSize: '14px', fontWeight: '600' },
  leaderMeta: { color: '#666', fontSize: '12px', marginTop: '2px' },
  badgeRow:   { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' },
  badgePill:  { background: '#1a1a1a', border: '1px solid #333', borderRadius: '99px', color: '#ccc', fontSize: '11px', padding: '2px 8px' },
  badgeCount: { color: '#f59e0b', fontSize: '18px', fontWeight: '700', flexShrink: 0 },
  zoneCard:   { background: '#161616', border: '1px solid #222', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' },
  zoneInfo:   { flex: 1 },
  zoneName:   { color: '#fff', fontSize: '14px', fontWeight: '600' },
  zoneMeta:   { color: '#555', fontSize: '12px', marginTop: '2px' },
  zoneHolder: { textAlign: 'right' },
  captureCount: { color: '#555', fontSize: '12px', flexShrink: 0 },
};
