'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function ChallengeModal({ fighter, onClose, onSent }) {
  const [message, setMessage]           = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSend = async () => {
    setLoading(true);
    setError('');

    let scheduledFor = null;
    if (scheduledDate && scheduledTime) {
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
      setError('Please set both a date and a time, or leave both blank');
      setLoading(false);
      return;
    }

    try {
      await api.post('/challenge/send', {
        defenderId:   fighter._id,
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
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>SEND CHALLENGE</div>
            <div style={styles.subtitle}>Issue a formal fight request</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        {/* Opponent info */}
        <div style={styles.targetCard}>
          <div style={styles.targetAvatar}>{fighter.username?.[0]?.toUpperCase()}</div>
          <div>
            <div style={styles.targetName}>{fighter.username}</div>
            <div style={styles.targetMeta}>
              {fighter.weightClass} - ELO {fighter.eloRating} - {fighter.wins}W {fighter.losses}L
            </div>
          </div>
          <div style={styles.vsTag}>VS</div>
        </div>

        {/* Schedule section */}
        <div style={styles.scheduleBox}>
          <div style={styles.scheduleTitle}>WHEN AND WHERE <span style={styles.optTag}>OPTIONAL</span></div>

          <div style={styles.dateTimeRow}>
            <div style={styles.field}>
              <label style={styles.label}>DATE</label>
              <input
                style={styles.input}
                type="date"
                min={todayStr}
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>TIME</label>
              <input
                style={styles.input}
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>MEETING PLACE</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Shivaji Park, near the basketball court"
              value={meetingPlace}
              onChange={e => setMeetingPlace(e.target.value.slice(0, 150))}
            />
          </div>
        </div>

        {/* Message */}
        <div style={styles.field}>
          <label style={styles.label}>MESSAGE (OPTIONAL)</label>
          <textarea
            style={styles.textarea}
            placeholder="Talk some trash..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={200}
            rows={2}
          />
          <div style={styles.charCount}>{message.length}/200</div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onClose}>CANCEL</button>
          <button style={styles.sendBtn} onClick={handleSend} disabled={loading}>
            {loading ? 'SENDING...' : 'CHALLENGE'}
          </button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: '20px', overflowY: 'auto',
  },
  modal: {
    background: '#0d0d0d',
    border: '1px solid #1c1c1c',
    borderTop: '2px solid #cc2200',
    borderRadius: '4px',
    display: 'flex', flexDirection: 'column', gap: '14px',
    maxWidth: '400px', width: '100%',
    padding: '24px',
    fontFamily: "'Inter', sans-serif",
    maxHeight: '90vh', overflowY: 'auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  title: {
    color: '#e8e4dc',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '24px', letterSpacing: '0.08em',
  },
  subtitle: {
    color: '#4a4a4a', fontSize: '11px',
    fontWeight: '600', letterSpacing: '0.06em',
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: '#4a4a4a', cursor: 'pointer', fontSize: '16px',
  },
  targetCard: {
    background: '#111', border: '1px solid #1c1c1c',
    borderRadius: '2px', display: 'flex',
    alignItems: 'center', gap: '12px', padding: '12px',
  },
  targetAvatar: {
    width: '40px', height: '40px', borderRadius: '2px',
    background: '#cc2200', color: '#e8e4dc',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontWeight: '700',
    fontFamily: "'Bebas Neue', sans-serif", flexShrink: 0,
  },
  targetName: {
    color: '#e8e4dc',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '16px', letterSpacing: '0.06em',
  },
  targetMeta: {
    color: '#4a4a4a', fontSize: '10px',
    fontWeight: '600', letterSpacing: '0.06em', marginTop: '2px',
  },
  vsTag: {
    marginLeft: 'auto', color: '#cc2200',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '20px', letterSpacing: '0.1em', flexShrink: 0,
  },
  scheduleBox: {
    background: '#080808', border: '1px solid #1c1c1c',
    borderRadius: '2px', padding: '12px',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  scheduleTitle: {
    color: '#4a4a4a', fontSize: '9px',
    fontWeight: '700', letterSpacing: '0.15em',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  optTag: {
    background: '#1c1c1c', borderRadius: '2px',
    color: '#3a3a3a', fontSize: '8px',
    fontWeight: '700', letterSpacing: '0.08em', padding: '1px 5px',
  },
  dateTimeRow: {
    display: 'flex', gap: '8px',
  },
  field: {
    display: 'flex', flexDirection: 'column', gap: '6px', flex: 1,
  },
  label: {
    color: '#4a4a4a', fontSize: '9px',
    fontWeight: '700', letterSpacing: '0.15em',
  },
  input: {
    background: '#111', border: '1px solid #1c1c1c',
    borderRadius: '2px', color: '#e8e4dc',
    fontSize: '13px', outline: 'none',
    padding: '10px 12px', width: '100%',
    colorScheme: 'dark',
  },
  textarea: {
    background: '#111', border: '1px solid #1c1c1c',
    borderRadius: '2px', color: '#e8e4dc',
    fontSize: '13px', outline: 'none',
    padding: '10px 12px', resize: 'none', width: '100%',
    fontFamily: "'Inter', sans-serif",
  },
  charCount: {
    color: '#3a3a3a', fontSize: '10px',
    textAlign: 'right', marginTop: '-4px',
  },
  error: {
    background: '#1a0800', border: '1px solid #cc2200',
    borderRadius: '2px', color: '#cc2200',
    fontSize: '12px', padding: '8px 12px',
  },
  btnRow: {
    display: 'flex', gap: '8px',
  },
  cancelBtn: {
    flex: 1, background: 'transparent',
    border: '1px solid #1c1c1c', borderRadius: '2px',
    color: '#4a4a4a', cursor: 'pointer',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '15px', letterSpacing: '0.1em', padding: '12px',
  },
  sendBtn: {
    flex: 2, background: '#cc2200',
    border: 'none', borderRadius: '2px',
    color: '#e8e4dc', cursor: 'pointer',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '16px', letterSpacing: '0.1em', padding: '12px',
  },
};
