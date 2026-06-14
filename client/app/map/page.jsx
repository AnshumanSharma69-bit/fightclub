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

  const [selectedFighter, setSelectedFighter]   = useState(null);
  const [toggling, setToggling]                 = useState(false);
  const [challengeTarget, setChallengeTarget]   = useState(null);
  const [challenges, setChallenges]             = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount]           = useState(0);
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
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [fighter?._id]);

  const fetchChallenges = async () => {
    try {
      const res = await api.get('/challenge/mine');
      setChallenges(res.data);
      const pending = res.data.filter(
        c => c.status === 'pending' && c.defenderId?._id === fighter?._id
      );
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

    socket.on('challenge:received', (data) => {
      setUnreadCount(prev => prev + 1);
      fetchChallenges();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`⚔️ ${data.challengerName} wants to fight!`, {
          body: `${data.challengerWeight} · ELO ${data.challengerElo}`,
        });
      }
    });

    socket.on('challenge:accepted', (data) => {
      fetchChallenges();
      alert(`✅ ${data.defenderName} accepted your challenge!\nMeetup code: ${data.meetupCode}`);
    });

    socket.on('challenge:declined', () => {
      fetchChallenges();
    });

    socket.on('challenge:updated', () => {
      fetchChallenges();
    });

    socket.on('challenge:completed', () => {
      handleChallengeUpdate();
    });
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (!user)   return null;

  const handleToggleAvailable = async () => {
    if (!fighter) return;
    setToggling(true);
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000,
        })
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
    } finally {
      setToggling(false);
    }
  };

  // Wrapped so tapping a pin on mobile auto-opens the bottom sheet
  const handleFighterClick = (f) => {
    setSelectedFighter(f);
    setShowNotifications(false);
    setMobileSidebarOpen(true);
  };

  const handleChallenge = (f) => {
    setSelectedFighter(null);
    setChallengeTarget(f);
  };

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

  return (
    <div style={styles.root}>

      {/* Navbar */}
      <div style={styles.navbar}>
        <span style={styles.logo}>🥊 FightClub</span>
        <div className="nav-right" style={styles.navRight}>

          <Link href="/leaderboard" style={styles.leaderboardLink}>
            <span className="lb-text">🏆 Leaderboard</span>
            <span className="lb-icon">🏆</span>
          </Link>

          <button
            style={{
              ...styles.toggleBtn,
              background: fighter?.availableToFight ? '#0d2b1a' : '#1a1a1a',
              border: `1px solid ${fighter?.availableToFight ? '#1a5c35' : '#333'}`,
              color: fighter?.availableToFight ? '#4ade80' : '#888',
            }}
            onClick={handleToggleAvailable}
            disabled={toggling}
          >
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: fighter?.availableToFight ? '#4ade80' : '#555',
              display: 'inline-block', marginRight: '7px',
            }} />
            {toggling ? 'Updating...' : fighter?.availableToFight ? 'Available' : 'Go Available'}
          </button>

          <button style={styles.bellBtn} onClick={handleNotificationClick}>
            🔔
            {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
          </button>

          <button className="user-pill" style={styles.userPill} onClick={openOwnProfile}>
            <div style={styles.userDot}>{user.username?.[0]?.toUpperCase()}</div>
            <span className="user-name" style={styles.userName}>{user.username}</span>
          </button>

          <button style={styles.logoutBtn} onClick={() => { logout(); router.push('/login'); }}>
            <span className="logout-text">Sign out</span>
            <span className="logout-icon">⏻</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        <div className="map-area" style={styles.mapArea}>
          <MapView onFighterClick={handleFighterClick} currentFighterId={fighter?._id} />

          {/* Mobile-only floating button to reopen the panel */}
          <button className="mobile-fab" onClick={openOwnProfile} aria-label="Open profile panel">
            👤
            {unreadCount > 0 && <span className="fab-badge">{unreadCount}</span>}
          </button>
        </div>

        {/* Mobile-only dim backdrop behind the bottom sheet */}
        {mobileSidebarOpen && (
          <div className="mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
        )}

        <div className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`} style={styles.sidebar}>
          <div className="sidebar-handle" onClick={() => setMobileSidebarOpen(false)}>
            <div className="handle-bar" />
          </div>

          {showNotifications ? (
            <>
              <div style={styles.sidebarHeader}>
                <span style={styles.sidebarTitle}>Challenges</span>
                <button style={styles.closeBtn} onClick={() => setShowNotifications(false)}>✕</button>
              </div>
              <NotificationsPanel
                challenges={challenges}
                fighterId={fighter?._id}
                onUpdate={handleChallengeUpdate}
              />
            </>
          ) : selectedFighter ? (
            <>
              <div style={styles.sidebarHeader}>
                <span style={styles.sidebarTitle}>Fighter</span>
                <button style={styles.closeBtn} onClick={() => setSelectedFighter(null)}>✕</button>
              </div>
              <FighterCard
                fighter={selectedFighter}
                isOwn={selectedFighter._id === fighter?._id}
                onChallenge={handleChallenge}
              />
            </>
          ) : (
            <>
              <div style={styles.sidebarHeader}>
                <span style={styles.sidebarTitle}>Your Profile</span>
              </div>
              <FighterCard fighter={{ ...fighter, username: user.username }} isOwn />
              <p style={styles.hint}>Tap a fighter pin to view their profile and challenge them</p>
            </>
          )}
        </div>
      </div>

      {challengeTarget && (
        <ChallengeModal
          fighter={challengeTarget}
          onClose={() => setChallengeTarget(null)}
          onSent={() => { fetchChallenges(); alert('Challenge sent! 🥊'); }}
        />
      )}

      <style jsx>{`
        .user-pill {
          all: unset;
          cursor: pointer;
        }

        /* Desktop: show full leaderboard label + sign-out text, hide icon-only variants */
        .lb-icon, .logout-icon { display: none; }
        .lb-text, .logout-text { display: inline; }

        .mobile-fab,
        .mobile-backdrop,
        .sidebar-handle {
          display: none;
        }

        @media (max-width: 768px) {
          .nav-right {
            gap: 6px !important;
          }

          /* Collapse text labels to icons to save space */
          .lb-text, .logout-text { display: none; }
          .lb-icon, .logout-icon { display: inline; }
          .user-name { display: none; }

          /* Sidebar becomes a bottom sheet */
          .sidebar {
            position: fixed !important;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100% !important;
            height: 75vh;
            max-height: 75vh;
            border-left: none !important;
            border-top: 1px solid #222;
            border-radius: 16px 16px 0 0;
            transform: translateY(100%);
            transition: transform 0.25s ease;
            z-index: 1500;
            flex-shrink: 0 !important;
          }
          .sidebar.open {
            transform: translateY(0);
          }

          .sidebar-handle {
            display: flex;
            justify-content: center;
            padding: 8px 0 6px;
            cursor: pointer;
            flex-shrink: 0;
          }
          .handle-bar {
            width: 40px;
            height: 4px;
            border-radius: 2px;
            background: #333;
          }

          .mobile-fab {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            bottom: 20px;
            right: 16px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: #e63946;
            border: none;
            color: #fff;
            font-size: 22px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            z-index: 1300;
            cursor: pointer;
          }
          .fab-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #fff;
            color: #e63946;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
          }

          .mobile-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1400;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root:    { display:'flex', flexDirection:'column', height:'100vh', background:'#0f0f0f', overflow:'hidden' },
  navbar:  { alignItems:'center', background:'#111', borderBottom:'1px solid #222', display:'flex', flexShrink:0, height:'52px', justifyContent:'space-between', padding:'0 16px' },
  logo:    { color:'#fff', fontSize:'18px', fontWeight:'700', flexShrink: 0 },
  navRight:{ alignItems:'center', display:'flex', gap:'10px', overflow: 'hidden' },
  leaderboardLink: { color:'#888', fontSize:'13px', textDecoration:'none', marginRight:'4px', flexShrink: 0 },
  toggleBtn: { alignItems:'center', borderRadius:'99px', cursor:'pointer', display:'flex', fontSize:'13px', fontWeight:'600', padding:'6px 14px', transition:'all 0.2s', flexShrink: 0, whiteSpace: 'nowrap' },
  bellBtn: { background:'transparent', border:'1px solid #333', borderRadius:'8px', color:'#fff', cursor:'pointer', fontSize:'16px', padding:'5px 10px', position:'relative', flexShrink: 0 },
  badge:   { background:'#e63946', borderRadius:'99px', color:'#fff', fontSize:'10px', fontWeight:'700', minWidth:'16px', padding:'1px 4px', position:'absolute', right:'-6px', top:'-6px' },
  userPill:{ alignItems:'center', background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'99px', display:'flex', gap:'8px', padding:'4px 12px 4px 4px', flexShrink: 0 },
  userDot: { alignItems:'center', background:'#e63946', borderRadius:'50%', color:'#fff', display:'flex', fontSize:'12px', fontWeight:'700', height:'26px', justifyContent:'center', width:'26px', flexShrink: 0 },
  userName:{ color:'#ccc', fontSize:'13px' },
  logoutBtn:{ background:'transparent', border:'1px solid #333', borderRadius:'8px', color:'#888', cursor:'pointer', fontSize:'12px', padding:'6px 10px', flexShrink: 0 },
  main:    { display:'flex', flex:1, overflow:'hidden', position: 'relative' },
  mapArea: { flex:1, position:'relative', minHeight:0 },
  sidebar: { background:'#111', borderLeft:'1px solid #222', display:'flex', flexDirection:'column', gap:'12px', overflowY:'auto', padding:'16px', width:'300px', flexShrink:0 },
  sidebarHeader: { alignItems:'center', display:'flex', justifyContent:'space-between' },
  sidebarTitle:  { color:'#888', fontSize:'11px', fontWeight:'600', letterSpacing:'0.08em', textTransform:'uppercase' },
  closeBtn:{ background:'transparent', border:'none', color:'#666', cursor:'pointer', fontSize:'16px', padding:'0' },
  hint:    { color:'#444', fontSize:'12px', lineHeight:'1.5', textAlign:'center' },
  loading: { alignItems:'center', background:'#0f0f0f', color:'#888', display:'flex', fontSize:'14px', height:'100vh', justifyContent:'center' },
};
