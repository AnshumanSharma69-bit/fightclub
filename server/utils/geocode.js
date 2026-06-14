// ─── reverseGeocode ─────────────────────────────────────────────────────────
// Turns (lat, lon) into a place name using OpenStreetMap's free Nominatim API.
// No API key, no credit card — just a polite User-Agent header as required
// by Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/).
//
// zoom=10 returns city/town-level results rather than exact street addresses.
//
// Returns: { name: string, state: string } | null
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        // Nominatim requires a descriptive User-Agent identifying the app
        'User-Agent': 'FightClubApp/1.0 (student project)',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address || {};

    // Try the most specific locality name first, falling back to broader
    // regions for very rural areas where city/town isn't set
    const name =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state_district ||
      addr.state ||
      null;

    return { name, state: addr.state || '' };
  } catch (err) {
    console.error('Reverse geocode failed:', err.message);
    return null;
  }
}

module.exports = { reverseGeocode };
