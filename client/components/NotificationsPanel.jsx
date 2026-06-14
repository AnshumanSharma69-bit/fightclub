'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function NotificationsPanel({ challenges, fighterId, onUpdate }) {
  const [confirming, setConfirming] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [resultMsg, setResultMsg]   = useState('');

  const id = (val) => (typeof val === 'object' && val !== null ? val._id?.toString() : val?.toString());

  const incoming = challenges.filter(c => c.status === 'pending'  && id(c.defenderId) === fighterId);
  const sent     = challenges.filter(c => c.status === 'pending'  && id(c.challengerId) === fighterId);
  const active   = challenges.filter(c => c.status === 'accepted');
  const history  = challenges.filter(c => ['completed', 'declined', 'expired'].includes(c.status));

  const handleAccept = async (challengeId) => {
    setLoading(true);
    try {
      await api.post(`/challenge/${challengeId}/accept`);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept');
    } finally { setLoading(false); }
  };

  const handleDecline = async (challengeId) => {
    setLoading(true);
    try {
      await api.post(`/challenge/${challengeId}/decline`);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to decline');
    } finally { setLoading(false); }
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
    } finally { setLoading(false); }
  };

  const getName = (fighter) => fighter?.userId?.username || fighter?.username || '?';

  if (challenges.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}>⚔</div>
        <div style={s.emptyTitle}>NO CHALLENGES</div>
        <div style={s.emptyHint}>Tap a fighter pin on the map to send one</div>
      </div>
    );
  }

  return (
    <div style={s.root}>

      {resultMsg && (
        <div style={{
          ...s.resultBanner,
          borderColor: resultMsg.includes('⚠️') ? '#f59e0b' : resultMsg.includes('✅') ? '#4ade80' : '#cc2200',
          color:       resultMsg.includes('⚠️') ? '#f59e0b' : resultMsg.includes('✅') ? '#4ade80' : '#cc2200',
        }}>
          {resultMsg}
        </div>
      )}

      {incoming.length > 0 && (
        <Section label={`INCOMING ${incoming.length > 1 ? `(${incoming.length})` : ''}`} accent="#cc2200">
          {incoming.map(c => (
            <Card key={c._id} accentColor="#cc2200">
              <Row>
                <Avatar name={getName(c.challengerId)} color="#cc2200" />
                <div>
                  <Name>{getName(c.challengerId)}</Name>
                  <Meta>wants to fight you · {timeAgo(c.createdAt)}</Meta>
                </div>
              </Row>
              {c.message && <MsgBox>"{c.message}"</MsgBox>}
              <div style={s.btnRow}>
                <button style={s.declineBtn} onClick={() => handleDecline(c._id)} disabled={loading}>DECLINE</button>
                <button style={s.acceptBtn}  onClick={() => handleAccept(c._id)}  disabled={loading}>
                  {loading ? '...' : '✓ ACCEPT'}
                </button>
              </div>
            </Card>
          ))}
        </Section>
      )}

      {sent.length > 0 && (
        <Section label="SENT" accent="#4a4a4a">
          {sent.map(c => (
            <Card key={c._id} accentColor="#2a2a2a">
              <Row>
                <Avatar name={getName(c.defenderId)} color="#4a4a4a" />
                <div>
                  <Name>{getName(c.defenderId)}</Name>
                  <Meta>awaiting response · {timeAgo(c.createdAt)}</Meta>
                </div>
              </Row>
              {c.message && <MsgBox>"{c.message}"</MsgBox>}
            </Card>
          ))}
        </Section>
      )}

      {active.length > 0 && (
        <Section label="ACTIVE FIGHTS" accent="#4ade80">
          {active.map(c => {
            const isChallenger     = id(c.challengerId) === fighterId;
            const opponentFighter  = isChallenger ? c.defenderId : c.challengerId;
            const alreadyConfirmed = isChallenger ? c.challengerConfirmed : c.defenderConfirmed;
            const opponentId       = isChallenger ? id(c.defenderId) : id(c.challengerId);

            return (
              <Card key={c._id} accentColor="#4ade80">
                <Row>
                  <Avatar name={getName(opponentFighter)} color="#4ade80" />
                  <div>
                    <Name>{getName(opponentFighter)}</Name>
                    <Meta style={{ color: '#4ade80' }}>FIGHT ACCEPTED</Meta>
                  </div>
                </Row>

                <div style={s.codeBox}>
                  <div style={s.codeLabel}>MEETUP CODE</div>
                  <div style={s.code}>{c.meetupCode}</div>
                  <div style={s.codeHint}>Show this to your opponent to verify the fight</div>
                </div>

                {!alreadyConfirmed ? (
                  confirming === c._id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={s.confirmTitle}>WHO WON?</div>
                      <div style={s.btnRow}>
                        <button style={s.winBtn}  onClick={() => handleConfirm(c._id, fighterId)}  disabled={loading}>🏆 I WON</button>
                        <button style={s.loseBtn} onClick={() => handleConfirm(c._id, opponentId)} disabled={loading}>I LOST</button>
                      </div>
                      <button style={s.cancelBtn} onClick={() => setConfirming(null)}>cancel</button>
                    </div>
                  ) : (
                    <button style={s.reportBtn} onClick={() => setConfirming(c._id)}>
                      REPORT RESULT
                    </button>
                  )
                ) : (
                  <div style={s.waitingRow}>
                    <span style={s.waitingDot} />
                    WAITING FOR {getName(opponentFighter).toUpperCase()} TO CONFIRM
                  </div>
                )}
              </Card>
            );
          })}
        </Section>
      )}

      {history.length > 0 && (
        <Section label="HISTORY" accent="#2a2a2a">
          {history.map(c => {
            const isChallenger = id(c.challengerId) === fighterId;
            const opponent     = isChallenger ? c.defenderId : c.challengerId;
            const won          = id(c.winnerId) === fighterId;
            const color        = c.disputed ? '#f59e0b' : c.status === 'completed' ? (won ? '#4ade80' : '#cc2200') : '#2a2a2a';

            return (
              <Card key={c._id} accentColor={color}>
                <Row>
                  <Avatar name={getName(opponent)} color={color} />
                  <div>
                    <Name>{getName(opponent)}</Name>
                    <Meta style={{ color }}>
                      {c.status === 'declined'  && 'DECLINED'}
                      {c.status === 'expired'   && 'EXPIRED'}
                      {c.status === 'completed' && !c.disputed && (won ? '🏆 YOU WON' : '💀 YOU LOST')}
                      {c.disputed               && '⚠ DISPUTED'}
                    </Meta>
                  </div>
                  <div style={{ ...s.timePill, marginLeft: 'auto' }}>{timeAgo(c.createdAt)}</div>
                </Row>
              </Card>
            );
          })}
        </Section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ label, accent, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ color: accent || '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.15em' }}>{label}</div>
      {children}
    </div>
  );
}

