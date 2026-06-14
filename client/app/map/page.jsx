'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import FighterCard from '@/components/FighterCard';
import ChallengeModal from '@/components/ChallengeModal';
import NotificationsPanel from '@/components/NotificationsPanel';
import api from '@/lib/api';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const { user, fighter, loading, logout, updateFighter, refreshFighter } = useAuth();

  const [selectedFighter, setSelectedFighter]     = useState(null);
  const [toggling, setToggling]                   = useState(false);
  const [challengeTarget, setChallengeTarget]     = useState(null);
  const [challenges, setChallenges]               = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount]             = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (fighter) {
      fetchChallenges();
      initSocket();
    }
    return () => {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    };
  }, [fighter?._id]);

  const fetchChallenges = async () => {
    try {
      const res = await api.get('/challenge/mine');
      setChallenges(res.data);
      const pending = res.data.filter(c => c.status === 'pending' && c.defenderId?._id === fighter?._id);
      setUnreadCount(pending.length);
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
    }
  };

  const handleChallengeUpdate = () => {
    fetchChallenges();
    refreshFighter();
  };

  const initSocket = async () => {
    if (!fighter) return;
    const { io } = await import('socket.io-client');
    const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join', fighter._id);
    socket.on('challenge:received', () => { setUnreadCount(p => p + 1); fetchChallenges(); });
    socket.on('challenge:accepted', (d) => { fetchChallenges(); alert(`✅ ${d.defenderName} accepted!\nCode: ${d.meetupCode}`); });
    socket.on('challenge:declined', () => fetchChallenges());
    socket.on('challenge:updated',  () => fetchChallenges());
    socket.on('challenge:completed',() => handleChallengeUpdate());
  };

  if (loading) {
    return (
      <div style={s.loading}>
        <div style={s.loadingLogo}>FIGHT<span style={{ color: '#cc2200' }}>CLUB</span></div>
        <div style={s.loadingText}>LOADING...</div>
      </div>
    );
  }
  if (!user) return null;

  const handleToggleAvailable = async () => {
    if (!fighter) return;
    setToggling(true);
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = position.coords;
      const res = await api.patch('/fighter/me', {
        availableToFight: !fighter.availableToFight,
        location: { type: 'Point', coordinates: [longitude, latitude] },
      });
      updateFighter(res.data);
    } catch (err) {
      if (err.code === 1) alert('Location permission denied.');
      else alert(err.response?.data?.error || 'Failed to update availability');
    } finally { setToggling(false); }
  };

  const handleFighterClick = (f) => {
    setSelectedFighter(f);
    setShowNotifications(false);
    setMobileSidebarOpen(true);
  };

  const handleChallenge = (f) => { setSelectedFighter(null); setChallengeTarget(f); };

  const handleNotificationClick = () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    setUnreadCount(0);
    setMobileSidebarOpen(opening);
  };

  const openOwnProfile = () => {
    setSelectedFighter(null);
    setShowNotifications(false);
    setMobileSidebarOpen(true);
  };

  const isAvailable = fighter?.availableToFight;

  return (
    <div style={s.root}>

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <div style={s.navbar}>
        <div style={s.navLeft}>
          <div style={s.logo}>FIGHT<span style={s.logoAccent}>CLUB</span></div>
          <div style={s.navDivider} />
          <Link href="/leaderboard" style={s.navLink}>
            <span className="nav-text">LEADERBOARD</span>
            <span className="nav-icon">🏆</span>
          </Link>
        </div>

        <div style={s.navRight}>
          {/* Available toggle */}
          <button
            style={{
              ...s.toggleBtn,
              background: isAvailable ? '#0a1f0a' : 'transparent',
              border: `1px solid ${isAvailable ? '#1a5c1a' : '#2a2a2a'}`,
              color: isAvailable ? '#4ade80' : '#4a4a4a',
            }}
            onClick={handleToggleAvailable}
            disabled={toggling}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isAvailable ? '#4ade80' : '#3a3a3a', display: 'inline-block', marginRight: '7px', flexShrink: 0 }} />
            <span className="nav-text">{toggling ? 'UPDATING...' : isAvailable ? 'AVAILABLE' : 'GO AVAILABLE'}</span>
            <span className="nav-icon">{isAvailable ? '●' : '○'}</span>
          </button>

          {/* Bell */}
          <button style={s.bellBtn} onClick={handleNotificationClick}>
            <span style={s.bellIcon}>⚔</span>
            {unreadCount > 0 && <span style={s.badge}>{unreadCount}</span>}
          </button>

          {/* User */}
          <button style={s.userBtn} onClick={openOwnProfile}>
            <div style={s.userAvatar}>{user.username?.[0]?.toUpperCase()}</div>
            <span className="nav-text" style={s.userName}>{user.username}</span>
          </button>

          {/* Sign out */}
          <button style={s.signOutBtn} onClick={() => { logout(); router.push('/login'); }}>
            <span className="nav-text">SIGN OUT</span>
            <span className="nav-icon">⏻</span>
          </button>
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <div style={s.main}>
        <div style={s.mapArea}>
          <MapView onFighterClick={handleFighterClick} currentFighterId={fighter?._id} />

          {/* Mobile FAB */}
          <button className="mobile-fab" onClick={openOwnProfile} aria-label="Open profile">
            {user.username?.[0]?.toUpperCase()}
            {unreadCount > 0 && <span className="fab-badge">{unreadCount}</span>}
          </button>
        </div>

        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <div className="mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`} style={s.sidebar}>
          <div className="sidebar-handle" onClick={() => setMobileSidebarOpen(false)}>
            <div className="handle-bar" />
          </div>

          {showNotifications ? (
            <>
              <SidebarHeader title="CHALLENGES" onClose={() => setShowNotifications(false)} />
              <NotificationsPanel challenges={challenges} fighterId={fighter?._id} onUpdate={handleChallengeUpdate} />
            </>
          ) : selectedFighter ? (
            <>
              <SidebarHeader title="FIGHTER" onClose={() => setSelectedFighter(null)} />
              <FighterCard fighter={selectedFighter} isOwn={selectedFighter._id === fighter?._id} onChallenge={handleChallenge} />
            </>
          ) : (
            <>
              <SidebarHeader title="YOUR PROFILE" />
              <FighterCard fighter={{ ...fighter, username: user.username }} isOwn />
              <div style={s.hint}>TAP A FIGHTER PIN TO VIEW THEIR PROFILE</div>
            </>
          )}
        </div>
      </div>

      {challengeTarget && (
        <ChallengeModal
          fighter={challengeTarget}
          onClose={() => setChallengeTarget(null)}
          onSent={() => { fetchChallenges(); }}
        />
      )}

      <style jsx>{`
        .nav-icon { display: none; }
        .nav-text  { display: inline; }
        .mobile-fab, .mobile-backdrop, .sidebar-handle { display: none; }

        @media (max-width: 768px) {
          .nav-text  { display: none; }
          .nav-icon  { display: inline; }

          .sidebar {
            position: fixed !important;
            left: 0; right: 0; bottom: 0;
            width: 100% !important;
            height: 75vh;
            border-left: none !important;
            border-top: 1px solid #1c1c1c;
            border-radius: 8px 8px 0 0;
            transform: translateY(100%);
            transition: transform 0.25s ease;
            z-index: 1500;
          }
          .sidebar.open { transform: translateY(0); }

          .sidebar-handle {
            display: flex;
            justify-content: center;
            padding: 10px 0 6px;
            cursor: pointer;
            flex-shrink: 0;
          }
          .handle-bar {
            width: 36px; height: 3px;
            border-radius: 2px;
            background: #2a2a2a;
          }

          .mobile-fab {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            bottom: 20px; right: 16px;
            width: 52px; height: 52px;
            border-radius: 2px;
            background: #cc2200;
            border: none;
            color: #e8e4dc;
            font-size: 20px;
            font-weight: 700;
            font-family: 'Bebas Neue', sans-serif;
            letter-spacing: 0.05em;
            box-shadow: 0 4px 20px rgba(204,34,0,0.4);
            z-index: 1300;
            cursor: pointer;
          }
          .fab-badge {
            position: absolute;
            top: -6px; right: -6px;
            background: #e8e4dc;
            color: #cc2200;
            border-radius: 2px;
            font-size: 10px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            font-family: 'Inter', sans-serif;
          }
          .mobile-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            z-index: 1400;
          }
        }
      `}</style>
    </div>
  );
}

