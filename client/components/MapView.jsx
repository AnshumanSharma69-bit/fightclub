'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

export default function MapView({ onFighterClick, currentFighterId }) {
  const mapRef     = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const zonesRef   = useRef([]); // zone overlay layers
  const userMarker = useRef(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Inject pulse animation styles once, globally, since Leaflet markers
    // render outside React's normal style scoping (divIcon uses raw HTML)
    if (typeof document !== 'undefined' && !document.getElementById('fc-pin-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'fc-pin-pulse-style';
      style.textContent = `
        @keyframes fc-pin-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(204,34,0,0.5), 0 2px 12px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 0 7px rgba(204,34,0,0), 0 2px 12px rgba(0,0,0,0.5); }
        }
        .fc-pin-available { animation: fc-pin-pulse 1.8s ease-in-out infinite; }

        @keyframes fc-badge-stamp {
          0%   { transform: scale(2) rotate(-6deg); opacity: 0; }
          55%  { transform: scale(0.94) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .fc-zone-label-held { animation: fc-badge-stamp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

        .fc-marker-pop { animation: fc-marker-pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes fc-marker-pop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    let L;

    const initMap = async () => {
      L = (await import('leaflet')).default;
      window._L = L;
      await import('leaflet/dist/leaflet.css');

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (leafletMap.current) return;

      leafletMap.current = L.map(mapRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(leafletMap.current);

      // Load zone overlays
      loadZones(L);

      if (navigator.geolocation) {
        setStatus('Getting your location...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            leafletMap.current.flyTo([latitude, longitude], 13, { duration: 1.5 });

            const youIcon = L.divIcon({
              className: '',
              html: `<div style="width:18px;height:18px;background:#e63946;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });

            if (userMarker.current) userMarker.current.remove();
            userMarker.current = L.marker([latitude, longitude], { icon: youIcon })
              .addTo(leafletMap.current)
              .bindPopup('<b>You</b>')
              .openPopup();

            setStatus('');
            loadNearbyFighters(L, longitude, latitude);
          },
          () => {
            setStatus('Location denied — showing all fighters');
            loadNearbyFighters(L, null, null);
          }
        );
      } else {
        loadNearbyFighters(L, null, null);
      }
    };

    initMap();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // ── Load zone overlays ──────────────────────────────────────────────────────
  const loadZones = async (L) => {
    try {
      const res   = await api.get('/zone/all');
      const zones = res.data;

      // Clear old zone layers
      zonesRef.current.forEach(layer => layer.remove());
      zonesRef.current = [];

      zones.forEach(zone => {
        if (!zone.boundary?.coordinates) return;

        const color      = zone.holder ? zone.color : '#444';
        const holderName = zone.holder?.username || 'Unclaimed';

        // Draw the polygon overlay
        const polygon = L.geoJSON(
          { type: 'Feature', geometry: zone.boundary },
          {
            style: {
              color,
              fillColor: color,
              fillOpacity: zone.holder ? 0.18 : 0.06,
              weight: zone.holder ? 2 : 1,
              opacity: zone.holder ? 0.7 : 0.3,
              dashArray: zone.holder ? null : '6 4',
            },
          }
        ).addTo(leafletMap.current);

        // Add a label in the center of the zone
        const bounds  = polygon.getBounds();
        const center  = bounds.getCenter();
        const label   = L.divIcon({
          className: '',
          html: `<div class="${zone.holder ? 'fc-zone-label-held' : ''}" style="
            background: ${zone.holder ? color + 'cc' : 'rgba(30,30,30,0.85)'};
            border: 1px solid ${zone.holder ? color : '#333'};
            border-radius: 8px;
            color: #fff;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 9px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            text-align: center;
            line-height: 1.4;
          ">
            ${zone.badgeEmoji} ${zone.name}<br/>
            <span style="font-weight:400;font-size:10px;opacity:0.85;">
              ${zone.holder ? '👑 ' + holderName : 'Unclaimed'}
            </span>
          </div>`,
          iconAnchor: [0, 0],
        });

        const labelMarker = L.marker(center, { icon: label, interactive: false })
          .addTo(leafletMap.current);

        // Tooltip on hover
        polygon.bindTooltip(`
          <b>${zone.badgeEmoji} ${zone.name}</b><br/>
          ${zone.holder ? `👑 Held by ${holderName}` : 'Unclaimed — win a fight here to claim it!'}<br/>
          ${zone.captureCount > 0 ? `🔄 Changed hands ${zone.captureCount} time(s)` : ''}
        `, { sticky: true });

        zonesRef.current.push(polygon);
        zonesRef.current.push(labelMarker);
      });
    } catch (err) {
      console.error('Failed to load zones:', err);
    }
  };

  // ── Load fighter pins ───────────────────────────────────────────────────────
  const loadNearbyFighters = async (L, lon, lat) => {
    try {
      const params = {};
      if (lon !== null && lat !== null) {
        params.lon    = lon;
        params.lat    = lat;
        params.radius = 50000;
      }

      const res      = await api.get('/fighter/nearby', { params });
      const fighters = res.data;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      fighters.forEach((fighter) => {
        if (!fighter.location?.coordinates) return;
        const [fLon, fLat] = fighter.location.coordinates;
        if (fLon === 0 && fLat === 0) return;

        const isAvailable = fighter.availableToFight;
        const isOwn       = fighter._id === currentFighterId;
        const hasBadges   = fighter.badgesEarned?.length > 0;

        const pinIcon = L.divIcon({
          className: '',
          html: `<div class="fc-marker-pop${isAvailable && !isOwn ? ' fc-pin-available' : ''}" style="
            width:38px;height:38px;
            background:${isOwn ? '#3b82f6' : isAvailable ? '#e63946' : '#2a2a2a'};
            border:2.5px solid ${isOwn ? '#93c5fd' : isAvailable ? '#ff8fa3' : '#444'};
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:13px;font-weight:700;
            cursor:pointer;
            position:relative;
          ">
            ${fighter.username?.[0]?.toUpperCase() || '?'}
            ${hasBadges ? `<div style="position:absolute;top:-4px;right:-4px;font-size:10px;">🏅</div>` : ''}
          </div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const marker = L.marker([fLat, fLon], { icon: pinIcon })
          .addTo(leafletMap.current)
          .bindTooltip(`
            <b>${fighter.username}</b>
            ${hasBadges ? ` 🏅×${fighter.badgesEarned.length}` : ''}<br/>
            ${fighter.weightClass} · ELO ${fighter.eloRating}<br/>
            ${isAvailable ? '🟢 Available' : '⚫ Not available'}
          `, { direction: 'top', offset: [0, -8] });

        marker.on('click', () => {
          if (onFighterClick) onFighterClick(fighter);
        });

        markersRef.current.push(marker);
      });
    } catch (err) {
      console.error('Failed to load fighters:', err);
    }
  };

  const styles = {
    statusBanner: {
      background: 'rgba(0,0,0,0.75)', borderRadius: '8px', color: '#fff',
      fontSize: '13px', left: '50%', padding: '8px 16px', position: 'absolute',
      top: '12px', transform: 'translateX(-50%)', zIndex: 1000,
    },
    refreshBtn: {
      background: 'rgba(0,0,0,0.75)', border: '1px solid #333', borderRadius: '8px',
      bottom: '20px', color: '#fff', cursor: 'pointer', fontSize: '13px',
      padding: '8px 14px', position: 'absolute', right: '12px', zIndex: 1000,
    },
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {status && <div style={styles.statusBanner}>{status}</div>}
      <button
        onClick={() => {
          if (!leafletMap.current || !window._L) return;
          const center = leafletMap.current.getCenter();
          loadNearbyFighters(window._L, center.lng, center.lat);
          loadZones(window._L);
        }}
        style={styles.refreshBtn}
      >
        🔄 Refresh
      </button>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
