'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function ChallengeModal({ fighter, onClose, onSent }) {
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSend = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/challenge/send', {
        defenderId: fighter._id,
        message,
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
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>⚔️ Challenge Fighter</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Fighter info */}
        <div style={styles.fighterRow}>
          <div style={styles.avatar}>{fighter.username?.[0]?.toUpperCase()}</div>
          <div>
            <div style={styles.fighterName}>{fighter.username}</div>
            <div style={styles.fighterMeta}>
              {fighter.weightClass} · ELO {fighter.eloRating} · {fighter.wins}W {fighter.losses}L
            </div>
          </div>
        </div>

        {/* Optional message */}
        <textarea
          style={styles.textarea}
          placeholder="Add a message (optional)..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
          rows={3}
        />
        <div style={styles.charCount}>{message.length}/200</div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={styles.sendBtn} onClick={handleSend} disabled={loading}>
            {loading ? 'Sending...' : '⚔️ Send Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '14px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: '17px',
    fontWeight: '600',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: '16px',
  },
  fighterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#111',
    borderRadius: '10px',
    padding: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#e63946',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700',
    flexShrink: 0,
  },
  fighterName: {
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
  },
  fighterMeta: {
    color: '#888',
    fontSize: '12px',
    marginTop: '2px',
  },
  textarea: {
    background: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    padding: '10px 12px',
    resize: 'none',
    width: '100%',
  },
  charCount: {
    color: '#555',
    fontSize: '11px',
    textAlign: 'right',
    marginTop: '-10px',
  },
  error: {
    background: '#2a1a1a',
    border: '1px solid #e63946',
    borderRadius: '8px',
    color: '#e63946',
    fontSize: '13px',
    padding: '10px 14px',
  },
  btnRow: {
    display: 'flex',
    gap: '10px',
  },
  cancelBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '11px',
  },
  sendBtn: {
    flex: 2,
    background: '#e63946',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    padding: '11px',
  },
};
