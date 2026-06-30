'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [tab, setTab]         = useState('overview'); // overview | fighters | fights | disputes
  const [stats, setStats]     = useState(null);
  const [fighters, setFighters] = useState([]);
  const [fights, setFights]   = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [fightFilter, setFightFilter] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { router.push('/login'); return; }
      fetchAll();
    }
  }, [authLoading, user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, f, fi, d] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/fighters'),
        api.get('/admin/fights'),
        api.get('/admin/disputes'),
      ]);
      setStats(s.data);
      setFighters(f.data);
      setFights(fi.data);
      setDisputes(d.data);
    } catch (err) {
      if (err.response?.status === 403) setUnauthorized(true);
      else console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async (challengeId, winnerId) => {
    if (!confirm('Resolve this dispute and award the win? This updates ELO and badges immediately.')) return;
    try {
      await api.post(`/admin/disputes/${challengeId}/resolve`, { winnerId });
      alert('Dispute resolved');
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve');
    }
  };

  const handleBanToggle = async (fighterId, currentlyActive) => {
    const action = currentlyActive ? 'ban' : 'unban';
    if (!confirm(`Are you sure you want to ${action} this fighter?`)) return;
    try {
      await api.patch(`/admin/fighters/${fighterId}/ban`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  if (authLoading || loading) {
    return <div style={s.loadingScreen}>LOADING ADMIN DASHBOARD...</div>;
  }

  if (unauthorized) {
    return (
      <div style={s.loadingScreen}>
        <div style={{ color: '#cc2200', fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '0.1em' }}>
          ACCESS DENIED
        </div>
        <div style={{ color: '#4a4a4a', fontSize: '12px', marginTop: '8px' }}>
          Your account does not have admin privileges.
        </div>
        <Link href="/map" style={{ color: '#cc2200', fontSize: '11px', marginTop: '16px', textDecoration: 'none', letterSpacing: '0.1em' }}>
          ← BACK TO MAP
        </Link>
      </div>
    );
  }

  const filteredFighters = fighters.filter(f =>
    !search || f.username.toLowerCase().includes(search.toLowerCase()) || f.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFights = fightFilter ? fights.filter(f => f.status === fightFilter) : fights;

  return (
    <div style={s.root}>
      {/* Navbar */}
      <div style={s.navbar}>
        <Link href="/map" style={s.back}>← EXIT ADMIN</Link>
        <div style={s.logo}>FIGHT<span style={s.accent}>CLUB</span> <span style={s.adminTag}>ADMIN</span></div>
        <div style={{ width: 90 }} />
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { key: 'overview', label: 'OVERVIEW' },
          { key: 'fighters', label: `FIGHTERS (${fighters.length})` },
          { key: 'fights',   label: `FIGHTS (${fights.length})` },
          { key: 'disputes', label: `DISPUTES${disputes.length > 0 ? ` (${disputes.length})` : ''}`, alert: disputes.length > 0 },
        ].map(t => (
          <button
            key={t.key}
            style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}), ...(t.alert ? { color: '#f59e0b' } : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {tab === 'overview' && stats && <Overview stats={stats} />}
        {tab === 'fighters' && (
          <FightersTab
            fighters={filteredFighters}
            search={search}
            setSearch={setSearch}
            onBanToggle={handleBanToggle}
          />
        )}
        {tab === 'fights' && (
          <FightsTab
            fights={filteredFights}
            filter={fightFilter}
            setFilter={setFightFilter}
          />
        )}
        {tab === 'disputes' && (
          <DisputesTab disputes={disputes} onResolve={handleResolveDispute} />
        )}
      </div>
    </div>
  );
}

function Overview({ stats }) {
  const cards = [
    { label: 'TOTAL USERS',       value: stats.totalUsers,        color: '#e8e4dc' },
    { label: 'AVAILABLE NOW',     value: stats.availableNow,      color: '#4ade80' },
    { label: 'FIGHTS TODAY',      value: stats.fightsToday,       color: '#cc2200' },
    { label: 'TOTAL FIGHTS',      value: stats.totalFights,       color: '#e8e4dc' },
    { label: 'PENDING CHALLENGES',value: stats.pendingChallenges, color: '#f59e0b' },
    { label: 'ACTIVE FIGHTS',     value: stats.activeFights,      color: '#4ade80' },
    { label: 'DISPUTED',          value: stats.disputedCount,     color: stats.disputedCount > 0 ? '#f59e0b' : '#4a4a4a' },
    { label: 'ZONES CLAIMED',     value: `${stats.claimedZones}/${stats.totalZones}`, color: '#e8e4dc' },
  ];
  return (
    <div style={s.statsGrid}>
      {cards.map(c => (
        <div key={c.label} style={s.statCard}>
          <div style={{ ...s.statValue, color: c.color }}>{c.value}</div>
          <div style={s.statLabel}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function FightersTab({ fighters, search, setSearch, onBanToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        style={s.searchInput}
        type="text"
        placeholder="SEARCH BY USERNAME OR EMAIL..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div style={s.tableWrap}>
        {fighters.map(f => (
          <div key={f._id} style={{ ...s.fighterRow, opacity: f.isActive ? 1 : 0.5 }}>
            <div style={s.fighterAvatar}>{f.username[0]?.toUpperCase()}</div>
            <div style={s.fighterInfo}>
              <div style={s.fighterName}>
                {f.username}
                {!f.isActive && <span style={s.bannedTag}>BANNED</span>}
                {f.authProvider === 'google' && <span style={s.googleTag}>G</span>}
              </div>
              <div style={s.fighterEmail}>{f.email}</div>
              <div style={s.fighterMeta}>
                {f.weightClass} · ELO {f.eloRating} · {f.wins}W {f.losses}L · {f.badgeCount} badges
                {f.availableToFight && <span style={s.liveTag}>● LIVE</span>}
              </div>
            </div>
            <div style={s.fighterActions}>
              <Link href={`/fighter/${f._id}`} style={s.viewBtn}>VIEW</Link>
              <button
                style={{ ...s.banBtn, ...(f.isActive ? {} : s.unbanBtn) }}
                onClick={() => onBanToggle(f._id, f.isActive)}
              >
                {f.isActive ? 'BAN' : 'UNBAN'}
              </button>
            </div>
          </div>
        ))}
        {fighters.length === 0 && <div style={s.emptyMsg}>No fighters found</div>}
      </div>
    </div>
  );
}

function FightsTab({ fights, filter, setFilter }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={s.filterRow}>
        {['', 'pending', 'accepted', 'completed', 'declined'].map(f => (
          <button
            key={f}
            style={{ ...s.filterChip, ...(filter === f ? s.filterChipActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f === '' ? 'ALL' : f.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={s.tableWrap}>
        {fights.map(f => (
          <div key={f._id} style={s.fightRow}>
            <div style={{
              ...s.statusDot,
              background: f.status === 'completed' ? (f.disputed ? '#f59e0b' : '#4ade80')
                : f.status === 'accepted' ? '#3b82f6'
                : f.status === 'pending'  ? '#888'
                : '#444',
            }} />
            <div style={s.fightInfo}>
              <div style={s.fightMatchup}>{f.challenger} <span style={s.vsText}>vs</span> {f.defender}</div>
              <div style={s.fightMeta}>
                {f.status.toUpperCase()}
                {f.winner && ` · Winner: ${f.winner}`}
                {f.disputed && <span style={s.disputedTag}>DISPUTED</span>}
                {f.meetupCode && ` · Code: ${f.meetupCode}`}
              </div>
            </div>
            <div style={s.fightTime}>{timeAgo(f.updatedAt)}</div>
          </div>
        ))}
        {fights.length === 0 && <div style={s.emptyMsg}>No fights found</div>}
      </div>
    </div>
  );
}

function DisputesTab({ disputes, onResolve }) {
  if (disputes.length === 0) {
    return (
      <div style={s.emptyMsg}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
        No disputes to review
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {disputes.map(d => (
        <div key={d._id} style={s.disputeCard}>
          <div style={s.disputeHeader}>
            <div style={s.disputeMatchup}>{d.challenger} <span style={s.vsText}>vs</span> {d.defender}</div>
            <div style={s.fightTime}>{timeAgo(d.updatedAt)}</div>
          </div>
          <div style={s.disputeCode}>Meetup code: {d.meetupCode}</div>

          <div style={s.proofGrid}>
            <div style={s.proofCol}>
              <div style={s.proofColLabel}>{d.challenger}'S CLAIM</div>
              {d.challengerProofUrl
                ? <img src={d.challengerProofUrl} alt="challenger proof" style={s.disputeImg} />
                : <div style={s.noProofBox}>No proof uploaded</div>}
              <button style={s.resolveBtn} onClick={() => onResolve(d._id, d.challengerId)}>
                AWARD WIN TO {d.challenger.toUpperCase()}
              </button>
            </div>
            <div style={s.proofCol}>
              <div style={s.proofColLabel}>{d.defender}'S CLAIM</div>
              {d.defenderProofUrl
                ? <img src={d.defenderProofUrl} alt="defender proof" style={s.disputeImg} />
                : <div style={s.noProofBox}>No proof uploaded</div>}
              <button style={s.resolveBtn} onClick={() => onResolve(d._id, d.defenderId)}>
                AWARD WIN TO {d.defender.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const s = {
  root:    { background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
  loadingScreen: { alignItems: 'center', background: '#0a0a0a', color: '#3a3a3a', display: 'flex', flexDirection: 'column', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', height: '100vh', justifyContent: 'center', letterSpacing: '0.15em', textAlign: 'center' },

  navbar:  { alignItems: 'center', background: '#0d0d0d', borderBottom: '1px solid #1c1c1c', display: 'flex', height: '48px', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 },
  back:    { color: '#4a4a4a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.15em', textDecoration: 'none' },
  logo:    { color: '#e8e4dc', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '18px', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px' },
  accent:  { color: '#cc2200' },
  adminTag:{ background: '#cc2200', borderRadius: '2px', color: '#e8e4dc', fontSize: '9px', fontFamily: "'Inter', sans-serif", fontWeight: '700', letterSpacing: '0.1em', padding: '2px 6px' },

  tabs:    { display: 'flex', borderBottom: '1px solid #1c1c1c', padding: '0 16px', overflowX: 'auto' },
  tab:     { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#3a3a3a', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', letterSpacing: '0.08em', padding: '12px 14px', marginBottom: '-1px', whiteSpace: 'nowrap' },
  tabActive: { color: '#e8e4dc', borderBottomColor: '#cc2200' },

  content: { flex: 1, overflow: 'auto', padding: '16px', maxWidth: '900px', width: '100%', margin: '0 auto' },

  statsGrid: { display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' },
  statCard:  { background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '2px', padding: '16px' },
  statValue: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', letterSpacing: '0.04em', lineHeight: 1 },
  statLabel: { color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', marginTop: '6px' },

  searchInput: { background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#e8e4dc', fontSize: '13px', fontWeight: '600', letterSpacing: '0.06em', outline: 'none', padding: '11px 14px', width: '100%' },
  tableWrap:   { display: 'flex', flexDirection: 'column', gap: '6px' },
  emptyMsg:    { color: '#2a2a2a', fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', padding: '40px', textAlign: 'center' },

  fighterRow:    { alignItems: 'center', background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '2px', display: 'flex', gap: '12px', padding: '12px' },
  fighterAvatar: { width: '36px', height: '36px', borderRadius: '2px', background: '#cc2200', color: '#e8e4dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', flexShrink: 0 },
  fighterInfo:   { flex: 1, minWidth: 0 },
  fighterName:   { color: '#e8e4dc', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' },
  fighterEmail:  { color: '#4a4a4a', fontSize: '11px', marginTop: '2px' },
  fighterMeta:   { color: '#3a3a3a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.04em', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  bannedTag:     { background: '#1a0800', border: '1px solid #cc2200', borderRadius: '2px', color: '#cc2200', fontSize: '8px', fontWeight: '700', letterSpacing: '0.1em', padding: '1px 5px' },
  googleTag:     { background: '#1a1a2e', borderRadius: '2px', color: '#a78bfa', fontSize: '9px', fontWeight: '700', padding: '1px 5px' },
  liveTag:       { color: '#4ade80', fontWeight: '700' },
  fighterActions:{ display: 'flex', gap: '6px', flexShrink: 0 },
  viewBtn:       { background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#4a4a4a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', padding: '6px 10px', textDecoration: 'none' },
  banBtn:        { background: '#1a0800', border: '1px solid #5c2200', borderRadius: '2px', color: '#cc2200', cursor: 'pointer', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', padding: '6px 10px' },
  unbanBtn:      { background: '#0a1f0a', border: '1px solid #1a5c1a', color: '#4ade80' },

  filterRow:    { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterChip:   { background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '99px', color: '#4a4a4a', cursor: 'pointer', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', padding: '6px 12px' },
  filterChipActive: { background: '#cc2200', borderColor: '#cc2200', color: '#e8e4dc' },

  fightRow:     { alignItems: 'center', background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '2px', display: 'flex', gap: '10px', padding: '12px' },
  statusDot:    { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  fightInfo:    { flex: 1, minWidth: 0 },
  fightMatchup: { color: '#e8e4dc', fontSize: '13px', fontWeight: '600' },
  vsText:       { color: '#3a3a3a', fontSize: '10px', margin: '0 4px' },
  fightMeta:    { color: '#4a4a4a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.03em', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  fightTime:    { color: '#2a2a2a', fontSize: '10px', flexShrink: 0 },
  disputedTag:  { background: '#1a1200', border: '1px solid #5c4400', borderRadius: '2px', color: '#f59e0b', fontSize: '8px', fontWeight: '700', letterSpacing: '0.08em', padding: '1px 5px' },

  disputeCard:  { background: '#0d0d0d', border: '1px solid #5c4400', borderRadius: '2px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' },
  disputeHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  disputeMatchup: { color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '0.04em' },
  disputeCode:  { color: '#3a3a3a', fontSize: '11px', fontWeight: '600' },
  proofGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  proofCol:     { display: 'flex', flexDirection: 'column', gap: '6px' },
  proofColLabel:{ color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em' },
  disputeImg:   { width: '100%', height: '140px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #1c1c1c' },
  noProofBox:   { height: '140px', background: '#080808', border: '1px dashed #1c1c1c', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a2a2a', fontSize: '11px' },
  resolveBtn:   { background: '#1a0a00', border: '1px solid #5c2200', borderRadius: '2px', color: '#cc2200', cursor: 'pointer', fontSize: '10px', fontWeight: '700', letterSpacing: '0.06em', padding: '9px' },
};
