'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShareInviteModal from './ShareInviteModal';

export default function FighterCard({ fighter, onChallenge, isOwn, currentFighter }) {
  const [showShare, setShowShare] = useState(false);
  if (!fighter) return null;

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.avatar}>{fighter.username?.[0]?.toUpperCase() || '?'}</div>
        <div style={s.headerInfo}>
          <div style={s.username}>{fighter.username || 'Fighter'}</div>
          <div style={s.weightClass}>{fighter.weightClass}</div>
        </div>
        {fighter.availableToFight && !isOwn && (
          <div style={s.availableBadge}>● AVAILABLE</div>
        )}
        {isOwn && <div style={s.ownBadge}>YOU</div>}
      </div>

      {/* ELO bar */}
      <div style={s.eloBar}>
        <div style={s.eloLabel}>ELO RATING</div>
        <div style={s.eloValue}>{fighter.eloRating}</div>
        <div style={s.eloRecord}>{fighter.wins}W — {fighter.losses}L</div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid-4" style={s.statsGrid}>
        <Stat label="WIN RATE" value={fighter.winRate} />
        <Stat label="FIGHTS"   value={fighter.totalFights} />
        <Stat label="HEIGHT"   value={fighter.heightCm ? `${fighter.heightCm}cm` : '—'} />
        <Stat label="WEIGHT"   value={fighter.weightKg ? `${fighter.weightKg}kg` : '—'} />
      </div>

      {/* Badges */}
      {fighter.badgesEarned?.length > 0 && (
        <div style={s.badgeRow}>
          <span style={s.badgeRowLabel}>TERRITORY</span>
          <div style={s.badgePills}>
            {fighter.badgesEarned.slice(0, 4).map((b, i) => (
              <span key={i} style={s.badgePill}>
                {typeof b === 'object' ? `${b.badgeEmoji} ${b.name}` : '🏅'}
              </span>
            ))}
            {fighter.badgesEarned.length > 4 && (
              <span style={s.badgePill}>+{fighter.badgesEarned.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={s.actions}>
        {fighter._id && (
          <Link href={`/fighter/${fighter._id}`} style={s.profileLink}>
            VIEW FULL PROFILE →
          </Link>
        )}

        {!isOwn && fighter.availableToFight && onChallenge && (
          <button style={s.challengeBtn} onClick={() => onChallenge(fighter)}>
            ⚔ CHALLENGE
          </button>
        )}

        {/* Show invite button when fighter is NOT available OR always as secondary option */}
        {!isOwn && currentFighter && (
          <button style={s.inviteBtn} onClick={() => setShowShare(true)}>
            📤 INVITE TO FIGHT
          </button>
        )}

        {!isOwn && !fighter.availableToFight && (
          <div style={s.notAvailable}>NOT AVAILABLE RIGHT NOW</div>
        )}
      </div>

      {showShare && currentFighter && (
        <ShareInviteModal
          challenger={currentFighter}
          fighter={fighter}
          onClose={() => setShowShare(false)}
        />
      )}
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

const s = {
  card: {
    background: '#0f0f0f', border: '1px solid #1c1c1c',
    borderRadius: '4px', display: 'flex',
    flexDirection: 'column', gap: '12px',
    padding: '14px', fontFamily: "'Inter', sans-serif",
  },
  header: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: {
    width: '42px', height: '42px', borderRadius: '2px',
    background: '#cc2200', color: '#e8e4dc',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontWeight: '700',
    fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em', flexShrink: 0,
  },
  headerInfo: { flex: 1, minWidth: 0 },
  username: {
    color: '#e8e4dc', fontSize: '15px', fontWeight: '700',
    fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  weightClass: { color: '#4a4a4a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' },
  availableBadge: { color: '#4ade80', fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', flexShrink: 0 },
  ownBadge: { background: '#cc2200', borderRadius: '2px', color: '#e8e4dc', fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', padding: '2px 6px', flexShrink: 0 },
  eloBar: { background: '#111', border: '1px solid #1c1c1c', borderLeft: '3px solid #cc2200', borderRadius: '2px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '12px' },
  eloLabel: { color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', flexShrink: 0 },
  eloValue: { color: '#cc2200', fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '0.04em', lineHeight: 1 },
  eloRecord: { color: '#3a3a3a', fontSize: '11px', fontWeight: '600', marginLeft: 'auto', letterSpacing: '0.04em' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' },
  stat: { background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', padding: '8px 4px', textAlign: 'center' },
  statValue: { color: '#e8e4dc', fontSize: '13px', fontWeight: '700', letterSpacing: '0.02em' },
  statLabel: { color: '#4a4a4a', fontSize: '8px', fontWeight: '600', letterSpacing: '0.1em', marginTop: '3px' },
  badgeRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  badgeRowLabel: { color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.12em', flexShrink: 0 },
  badgePills: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  badgePill: { background: '#1a1000', border: '1px solid #3a2800', borderRadius: '2px', color: '#f59e0b', fontSize: '10px', fontWeight: '600', padding: '2px 6px' },
  actions: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' },
  profileLink: { color: '#4a4a4a', display: 'block', fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em', textAlign: 'center', textDecoration: 'none', padding: '6px', border: '1px solid #1c1c1c', borderRadius: '2px' },
  challengeBtn: { background: '#cc2200', border: 'none', borderRadius: '2px', color: '#e8e4dc', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', fontWeight: '400', letterSpacing: '0.1em', padding: '10px', width: '100%' },
  inviteBtn: { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', letterSpacing: '0.08em', padding: '9px', width: '100%' },
  notAvailable: { border: '1px solid #1c1c1c', borderRadius: '2px', color: '#3a3a3a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em', padding: '8px', textAlign: 'center' },
};
