'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function ChallengeModal({ fighter, onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSend = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/challenge/send', { defenderId: fighter._id, message });
      onSent();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.title}>SEND CHALLENGE</div>
            <div style={s.subtitle}>Issue a formal fight request</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Target fighter */}
        <div style={s.targetCard}>
          <div style={s.targetAvatar}>{fighter.username?.[0]?.toUpperCase()}</div>
          <div>
            <div style={s.targetName}>{fighter.username}</div>
            <div style={s.targetMeta}>
              {fighter.weightClass} · ELO {fighter.eloRating} · {fighter.wins}W {fighter.losses}L
            </div>
          </div>
          <div style={s.vsTag}>VS</div>
        </div>

        {/* Message */}
        <div style={s.fieldGroup}>
          <label style={s.label}>MESSAGE (OPTIONAL)</label>
          <textarea
            style={s.textarea}
            placeholder="Talk some trash..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={200}
            rows={3}
          />
          <div style={s.charCount}>{message.length}/200</div>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.btnRow}>
          <button style={s.cancelBtn} onClick={onClose}>CANCEL</button>
          <button style={s.sendBtn} onClick={handleSend} disabled={loading}>
            {loading ? 'SENDING...' : '⚔ CHALLENGE'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' },
  modal:   { background: '#0d0d0d', border: '1px solid #1c1c1c', borderTop: '2px solid #cc2200', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', padding: '24px', width: '100%', fontFamily: "'Inter', sans-serif" },
  header:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: '2px' },
  title:   { color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '0.08em' },
  subtitle:{ color: '#4a4a4a', fontSize: '11px', letterSpacing: '0.06em', fontWeight: '600' },
  closeBtn:{ background: 'transparent', border: 'none', color: '#4a4a4a', cursor: 'pointer', fontSize: '16px', padding: '0' },
  targetCard: { background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' },
  targetAvatar: { width: '40px', height: '40px', borderRadius: '2px', background: '#cc2200', color: '#e8e4dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', fontFamily: "'Bebas Neue', sans-serif", flexShrink: 0 },
  targetName: { color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '0.06em' },
  targetMeta: { color: '#4a4a4a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.06em', marginTop: '2px' },
  vsTag:   { marginLeft: 'auto', color: '#cc2200', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '0.1em', flexShrink: 0 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:   { color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.15em' },
  textarea:{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#e8e4dc', fontSize: '13px', outline: 'none', padding: '10px 12px', resize: 'none', width: '100%', fontFamily: "'Inter', sans-serif" },
  charCount: { color: '#3a3a3a', fontSize: '10px', textAlign: 'right', marginTop: '-4px' },
  error:   { background: '#1a0800', border: '1px solid #cc2200', borderRadius: '2px', color: '#cc2200', fontSize: '12px', padding: '8px 12px' },
  btnRow:  { display: 'flex', gap: '8px' },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px', letterSpacing: '0.1em', padding: '12px' },
  sendBtn:   { flex: 2, background: '#cc2200', border: 'none', borderRadius: '2px', color: '#e8e4dc', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '0.1em', padding: '12px' },
};
