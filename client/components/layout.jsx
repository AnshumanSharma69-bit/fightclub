'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function NotificationsPanel({ challenges, fighterId, onUpdate }) {
  const [confirming, setConfirming] = useState(null);
  const [loading, setLoading]       = useState(false);

  const pending  = challenges.filter(c => c.status === 'pending'  && c.defenderId?._id === fighterId);
  const accepted = challenges.filter(c => c.status === 'accepted');
  const recent   = challenges.filter(c => ['completed','declined'].includes(c.status)).slice(0, 5);

  const handleAccept = async (challengeId) => {
    setLoading(true);
    try {
      await api.post(`/challenge/${challengeId}/accept`);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (challengeId) => {
    setLoading(true);
    try {
      await api.post(`/challenge/${challengeId}/decline`);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to decline');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResult = async (challengeId, winnerId) => {
    setLoading(true);
    try {
      const res = await api.post(`/challenge/${challengeId}/confirm`, { winnerId });
      alert(res.data.message);
      setConfirming(null);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm');
    } finally {
      setLoading(false);
    }
  };

  if (challenges.length === 0) {
    return (
      <div style={styles.empty}>
        No challenges yet.<br />
        <span style={{ color: '#555' }}>Tap a fighter pin to challenge them.</span>
      </div>
    );
  }

  return (
    <div style={styles.root}>

      {/* ── Incoming challenges ─────────────────────────────────── */}
      {pending.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Incoming ({pending.length})</div>
          {pending.map((c) => (
            <div key={c._id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.dot('#e63946')} />
                <span style={styles.cardTitle}>Challenge received</span>
              </div>
              {c.message && <p style={styles.message}>"{c.message}"</p>}
              <div style={styles.btnRow}>
                <button style={styles.declineBtn} onClick={() => handleDecline(c._id)} disabled={loading}>
                  Decline
                </button>
                <button style={styles.acceptBtn} onClick={() => handleAccept(c._id)} disabled={loading}>
                  ✓ Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Accepted fights — show meetup code ──────────────────── */}
      {accepted.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Active Fights</div>
          {accepted.map((c) => {
            const isChallenger = c.challengerId?._id === fighterId;
            const alreadyConfirmed = isChallenger ? c.challengerConfirmed : c.defenderConfirmed;

            return (
              <div key={c._id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.dot('#4ade80')} />
                  <span style={styles.cardTitle}>Fight accepted!</span>
                </div>

                {/* Meetup code */}
                <div style={styles.codeBox}>
                  <div style={styles.codeLabel}>Meetup code</div>
                  <div style={styles.code}>{c.meetupCode}</div>
                  <div style={styles.codeHint}>Share this with your opponent to verify the fight</div>
                </div>

                {/* Confirm result */}
                {!alreadyConfirmed && (
                  confirming === c._id ? (
                    <div>
                      <p style={styles.confirmPrompt}>Who won?</p>
                      <div style={styles.btnRow}>
                        <button
                          style={styles.winBtn}
                          onClick={() => handleConfirmResult(c._id, fighterId)}
                          disabled={loading}
                        >
                          I Won 🏆
                        </button>
                        <button
                          style={styles.loseBtn}
                          onClick={() => handleConfirmResult(
                            c._id,
                            isChallenger ? c.defenderId?._id : c.challengerId?._id
                          )}
                          disabled={loading}
                        >
                          I Lost
                        </button>
                      </div>
                      <button style={styles.cancelConfirm} onClick={() => setConfirming(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button style={styles.confirmBtn} onClick={() => setConfirming(c._id)}>
                      Confirm Result
                    </button>
                  )
                )}

                {alreadyConfirmed && (
                  <div style={styles.waitingMsg}>
                    ⏳ Waiting for opponent to confirm...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recent history ───────────────────────────────────────── */}
      {recent.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Recent</div>
          {recent.map((c) => (
            <div key={c._id} style={{ ...styles.card, opacity: 0.7 }}>
              <div style={styles.cardHeader}>
                <span style={styles.dot(c.status === 'completed' ? '#4ade80' : '#555')} />
                <span style={styles.cardTitle}>
                  {c.status === 'completed' ? 'Fight completed' : 'Challenge declined'}
                </span>
                {c.disputed && <span style={styles.disputedBadge}>Disputed</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', gap: '16px' },
  empty: { color: '#888', fontSize: '13px', lineHeight: '1.6', textAlign: 'center', padding: '20px 0' },
  section: { display: 'flex', flexDirection: 'column', gap: '8px' },
  sectionLabel: {
    color: '#555', fontSize: '11px', fontWeight: '600',
    letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  card: {
    background: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: '10px', padding: '12px',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  dot: (color) => ({
    width: '8px', height: '8px', borderRadius: '50%',
    background: color, flexShrink: 0,
  }),
  cardTitle: { color: '#ccc', fontSize: '13px', fontWeight: '500' },
  message: { color: '#888', fontSize: '13px', fontStyle: 'italic', margin: 0 },
  btnRow: { display: 'flex', gap: '8px' },
  acceptBtn: {
    flex: 2, background: '#0d2b1a', border: '1px solid #1a5c35',
    borderRadius: '8px', color: '#4ade80', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', padding: '8px',
  },
  declineBtn: {
    flex: 1, background: 'transparent', border: '1px solid #333',
    borderRadius: '8px', color: '#666', cursor: 'pointer',
    fontSize: '13px', padding: '8px',
  },
  codeBox: {
    background: '#111', borderRadius: '8px', padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  codeLabel: { color: '#555', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em' },
  code: { color: '#e63946', fontSize: '22px', fontWeight: '700', letterSpacing: '0.15em' },
  codeHint: { color: '#555', fontSize: '11px' },
  confirmBtn: {
    background: '#1a1a2e', border: '1px solid #333',
    borderRadius: '8px', color: '#a78bfa', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', padding: '9px', width: '100%',
  },
  confirmPrompt: { color: '#ccc', fontSize: '13px', margin: '0 0 8px' },
  winBtn: {
    flex: 1, background: '#0d2b1a', border: '1px solid #1a5c35',
    borderRadius: '8px', color: '#4ade80', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', padding: '9px',
  },
  loseBtn: {
    flex: 1, background: '#2a1a1a', border: '1px solid #5c1a1a',
    borderRadius: '8px', color: '#f87171', cursor: 'pointer',
    fontSize: '13px', padding: '9px',
  },
  cancelConfirm: {
    background: 'transparent', border: 'none', color: '#555',
    cursor: 'pointer', fontSize: '12px', padding: '6px', width: '100%',
  },
  waitingMsg: { color: '#888', fontSize: '12px', textAlign: 'center' },
  disputedBadge: {
    background: '#2a1a00', border: '1px solid #5c3d00',
    borderRadius: '99px', color: '#f59e0b', fontSize: '10px',
    fontWeight: '600', marginLeft: 'auto', padding: '2px 8px',
  },
};