function SidebarHeader({ title, onClose }) {
  return (
    <div style={sh.root}>
      <div style={sh.title}>{title}</div>
      {onClose && (
        <button style={sh.close} onClick={onClose}>✕</button>
      )}
    </div>
  );
}

const sh = {
  root:  { alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  title: { color: '#3a3a3a', fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', letterSpacing: '0.15em' },
  close: { background: 'transparent', border: 'none', color: '#3a3a3a', cursor: 'pointer', fontSize: '14px', padding: '0' },
};

const s = {
  root:    { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
  loading: { alignItems: 'center', background: '#0a0a0a', display: 'flex', flexDirection: 'column', gap: '8px', height: '100vh', justifyContent: 'center' },
  loadingLogo: { color: '#e8e4dc', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '48px', letterSpacing: '0.06em' },
  loadingText: { color: '#3a3a3a', fontSize: '11px', fontWeight: '700', letterSpacing: '0.2em' },

  navbar:  { alignItems: 'center', background: '#0d0d0d', borderBottom: '1px solid #1c1c1c', display: 'flex', flexShrink: 0, height: '48px', justifyContent: 'space-between', padding: '0 16px' },
  navLeft: { alignItems: 'center', display: 'flex', gap: '16px' },
  logo:    { color: '#e8e4dc', fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", fontSize: '22px', letterSpacing: '0.06em', lineHeight: 1, flexShrink: 0 },
  logoAccent: { color: '#cc2200' },
  navDivider: { width: '1px', height: '16px', background: '#1c1c1c', flexShrink: 0 },
  navLink: { color: '#4a4a4a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.15em', textDecoration: 'none', flexShrink: 0 },

  navRight:   { alignItems: 'center', display: 'flex', gap: '8px' },
  toggleBtn:  { alignItems: 'center', borderRadius: '2px', cursor: 'pointer', display: 'flex', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', padding: '6px 12px', transition: 'all 0.15s', flexShrink: 0 },
  bellBtn:    { alignItems: 'center', background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#4a4a4a', cursor: 'pointer', display: 'flex', fontSize: '14px', padding: '6px 10px', position: 'relative', flexShrink: 0 },
  bellIcon:   { fontSize: '14px' },
  badge:      { background: '#cc2200', borderRadius: '2px', color: '#e8e4dc', fontSize: '9px', fontWeight: '700', minWidth: '14px', padding: '1px 3px', position: 'absolute', right: '-5px', top: '-5px' },
  userBtn:    { alignItems: 'center', background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '2px', cursor: 'pointer', display: 'flex', gap: '8px', padding: '4px 10px 4px 4px', flexShrink: 0 },
  userAvatar: { alignItems: 'center', background: '#cc2200', borderRadius: '1px', color: '#e8e4dc', display: 'flex', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', fontWeight: '400', height: '24px', justifyContent: 'center', letterSpacing: '0.05em', width: '24px', flexShrink: 0 },
  userName:   { color: '#4a4a4a', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em' },
  signOutBtn: { background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '2px', color: '#3a3a3a', cursor: 'pointer', fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', padding: '6px 10px', flexShrink: 0 },

  main:    { display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' },
  mapArea: { flex: 1, position: 'relative', minHeight: 0 },
  sidebar: {
    background: '#0d0d0d',
    borderLeft: '1px solid #1c1c1c',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    padding: '16px',
    width: '290px',
    flexShrink: 0,
  },
  hint:    { color: '#2a2a2a', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', lineHeight: '1.6', textAlign: 'center', padding: '8px 0' },
};
