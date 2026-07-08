'use client';

import { useState } from 'react';

export default function ShareInviteModal({ challenger, fighter, onClose }) {
  const [copied, setCopied] = useState(false);

  // The link goes to the CHALLENGER's public profile
  // so the recipient can see who wants to fight them and tap "Challenge back"
  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/fighter/${challenger._id}`
    : `https://fightclub-kappa.vercel.app/fighter/${challenger._id}`;

  const fighterName = fighter?.username || 'you';
  const challengerName = challenger?.username || 'A fighter';
  const eloRating  = challenger?.eloRating || 1000;
  const weightClass = challenger?.weightClass || '';

  const whatsappMsg = encodeURIComponent(
    `⚔️ ${challengerName} wants to fight you on FightClub!\n\n` +
    `${weightClass} · ELO ${eloRating}\n\n` +
    `Accept the challenge here 👇\n${profileUrl}`
  );

  const twitterMsg = encodeURIComponent(
    `⚔️ ${challengerName} (ELO ${eloRating}) just challenged me on FightClub — a real-time fighter matchmaking app!\n\n` +
    `${profileUrl}`
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `⚔️ ${challengerName} wants to fight you on FightClub!\n` +
        `Accept here: ${profileUrl}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for browsers that block clipboard
      const el = document.createElement('textarea');
      el.value = profileUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${challengerName} wants to fight you!`,
          text: `⚔️ ${challengerName} (ELO ${eloRating}) challenged you on FightClub. Accept here:`,
          url: profileUrl,
        });
      } catch (err) {
        // User cancelled share — no need to do anything
      }
    }
  };

  const shareButtons = [
    {
      label: 'WHATSAPP',
      icon: '💬',
      color: '#25D366',
      bg: '#0a1a0a',
      border: '#1a4a1a',
      href: `https://wa.me/?text=${whatsappMsg}`,
    },
    {
      label: 'TWITTER / X',
      icon: '𝕏',
      color: '#1DA1F2',
      bg: '#0a0f1a',
      border: '#1a2a4a',
      href: `https://twitter.com/intent/tweet?text=${twitterMsg}`,
    },
    {
      label: 'TELEGRAM',
      icon: '✈️',
      color: '#0088cc',
      bg: '#080f18',
      border: '#0a2a3a',
      href: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(`⚔️ ${challengerName} wants to fight you on FightClub!`)}`,
    },
  ];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        <div style={s.header}>
          <div>
            <div style={s.title}>INVITE TO FIGHT</div>
            <div style={s.subtitle}>Send a challenge to {fighterName}</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Preview card */}
        <div style={s.previewCard}>
          <div style={s.previewBadge}>⚔ CHALLENGE INVITE</div>
          <div style={s.previewText}>
            <span style={s.previewName}>{challengerName}</span>
            <span style={s.previewMid}> wants to fight you on </span>
            <span style={s.previewApp}>FightClub</span>
          </div>
          <div style={s.previewMeta}>{weightClass} · ELO {eloRating}</div>
          <div style={s.previewLink}>{profileUrl}</div>
        </div>

        {/* Native share — shows on mobile where navigator.share is available */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <button style={s.nativeShareBtn} onClick={handleNativeShare}>
            <span style={s.nativeShareIcon}>⬆</span>
            SHARE VIA...
          </button>
        )}

        {/* Platform buttons */}
        <div style={s.platformGrid}>
          {shareButtons.map(btn => (
            <a
              key={btn.label}
              href={btn.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...s.platformBtn,
                background: btn.bg,
                border: `1px solid ${btn.border}`,
                color: btn.color,
              }}
            >
              <span style={s.platformIcon}>{btn.icon}</span>
              <span style={s.platformLabel}>{btn.label}</span>
            </a>
          ))}
        </div>

        {/* Copy link */}
        <div style={s.copyRow}>
          <div style={s.copyUrl}>{profileUrl}</div>
          <button style={{ ...s.copyBtn, ...(copied ? s.copyBtnDone : {}) }} onClick={handleCopy}>
            {copied ? '✓ COPIED' : 'COPY'}
          </button>
        </div>

        <div style={s.disclaimer}>
          Recipient will see your fighter profile and can challenge you back directly from the link.
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: '20px',
  },
  modal: {
    background: '#0d0d0d',
    border: '1px solid #1c1c1c',
    borderTop: '2px solid #cc2200',
    borderRadius: '4px',
    display: 'flex', flexDirection: 'column', gap: '14px',
    maxWidth: '380px', width: '100%',
    padding: '24px',
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  title: {
    color: '#e8e4dc',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '22px', letterSpacing: '0.08em',
  },
  subtitle: {
    color: '#4a4a4a', fontSize: '11px',
    fontWeight: '600', letterSpacing: '0.04em', marginTop: '2px',
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: '#4a4a4a', cursor: 'pointer', fontSize: '16px',
  },
  previewCard: {
    background: '#080808',
    border: '1px solid #2a2a2a',
    borderLeft: '3px solid #cc2200',
    borderRadius: '2px',
    padding: '12px',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  previewBadge: {
    color: '#cc2200', fontSize: '9px',
    fontWeight: '700', letterSpacing: '0.15em', marginBottom: '4px',
  },
  previewText: {
    fontSize: '14px', lineHeight: '1.4',
  },
  previewName: {
    color: '#e8e4dc', fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '16px', letterSpacing: '0.04em',
  },
  previewMid: {
    color: '#4a4a4a', fontSize: '13px',
  },
  previewApp: {
    color: '#cc2200', fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '16px', letterSpacing: '0.04em',
  },
  previewMeta: {
    color: '#3a3a3a', fontSize: '10px',
    fontWeight: '600', letterSpacing: '0.06em',
  },
  previewLink: {
    color: '#2a2a2a', fontSize: '10px',
    letterSpacing: '0.02em', marginTop: '2px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  nativeShareBtn: {
    alignItems: 'center', background: '#1a1a1a',
    border: '1px solid #2a2a2a', borderRadius: '2px',
    color: '#e8e4dc', cursor: 'pointer',
    display: 'flex', fontSize: '13px',
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: '400', gap: '8px',
    justifyContent: 'center', letterSpacing: '0.1em',
    padding: '12px', width: '100%',
  },
  nativeShareIcon: { fontSize: '16px' },
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  platformBtn: {
    alignItems: 'center', borderRadius: '2px',
    cursor: 'pointer', display: 'flex',
    flexDirection: 'column', gap: '6px',
    padding: '12px 8px', textDecoration: 'none',
    transition: 'opacity 0.15s',
  },
  platformIcon: { fontSize: '20px' },
  platformLabel: {
    fontSize: '9px', fontWeight: '700',
    letterSpacing: '0.1em', textAlign: 'center',
  },
  copyRow: {
    alignItems: 'center', background: '#080808',
    border: '1px solid #1c1c1c', borderRadius: '2px',
    display: 'flex', gap: '8px', padding: '8px 10px',
  },
  copyUrl: {
    color: '#3a3a3a', flex: 1, fontSize: '11px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  copyBtn: {
    background: 'transparent', border: '1px solid #2a2a2a',
    borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer',
    flexShrink: 0, fontSize: '9px', fontWeight: '700',
    letterSpacing: '0.1em', padding: '5px 10px',
    transition: 'all 0.15s',
  },
  copyBtnDone: {
    background: '#0a1f0a', borderColor: '#1a5c1a', color: '#4ade80',
  },
  disclaimer: {
    color: '#2a2a2a', fontSize: '10px',
    letterSpacing: '0.02em', lineHeight: '1.5',
    textAlign: 'center',
  },
};