function Card({ children, accentColor }) {
  return (
    <div style={{ ...s.card, borderLeft: `2px solid ${accentColor || '#1c1c1c'}` }}>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{children}</div>;
}

function Avatar({ name, color }) {
  return (
    <div style={{
      width: '32px', height: '32px', borderRadius: '2px', flexShrink: 0,
      background: (color || '#cc2200') + '22',
      border: `1px solid ${(color || '#cc2200') + '44'}`,
      color: color || '#cc2200',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '14px', fontWeight: '700',
      fontFamily: "'Bebas Neue', sans-serif",
    }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function Name({ children }) {
  return <div style={{ color: '#e8e4dc', fontSize: '13px', fontWeight: '700', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>{children}</div>;
}

function Meta({ children, style }) {
  return <div style={{ color: '#4a4a4a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', marginTop: '1px', ...style }}>{children}</div>;
}

function MsgBox({ children }) {
  return <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#3a3a3a', fontSize: '11px', fontStyle: 'italic', padding: '7px 10px' }}>{children}</div>;
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const s = {
  root:         { display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" },
  empty:        { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 0', textAlign: 'center' },
  emptyIcon:    { color: '#2a2a2a', fontSize: '36px' },
  emptyTitle:   { color: '#3a3a3a', fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', letterSpacing: '0.1em' },
  emptyHint:    { color: '#2a2a2a', fontSize: '11px', letterSpacing: '0.04em', maxWidth: '180px' },
  resultBanner: { border: '1px solid', borderRadius: '2px', fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', padding: '10px 12px', lineHeight: '1.5' },
  card:         { background: '#0f0f0f', border: '1px solid #1c1c1c', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' },
  timePill:     { color: '#3a3a3a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', flexShrink: 0 },
  btnRow:       { display: 'flex', gap: '6px' },
  acceptBtn:    { flex: 2, background: '#0a1f0a', border: '1px solid #1a5c1a', borderRadius: '2px', color: '#4ade80', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.08em', padding: '9px' },
  declineBtn:   { flex: 1, background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', letterSpacing: '0.08em', padding: '9px' },
  codeBox:      { background: '#080808', border: '1px solid #1c1c1c', borderLeft: '2px solid #cc2200', borderRadius: '2px', padding: '10px 12px' },
  codeLabel:    { color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.15em', marginBottom: '4px' },
  code:         { color: '#cc2200', fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '0.2em', lineHeight: 1 },
  codeHint:     { color: '#3a3a3a', fontSize: '10px', marginTop: '4px', letterSpacing: '0.03em' },
  confirmTitle: { color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.1em', textAlign: 'center' },
  winBtn:       { flex: 1, background: '#0a1f0a', border: '1px solid #1a5c1a', borderRadius: '2px', color: '#4ade80', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.08em', padding: '10px' },
  loseBtn:      { flex: 1, background: '#1f0a0a', border: '1px solid #5c1a1a', borderRadius: '2px', color: '#cc2200', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.08em', padding: '10px' },
  cancelBtn:    { background: 'transparent', border: 'none', color: '#3a3a3a', cursor: 'pointer', fontSize: '11px', padding: '4px', textAlign: 'center', width: '100%' },
  reportBtn:    { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.1em', padding: '10px', width: '100%' },
  waitingRow:   { alignItems: 'center', color: '#4a4a4a', display: 'flex', fontSize: '10px', fontWeight: '700', gap: '8px', letterSpacing: '0.08em' },
  waitingDot:   { background: '#f59e0b', borderRadius: '50%', flexShrink: 0, height: '6px', width: '6px' },
};
