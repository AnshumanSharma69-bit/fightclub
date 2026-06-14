'use client';

import Link from 'next/link';

export default function FighterCard({ fighter, onChallenge, isOwn }) {
  if (!fighter) return null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.avatar}>
          {fighter.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div style={styles.username}>{fighter.username || 'Fighter'}</div>
          <div style={styles.weightClass}>{fighter.weightClass}</div>
        </div>
        {fighter.availableToFight && !isOwn && (
          <div style={styles.availableBadge}>Available</div>
        )}
      </div>

      <div className="stats-grid-4" style={styles.statsGrid}>
        <Stat label="ELO"     value={fighter.eloRating} />
        <Stat label="Wins"    value={fighter.wins} />
        <Stat label="Losses"  value={fighter.losses} />
        <Stat label="Win Rate" value={fighter.winRate} />
        <Stat label="Height"  value={`${fighter.heightCm}cm`} />
        <Stat label="Weight"  value={`${fighter.weightKg}kg`} />
        {fighter.reachCm && <Stat label="Reach" value={`${fighter.reachCm}cm`} />}
        <Stat label="Fights"  value={fighter.totalFights} />
      </div>

      {fighter.badgesEarned?.length > 0 && (
        <div style={styles.badges}>
          <div style={styles.badgesLabel}>Badges</div>
          <div style={styles.badgeCount}>🏅 {fighter.badgesEarned.length}</div>
        </div>
      )}

      {fighter._id && (
        <Link href={`/fighter/${fighter._id}`} style={styles.profileLink}>
          View full profile →
        </Link>
      )}

      {!isOwn && fighter.availableToFight && onChallenge && (
        <button style={styles.challengeBtn} onClick={() => onChallenge(fighter)}>
          ⚔️ Challenge
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  card: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    position: 'relative',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: '#e63946',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    flexShrink: 0,
  },
  username: {
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
  },
  weightClass: {
    color: '#888',
    fontSize: '12px',
    marginTop: '2px',
  },
  availableBadge: {
    background: '#0d2b1a',
    border: '1px solid #1a5c35',
    borderRadius: '99px',
    color: '#4ade80',
    fontSize: '11px',
    fontWeight: '600',
    marginLeft: 'auto',
    padding: '3px 10px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  },
  stat: {
    background: '#111',
    borderRadius: '8px',
    padding: '8px 4px',
    textAlign: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
  },
  statLabel: {
    color: '#555',
    fontSize: '10px',
    marginTop: '2px',
  },
  badges: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  badgesLabel: {
    color: '#888',
    fontSize: '12px',
  },
  badgeCount: {
    color: '#fff',
    fontSize: '13px',
  },
  challengeBtn: {
    background: '#e63946',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    padding: '10px',
    width: '100%',
  },
  profileLink: {
    color: '#888',
    display: 'block',
    fontSize: '12px',
    marginBottom: '4px',
    textAlign: 'center',
    textDecoration: 'none',
  },
};
