'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function ChallengeModal({ fighter, onClose, onSent }) {
  const [message, setMessage]         = useState('');
  const [scheduledDate, setScheduledDate] = useState(''); // yyyy-mm-dd
  const [scheduledTime, setScheduledTime] = useState(''); // HH:mm
  const [meetingPlace, setMeetingPlace] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Min date = today, in the format <input type="date"> expects
  const todayStr = new Date().toISOString().split('T')[0];

  const handleSend = async () => {
    setLoading(true);
    setError('');

    let scheduledFor = null;
    if (scheduledDate && scheduledTime) {
      // Combine into a single ISO string the backend can parse
      const combined = new Date(`${scheduledDate}T${scheduledTime}`);
      if (isNaN(combined.getTime())) {
        setError('Invalid date or time');
        setLoading(false);
        return;
      }
      if (combined.getTime() <= Date.now()) {
        setError('Scheduled time must be in the future');
        setLoading(false);
        return;
      }
      scheduledFor = combined.toISOString();
    } else if (scheduledDate || scheduledTime) {
      // Only one of the two was filled in — incomplete
      setError('Please set both a date and a time, or leave both blank');
      setLoading(false);
      return;
    }

    try {
      await api.post('/challenge/send', {
        defenderId: fighter._id,
        message,
        scheduledFor,
        meetingPlace: meetingPlace.trim(),
      });
      onSent();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop-fade" style={s.overlay} onClick={onClose}>
      <div className="modal-punch" style={s.modal} onClick={e => e.stopPropagation()}>
        <style jsx>{`
          @keyframes punchIn {
            0%   { transform: scale(0.7) rotate(-3deg); opacity: 0; }
            55%  { transform: scale(1.04) rotate(1deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes fadeBackdrop {
            0%   { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes vsThud {
            0%   { transform: scale(1.8) rotate(-10deg); opacity: 0; }
            60%  { transform: scale(0.9) rotate(3deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          .modal-punch { animation: punchIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
          .modal-backdrop-fade { animation: fadeBackdrop 0.18s ease both; }
          .vs-thud { animation: vsThud 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both; }
        `}</style>

        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.title}>SEND CHALLENGE</div>
            <div style={s.subtitle}>Issue a formal fight request</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.targetCard}>
          <div style={s.targetAvatar}>{fighter.username?.[0]?.toUpperCase()}</div>
          <div>
            <div style={s.targetName}>{fighter.username}</div>
            <div style={s.targetMeta}>
              {fighter.weightClass} · ELO {fighter.eloRating} · {fighter.wins}W {fighter.losses}L
            </div>
          </div>
          <div style={s.vsTag} className="vs-thud">VS</div>
        </div>

        {/* Scheduling — optional, but if you fill one you need both */}
        <div style={s.scheduleSection}>
          <div style={s.scheduleLabel}>WHEN &amp; WHERE <span style={s.optionalTag}>OPTIONAL</span></div>
          <div style={s.dateTimeRow}>
            <div style={s.fieldGroup}>
              <label style={s.label}>DATE</label>
              <input
                style={s.input}
                type="date"
                min={todayStr}
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>TIME</label>
              <input
                style={s.input}
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>MEETING PLACE</label>
            <input
              style={s.input}
              type="text"
              placeholder="e.g. Shivaji Park, near the basketball court"
              value={meetingPlace}
              onChange={e => setMeetingPlace(e.target.value.slice(0, 150))}
              maxLength={150}
            />
          </div>
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
            rows={2}
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px', overflowY: 'auto' },
  modal:   { background: '#0d0d0d', border: '1px solid #1c1c1c', borderTop: '2px solid #cc2200', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '400px', padding: '24px', width: '100%', fontFamily: "'Inter', sans-serif", maxHeight: '90vh', overflowY: 'auto' },
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

  scheduleSection: { display: 'flex', flexDirection: 'column', gap: '10px', background: '#080808', border: '1px solid #1c1c1c', borderRadius: '2px', padding: '12px' },
  scheduleLabel:   { color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '6px' },
  optionalTag:     { background: '#1c1c1c', borderRadius: '2px', color: '#3a3a3a', fontSize: '8px', fontWeight: '700', letterSpacing: '0.08em', padding: '1px 5px' },
  dateTimeRow:     { display: 'flex', gap: '8px' },

  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label:   { color: '#4a4a4a', fontSize: '9px', fontWeight: '700', letterSpacing: '0.15em' },
  input:   { background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#e8e4dc', fontSize: '13px', outline: 'none', padding: '10px 12px', width: '100%', colorScheme: 'dark' },
  textarea:{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#e8e4dc', fontSize: '13px', outline: 'none', padding: '10px 12px', resize: 'none', width: '100%', fontFamily: "'Inter', sans-serif" },
  charCount: { color: '#3a3a3a', fontSize: '10px', textAlign: 'right', marginTop: '-4px' },
  error:   { background: '#1a0800', border: '1px solid #cc2200', borderRadius: '2px', color: '#cc2200', fontSize: '12px', padding: '8px 12px' },
  btnRow:  { display: 'flex', gap: '8px' },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px', letterSpacing: '0.1em', padding: '12px' },
  sendBtn:   { flex: 2, background: '#cc2200', border: 'none', borderRadius: '2px', color: '#e8e4dc', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '0.1em', padding: '12px' },
};
