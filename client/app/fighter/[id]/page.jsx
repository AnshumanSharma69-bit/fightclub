'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ChallengeModal from '@/components/ChallengeModal';
import api from '@/lib/api';

export default function FighterProfilePage() {
  const { id } = useParams();
  const { fighter: myFighter, user, loading: authLoading } = useAuth();

  const [profile, setProfile]   = useState(null);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showChallenge, setShowChallenge] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'history'
const [showShare, setShowShare] = useState(false);
// ... at the bottom before closing div:
{showShare && myFighter && (
  <ShareInviteModal
    challenger={{ ...myFighter, username: user?.username }}
    fighter={profile}
    onClose={() => setShowShare(false)}
  />
)}
  useEffect(() => {
    Promise.all([
      api.get(`/fighter/${id}`),
      api.get(`/fighter/${id}/history`),
    ])
      .then(([profileRes, historyRes]) => {
        setProfile(profileRes.data);
        setHistory(historyRes.data);
      })
      .catch(err => setError(err.response?.data?.error || 'Fighter not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <Screen><Spinner /></Screen>;
  if (error || !profile) return (
    <Screen>
      <div style={s.errorText}>{error || 'Fighter not found'}</div>
      <Link href="/map" style={s.backLink}>← BACK TO MAP</Link>
    </Screen>
  );

  const isOwn = !authLoading && myFighter && profile._id === myFighter._id;

  const wins   = history.filter(h => h.result === 'win').length;
  const losses = history.filter(h => h.result === 'loss').length;

  return (
    <div style={s.root}>
      <div style={s.navbar}>
        <Link href="/map" style={s.back}>← MAP</Link>
        <div style={s.navLogo}>FIGHT<span style={s.accent}>CLUB</span></div>
        <button style={s.shareBtn} onClick={handleCopyLink}>
          {copied ? '✓ COPIED' : '🔗 SHARE'}
        </button>
      </div>

      <div style={s.content}>
        {/* Hero */}
        <div style={s.hero}>
          <div style={s.avatar}>{profile.username?.[0]?.toUpperCase() || '?'}</div>
          <div style={s.heroRight}>
            <div style={s.username}>{profile.username}</div>
            <div style={s.weightClass}>{profile.weightClass}</div>
            <div style={s.eloDisplay}>
              <span style={s.eloNum}>{profile.eloRating}</span>
              <span style={s.eloLabel}>ELO</span>
            </div>
            {profile.availableToFight && (
              <div style={s.availableTag}>● AVAILABLE TO FIGHT</div>
            )}
          </div>
        </div>

        {/* Record bar */}
        <div style={s.record}>
          <RecordStat label="WINS"      value={profile.wins}        color="#4ade80" />
          <div style={s.recordDivider} />
          <RecordStat label="LOSSES"    value={profile.losses}      color="#cc2200" />
          <div style={s.recordDivider} />
          <RecordStat label="WIN RATE"  value={profile.winRate}     color="#e8e4dc" />
          <div style={s.recordDivider} />
          <RecordStat label="FIGHTS"    value={profile.totalFights} color="#4a4a4a" />
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button
            style={{ ...s.tab, ...(activeTab === 'stats' ? s.tabActive : {}) }}
            onClick={() => setActiveTab('stats')}
          >
            STATS
          </button>
          <button
            style={{ ...s.tab, ...(activeTab === 'history' ? s.tabActive : {}) }}
            onClick={() => setActiveTab('history')}
          >
            FIGHT HISTORY {history.length > 0 && `(${history.length})`}
          </button>
        </div>

        {/* Stats tab */}
        {activeTab === 'stats' && (
          <>
            <div style={s.section}>
              <div style={s.sectionTitle}>PHYSICAL STATS</div>
              <div className="stats-grid-4" style={s.statsGrid}>
                <Stat label="HEIGHT"  value={`${profile.heightCm}cm`} />
                <Stat label="WEIGHT"  value={`${profile.weightKg}kg`} />
                {profile.reachCm && <Stat label="REACH" value={`${profile.reachCm}cm`} />}
                <Stat label="CLASS"   value={profile.weightClass?.split(' ')[0]} />
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>TERRITORY BADGES</div>
              {profile.badgesEarned?.length > 0 ? (
                <div className="badge-grid" style={s.badgeGrid}>
                  {profile.badgesEarned.map(b => (
                    <div key={b._id} style={{ ...s.badgeCard, borderColor: (b.color || '#cc2200') + '44' }}>
                      <div style={s.badgeEmoji}>{b.badgeEmoji}</div>
                      <div style={s.badgeName}>{b.name}</div>
                      <div style={{ ...s.badgeHolder, color: b.color || '#cc2200' }}>HOLDER</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={s.noBadges}>NO TERRITORY BADGES HELD</div>
              )}
            </div>
          </>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div style={s.section}>
            {history.length === 0 ? (
              <div style={s.noBadges}>NO COMPLETED FIGHTS YET</div>
            ) : (
              <div style={s.timeline}>
                {history.map((fight, i) => (
                  <div key={fight._id} style={s.timelineItem}>
                    {/* Connector line */}
                    {i < history.length - 1 && <div style={s.connector} />}

                    {/* Result dot */}
                    <div style={{
                      ...s.resultDot,
                      background: fight.result === 'win' ? '#4ade80'
                        : fight.result === 'loss' ? '#cc2200'
                        : '#f59e0b',
                    }} />

                    {/* Fight card */}
                    <div style={s.fightCard}>
                      <div style={s.fightTop}>
                        <div style={{
                          ...s.resultTag,
                          background: fight.result === 'win' ? '#0a1f0a'
                            : fight.result === 'loss' ? '#1a0800'
                            : '#1a1200',
                          color: fight.result === 'win' ? '#4ade80'
                            : fight.result === 'loss' ? '#cc2200'
                            : '#f59e0b',
                          borderColor: fight.result === 'win' ? '#1a5c1a'
                            : fight.result === 'loss' ? '#5c1a00'
                            : '#5c4400',
                        }}>
                          {fight.result === 'win' ? '🏆 WIN'
                            : fight.result === 'loss' ? '💀 LOSS'
                            : '⚠ DISPUTED'}
                        </div>

                        <Link href={`/fighter/${fight.opponent._id}`} style={s.opponentLink}>
                          VS {fight.opponent.username.toUpperCase()} →
                        </Link>

                        <div style={s.fightDate}>{formatDate(fight.date)}</div>
                      </div>

                      <div style={s.fightMeta}>
                        {fight.wasChallenger ? 'You challenged' : 'You were challenged'}
                      </div>

                      {/* Proof photos */}
                      {(fight.myProofUrl || fight.oppProofUrl) && (
                        <div style={s.proofRow}>
                          {fight.myProofUrl && (
                            <div style={s.proofThumb}>
                              <img src={fight.myProofUrl} alt="your proof" style={s.proofImg} />
                              <div style={s.proofLabel}>YOUR PROOF</div>
                            </div>
                          )}
                          {fight.oppProofUrl && (
                            <div style={s.proofThumb}>
                              <img src={fight.oppProofUrl} alt="opponent proof" style={s.proofImg} />
                              <div style={s.proofLabel}>THEIR PROOF</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {!authLoading && user && !isOwn && (
          <button
            style={{ ...s.challengeBtn, ...(profile.availableToFight ? {} : s.challengeBtnDisabled) }}
            onClick={() => setShowChallenge(true)}
            disabled={!profile.availableToFight}
          >
            {profile.availableToFight ? `⚔ CHALLENGE ${profile.username.toUpperCase()}` : 'NOT AVAILABLE RIGHT NOW'}
          </button>
        )}
        {!isOwn && user && (
  <button style={{ ...s.challengeBtn, background: 'transparent', border: '1px solid #2a2a2a', color: '#4a4a4a', marginTop: '8px', fontSize: '13px' }}
    onClick={() => setShowShare(true)}>
    📤 INVITE TO FIGHT
  </button>
)}

        {!authLoading && !user && (
          <Link href="/login" style={s.loginPrompt}>
            SIGN IN TO CHALLENGE {profile.username.toUpperCase()} →
          </Link>
        )}

        {isOwn && (
          <div style={s.ownNote}>THIS IS YOUR PUBLIC PROFILE — SHARE THE LINK ABOVE</div>
        )}
      </div>

      {showChallenge && (
        <ChallengeModal
          fighter={profile}
          onClose={() => setShowChallenge(false)}
          onSent={() => { setShowChallenge(false); alert('Challenge sent! ⚔'); }}
        />
      )}
    </div>
  );
}

function Screen({ children }) {
  return (
    <div style={{ alignItems: 'center', background: '#0a0a0a', display: 'flex', flexDirection: 'column', gap: '16px', height: '100vh', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      {children}
    </div>
  );
}

function Spinner() {
  return <div style={{ color: '#3a3a3a', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '0.2em' }}>LOADING...</div>;
}

function RecordStat({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '14px 0' }}>
      <div style={{ color, fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', letterSpacing: '0.04em', lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.15em', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={s.stat}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const s = {
  root:     { background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
  navbar:   { alignItems: 'center', background: '#0d0d0d', borderBottom: '1px solid #1c1c1c', display: 'flex', height: '48px', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 },
  back:     { color: '#4a4a4a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.15em', textDecoration: 'none' },
  navLogo:  { color: '#e8e4dc', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '20px', letterSpacing: '0.06em' },
  accent:   { color: '#cc2200' },
  shareBtn: { background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer', fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', padding: '6px 10px' },
  content:  { display: 'flex', flexDirection: 'column', gap: '20px', margin: '0 auto', maxWidth: '520px', padding: '24px 16px 60px', width: '100%' },

  hero:     { display: 'flex', gap: '20px', alignItems: 'flex-start', paddingBottom: '20px', borderBottom: '1px solid #1c1c1c' },
  avatar:   { width: '72px', height: '72px', borderRadius: '2px', background: '#cc2200', color: '#e8e4dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', letterSpacing: '0.04em', flexShrink: 0 },
  heroRight:{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  username: { color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '0.06em', lineHeight: 1 },
  weightClass: { color: '#4a4a4a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em' },
  eloDisplay: { display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' },
  eloNum:   { color: '#cc2200', fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '0.04em', lineHeight: 1 },
  eloLabel: { color: '#4a4a4a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em' },
  availableTag: { color: '#4ade80', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', marginTop: '4px' },

  record:   { display: 'flex', background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '2px' },
  recordDivider: { width: '1px', background: '#1c1c1c', flexShrink: 0 },

  tabs:     { display: 'flex', borderBottom: '1px solid #1c1c1c', gap: '0' },
  tab:      { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#4a4a4a', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.1em', padding: '10px 16px', marginBottom: '-1px' },
  tabActive:{ color: '#e8e4dc', borderBottomColor: '#cc2200' },

  section:  { display: 'flex', flexDirection: 'column', gap: '10px' },
  sectionTitle: { color: '#3a3a3a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.2em' },
  statsGrid:{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(4, 1fr)' },
  stat:     { background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '2px', padding: '10px 6px', textAlign: 'center' },
  statValue:{ color: '#e8e4dc', fontSize: '14px', fontWeight: '700' },
  statLabel:{ color: '#4a4a4a', fontSize: '8px', fontWeight: '700', letterSpacing: '0.12em', marginTop: '3px' },

  badgeGrid:{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' },
  badgeCard:{ background: '#0d0d0d', border: '1px solid', borderRadius: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '14px 8px', textAlign: 'center' },
  badgeEmoji: { fontSize: '26px' },
  badgeName:  { color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', letterSpacing: '0.06em' },
  badgeHolder:{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', marginTop: '2px' },
  noBadges: { background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#2a2a2a', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.1em', padding: '20px', textAlign: 'center' },

  // Timeline
  timeline: { display: 'flex', flexDirection: 'column', gap: '0' },
  timelineItem: { display: 'flex', gap: '12px', position: 'relative', paddingBottom: '12px' },
  connector:    { position: 'absolute', left: '7px', top: '18px', bottom: '0', width: '2px', background: '#1c1c1c' },
  resultDot:    { width: '16px', height: '16px', borderRadius: '2px', flexShrink: 0, marginTop: '4px' },
  fightCard:    { flex: 1, background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '2px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  fightTop:     { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  resultTag:    { border: '1px solid', borderRadius: '2px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', letterSpacing: '0.08em', padding: '2px 8px', flexShrink: 0 },
  opponentLink: { color: '#4a4a4a', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textDecoration: 'none', flex: 1 },
  fightDate:    { color: '#2a2a2a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', flexShrink: 0 },
  fightMeta:    { color: '#3a3a3a', fontSize: '10px', letterSpacing: '0.04em' },
  proofRow:     { display: 'flex', gap: '8px' },
  proofThumb:   { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  proofImg:     { width: '100%', height: '80px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #1c1c1c' },
  proofLabel:   { color: '#3a3a3a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', textAlign: 'center' },

  challengeBtn: { background: '#cc2200', border: 'none', borderRadius: '2px', color: '#e8e4dc', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', letterSpacing: '0.1em', padding: '16px', width: '100%' },
  challengeBtnDisabled: { background: '#1c1c1c', color: '#3a3a3a', cursor: 'not-allowed' },
  loginPrompt: { background: 'transparent', border: '1px solid #cc2200', borderRadius: '2px', color: '#cc2200', display: 'block', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.1em', padding: '14px', textAlign: 'center', textDecoration: 'none' },
  ownNote:  { color: '#3a3a3a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textAlign: 'center' },
  errorText:{ color: '#cc2200', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '0.1em' },
  backLink: { color: '#4a4a4a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.15em', textDecoration: 'none' },
};
