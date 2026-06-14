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

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showChallenge, setShowChallenge] = useState(false);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/fighter/${id}`);
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Fighter not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div style={s.loadingScreen}>Loading fighter...</div>;
  }

  if (error || !profile) {
    return (
      <div style={s.loadingScreen}>
        <div style={{ marginBottom: '12px' }}>{error || 'Fighter not found'}</div>
        <Link href="/map" style={s.backLink}>← Back to map</Link>
      </div>
    );
  }

  const isOwn = !authLoading && myFighter && profile._id === myFighter._id;

  return (
    <div style={s.root}>
      {/* Navbar */}
      <div style={s.navbar}>
        <Link href="/map" style={s.back}>← Map</Link>
        <span style={s.navTitle}>Fighter Profile</span>
        <button style={s.shareBtn} onClick={handleCopyLink}>
          {copied ? '✓ Copied' : '🔗 Share'}
        </button>
      </div>

      <div style={s.content}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.avatar}>{profile.username?.[0]?.toUpperCase() || '?'}</div>
          <div style={s.name}>{profile.username}</div>
          <div style={s.subtitle}>{profile.weightClass}</div>
          {profile.availableToFight && (
            <div style={s.availableTag}>🟢 Available to fight</div>
          )}
        </div>

        {/* Stats grid */}
        <div className="stats-grid-4" style={s.statsGrid}>
          <Stat label="ELO Rating"   value={profile.eloRating} highlight />
          <Stat label="Wins"         value={profile.wins} />
          <Stat label="Losses"       value={profile.losses} />
          <Stat label="Win Rate"     value={profile.winRate} />
          <Stat label="Height"       value={`${profile.heightCm} cm`} />
          <Stat label="Weight"       value={`${profile.weightKg} kg`} />
          {profile.reachCm && <Stat label="Reach" value={`${profile.reachCm} cm`} />}
          <Stat label="Total Fights" value={profile.totalFights} />
        </div>

        {/* Badges */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Territory Badges</div>
          {profile.badgesEarned?.length > 0 ? (
            <div className="badge-grid" style={s.badgeGrid}>
              {profile.badgesEarned.map(b => (
                <div key={b._id} style={{ ...s.badgeCard, borderColor: (b.color || '#333') + '55' }}>
                  <div style={s.badgeEmoji}>{b.badgeEmoji}</div>
                  <div style={s.badgeName}>{b.name}</div>
                  <div style={{ ...s.badgeHolder, color: b.color || '#888' }}>👑 Current holder</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={s.emptyBadges}>No territory badges held right now</div>
          )}
        </div>

        {/* Action */}
        {!authLoading && user && !isOwn && (
          <button
            style={{ ...s.actionBtn, ...(profile.availableToFight ? {} : s.actionBtnDisabled) }}
            onClick={() => setShowChallenge(true)}
            disabled={!profile.availableToFight}
          >
            {profile.availableToFight ? '⚔️ Send Challenge' : 'Not available right now'}
          </button>
        )}

        {!authLoading && !user && (
          <Link href="/login" style={s.loginPrompt}>
            Sign in to challenge {profile.username}
          </Link>
        )}

        {isOwn && (
          <div style={s.ownNote}>
            This is your public profile — share the link above so others can find you.
          </div>
        )}
      </div>

      {showChallenge && (
        <ChallengeModal
          fighter={profile}
          onClose={() => setShowChallenge(false)}
          onSent={() => { setShowChallenge(false); alert('Challenge sent! 🥊'); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div style={{ ...s.stat, ...(highlight ? s.statHighlight : {}) }}>
      <div style={{ ...s.statValue, ...(highlight ? { color: '#e63946' } : {}) }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

const s = {
  root:    { background: '#0f0f0f', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  navbar:  { alignItems: 'center', background: '#111', borderBottom: '1px solid #222', display: 'flex', height: '52px', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 },
  back:    { color: '#888', fontSize: '13px', textDecoration: 'none' },
  navTitle:{ color: '#fff', fontSize: '14px', fontWeight: '600' },
  shareBtn:{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#ccc', cursor: 'pointer', fontSize: '12px', fontWeight: '500', padding: '6px 12px' },
  content: { display: 'flex', flexDirection: 'column', gap: '20px', margin: '0 auto', maxWidth: '520px', padding: '24px 16px 48px', width: '100%' },
  header:  { alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 0' },
  avatar:  { alignItems: 'center', background: '#e63946', borderRadius: '50%', color: '#fff', display: 'flex', fontSize: '32px', fontWeight: '700', height: '76px', justifyContent: 'center', width: '76px' },
  name:    { color: '#fff', fontSize: '20px', fontWeight: '700', marginTop: '8px' },
  subtitle:{ color: '#888', fontSize: '13px' },
  availableTag: { background: '#0d2b1a', border: '1px solid #1a5c35', borderRadius: '99px', color: '#4ade80', fontSize: '12px', fontWeight: '600', marginTop: '6px', padding: '4px 12px' },
  statsGrid: { display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(4, 1fr)' },
  stat:    { background: '#161616', border: '1px solid #222', borderRadius: '10px', padding: '12px 6px', textAlign: 'center' },
  statHighlight: { borderColor: '#e6394655' },
  statValue: { color: '#fff', fontSize: '16px', fontWeight: '700' },
  statLabel: { color: '#666', fontSize: '10px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  section: { display: 'flex', flexDirection: 'column', gap: '10px' },
  sectionTitle: { color: '#555', fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase' },
  badgeGrid: { display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' },
  badgeCard: { background: '#161616', border: '1px solid #333', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '14px 8px', textAlign: 'center' },
  badgeEmoji: { fontSize: '28px' },
  badgeName: { color: '#eee', fontSize: '13px', fontWeight: '600' },
  badgeHolder: { fontSize: '11px', fontWeight: '500' },
  emptyBadges: { background: '#161616', border: '1px solid #222', borderRadius: '10px', color: '#555', fontSize: '13px', padding: '24px', textAlign: 'center' },
  actionBtn: { background: '#e63946', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: '600', padding: '14px' },
  actionBtnDisabled: { background: '#222', color: '#555', cursor: 'not-allowed' },
  loginPrompt: { background: '#1a1a2e', border: '1px solid #2d2d5e', borderRadius: '10px', color: '#a78bfa', fontSize: '14px', fontWeight: '500', padding: '14px', textAlign: 'center', textDecoration: 'none' },
  ownNote: { color: '#555', fontSize: '12px', lineHeight: '1.6', textAlign: 'center' },
  loadingScreen: { alignItems: 'center', background: '#0f0f0f', color: '#888', display: 'flex', flexDirection: 'column', fontSize: '14px', height: '100vh', justifyContent: 'center', gap: '12px' },
  backLink: { color: '#e63946', fontSize: '13px', textDecoration: 'none' },
};
