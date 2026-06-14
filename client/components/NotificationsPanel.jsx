'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function NotificationsPanel({ challenges, fighterId, onUpdate }) {
  const [confirming, setConfirming] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [resultMsg, setResultMsg]   = useState('');

  // Normalize IDs — populated objects vs plain strings
  const id = (val) => (typeof val === 'object' && val !== null ? val._id?.toString() : val?.toString());

  const incoming  = challenges.filter(c => c.status === 'pending'  && id(c.defenderId) === fighterId);
  const sent      = challenges.filter(c => c.status === 'pending'  && id(c.challengerId) === fighterId);
  const active    = challenges.filter(c => c.status === 'accepted');
  const history   = challenges.filter(c => ['completed', 'declined', 'expired'].includes(c.status));

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

  const handleConfirm = async (challengeId, winnerId) => {
    setLoading(true);
    setResultMsg('');
    try {
      const res = await api.post(`/challenge/${challengeId}/confirm`, { winnerId });
      setResultMsg(res.data.message);
      setConfirming(null);
      onUpdate();
    } catch (err) {
      setResultMsg(err.response?.data?.error || 'Failed to confirm');
    } finally {
      setLoading(false);
    }
  };

  const getName = (fighter) => fighter?.userId?.username || fighter?.username || '?';

  if (challenges.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}>🥊</div>
        <div style={s.emptyText}>No challenges yet</div>
        <div style={s.emptyHint}>Tap a fighter pin on the map and hit Challenge</div>
      </div>
    );
  }

  return (
    <div style={s.root}>

      {resultMsg && (
        <div style={{
          ...s.resultBanner,
          background: resultMsg.includes('⚠️') ? '#2a1f00' : resultMsg.includes('✅') ? '#0d2b1a' : '#1a1a2e',
          borderColor: resultMsg.includes('⚠️') ? '#f59e0b' : resultMsg.includes('✅') ? '#4ade80' : '#a78bfa',
          color:       resultMsg.includes('⚠️') ? '#f59e0b' : resultMsg.includes('✅') ? '#4ade80' : '#a78bfa',
        }}>
          {resultMsg}
        </div>
      )}

      {/* ── Incoming ─────────────────────────────────────────────── */}
      {incoming.length > 0 && (
        <Section label={`Incoming ${incoming.length > 1 ? `(${incoming.length})` : ''}`}>
          {incoming.map(c => (
            <Card key={c._id} accent="#e63946">
              <div style={s.cardTop}>
                <Avatar name={getName(c.challengerId)} color="#e63946" />
                <div>
                  <div style={s.cardName}>{getName(c.challengerId)}</div>
                  <div style={s.cardMeta}>wants to fight you</div>
                </div>
                <div style={s.timePill}>{timeAgo(c.createdAt)}</div>
              </div>
              {c.message && <div style={s.message}>"{c.message}"</div>}
              <div style={s.btnRow}>
                <button style={s.declineBtn} onClick={() => handleDecline(c._id)} disabled={loading}>
                  Decline
                </button>
                <button style={s.acceptBtn} onClick={() => handleAccept(c._id)} disabled={loading}>
                  {loading ? '...' : '✓ Accept'}
                </button>
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* ── Sent ─────────────────────────────────────────────────── */}
      {sent.length > 0 && (
        <Section label="Sent">
          {sent.map(c => (
            <Card key={c._id} accent="#888">
              <div style={s.cardTop}>
                <Avatar name={getName(c.defenderId)} color="#555" />
                <div>
                  <div style={s.cardName}>{getName(c.defenderId)}</div>
                  <div style={s.cardMeta}>challenge pending...</div>
                </div>
                <div style={{ ...s.timePill, color: '#555' }}>{timeAgo(c.createdAt)}</div>
              </div>
              {c.message && <div style={s.message}>"{c.message}"</div>}
            </Card>
          ))}
        </Section>
      )}

      {/* ── Active fights ─────────────────────────────────────────── */}
      {active.length > 0 && (
        <Section label="Active Fights">
          {active.map(c => {
            const isChallenger     = id(c.challengerId) === fighterId;
            const opponentFighter  = isChallenger ? c.defenderId : c.challengerId;
            const alreadyConfirmed = isChallenger ? c.challengerConfirmed : c.defenderConfirmed;
            const opponentId       = isChallenger ? id(c.defenderId) : id(c.challengerId);

            return (
              <Card key={c._id} accent="#4ade80">
                <div style={s.cardTop}>
                  <Avatar name={getName(opponentFighter)} color="#4ade80" />
                  <div>
                    <div style={s.cardName}>{getName(opponentFighter)}</div>
                    <div style={{ ...s.cardMeta, color: '#4ade80' }}>Fight accepted ✓</div>
                  </div>
                </div>

                {/* Meetup code */}
                <div style={s.codeBox}>
                  <div style={s.codeLabel}>Meetup Code</div>
                  <div style={s.code}>{c.meetupCode}</div>
                  <div style={s.codeHint}>Both fighters need this code to confirm the fight</div>
                </div>

                {/* Result confirmation */}
                {!alreadyConfirmed ? (
                  confirming === c._id ? (
                    <div style={s.confirmSection}>
                      <div style={s.confirmTitle}>Who won the fight?</div>
                      <div style={s.btnRow}>
                        <button
                          style={s.winBtn}
                          onClick={() => handleConfirm(c._id, fighterId)}
                          disabled={loading}
                        >
                          🏆 I Won
                        </button>
                        <button
                          style={s.loseBtn}
                          onClick={() => handleConfirm(c._id, opponentId)}
                          disabled={loading}
                        >
                          I Lost
                        </button>
                      </div>
                      <button style={s.cancelBtn} onClick={() => setConfirming(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button style={s.confirmTrigger} onClick={() => setConfirming(c._id)}>
                      📋 Report Result
                    </button>
                  )
                ) : (
                  <div style={s.waitingRow}>
                    <span style={s.waitingDot} />
                    Waiting for {getName(opponentFighter)} to confirm...
                  </div>
                )}
              </Card>
            );
          })}
        </Section>
      )}

      {/* ── History ───────────────────────────────────────────────── */}
      {history.length > 0 && (
        <Section label="History">
          {history.map(c => {
            const isChallenger = id(c.challengerId) === fighterId;
            const opponent     = isChallenger ? c.defenderId : c.challengerId;
            const won          = id(c.winnerId) === fighterId;

            return (
              <Card key={c._id} accent={c.disputed ? '#f59e0b' : c.status === 'completed' ? (won ? '#4ade80' : '#f87171') : '#333'}>
                <div style={s.cardTop}>
                  <Avatar
                    name={getName(opponent)}
                    color={c.disputed ? '#f59e0b' : c.status === 'completed' ? (won ? '#4ade80' : '#f87171') : '#555'}
                  />
                  <div>
                    <div style={s.cardName}>{getName(opponent)}</div>
                    <div style={s.cardMeta}>
                      {c.status === 'declined'  && '❌ Declined'}
                      {c.status === 'expired'   && '⏱ Expired'}
                      {c.status === 'completed' && !c.disputed && (won ? '🏆 You won' : '💀 You lost')}
                      {c.disputed               && '⚠️ Disputed'}
                    </div>
                  </div>
                  <div style={{ ...s.timePill, color: '#444' }}>{timeAgo(c.createdAt)}</div>
                </div>
              </Card>
            );
          })}
        </Section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={s.sectionLabel}>{label}</div>
      {children}
    </div>
  );
}

function Card({ children, accent }) {
  return (
    <div style={{
      ...s.card,
      borderLeft: `3px solid ${accent}`,
    }}>
      {children}
    </div>
  );
}

function Avatar({ name, color }) {
  return (
    <div style={{
      ...s.avatar,
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
    }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root:          { display: 'flex', flexDirection: 'column', gap: '20px' },
  empty:         { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '32px 0', color: '#555' },
  emptyIcon:     { fontSize: '32px' },
  emptyText:     { color: '#888', fontSize: '14px', fontWeight: '500' },
  emptyHint:     { color: '#444', fontSize: '12px', textAlign: 'center', lineHeight: '1.5' },
  resultBanner:  { border: '1px solid', borderRadius: '8px', fontSize: '13px', padding: '10px 12px', lineHeight: '1.5' },
  sectionLabel:  { color: '#555', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase' },
  card:          { background: '#161616', borderRadius: '10px', border: '1px solid #222', borderLeft: '3px solid #333', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' },
  cardTop:       { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar:        { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 },
  cardName:      { color: '#e0e0e0', fontSize: '13px', fontWeight: '600' },
  cardMeta:      { color: '#666', fontSize: '11px', marginTop: '2px' },
  timePill:      { marginLeft: 'auto', color: '#444', fontSize: '11px', flexShrink: 0 },
  message:       { background: '#111', borderRadius: '6px', color: '#777', fontSize: '12px', fontStyle: 'italic', padding: '8px 10px' },
  btnRow:        { display: 'flex', gap: '8px' },
  acceptBtn:     { flex: 2, background: '#0d2b1a', border: '1px solid #1a5c35', borderRadius: '8px', color: '#4ade80', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: '9px' },
  declineBtn:    { flex: 1, background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#555', cursor: 'pointer', fontSize: '13px', padding: '9px' },
  codeBox:       { background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '10px 12px' },
  codeLabel:     { color: '#444', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' },
  code:          { color: '#e63946', fontSize: '24px', fontWeight: '700', letterSpacing: '0.2em', fontFamily: 'monospace' },
  codeHint:      { color: '#444', fontSize: '11px', marginTop: '4px' },
  confirmSection:{ display: 'flex', flexDirection: 'column', gap: '8px' },
  confirmTitle:  { color: '#ccc', fontSize: '13px', fontWeight: '500', textAlign: 'center' },
  winBtn:        { flex: 1, background: '#0d2b1a', border: '1px solid #1a5c35', borderRadius: '8px', color: '#4ade80', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: '10px' },
  loseBtn:       { flex: 1, background: '#2a1010', border: '1px solid #5c2020', borderRadius: '8px', color: '#f87171', cursor: 'pointer', fontSize: '13px', padding: '10px' },
  cancelBtn:     { background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '12px', padding: '4px', textAlign: 'center', width: '100%' },
  confirmTrigger:{ background: '#1a1a2e', border: '1px solid #2d2d5e', borderRadius: '8px', color: '#a78bfa', cursor: 'pointer', fontSize: '13px', fontWeight: '500', padding: '10px', width: '100%' },
  waitingRow:    { alignItems: 'center', color: '#666', display: 'flex', fontSize: '12px', gap: '8px' },
  waitingDot:    { animation: 'pulse 2s infinite', background: '#f59e0b', borderRadius: '50%', flexShrink: 0, height: '6px', width: '6px' },
};