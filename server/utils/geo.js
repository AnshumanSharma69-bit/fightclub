// ─── createCirclePolygon ───────────────────────────────────────────────────────
// Generates a GeoJSON Polygon ring (array of [lon, lat] points) approximating
// a circle of `radiusKm` centered on (centerLon, centerLat).
//
// Used to give a newly-discovered zone (a town/city we don't have official
// boundary data for) a reasonable territory shape — basically "everything
// within X km of where this fighter won".
//
// Returns a closed ring: the first and last points are identical, which is
// required for a valid GeoJSON Polygon.
function createCirclePolygon(centerLon, centerLat, radiusKm, numPoints = 32) {
  const coords = [];
  const earthRadiusKm = 6371;
  const latRad = (centerLat * Math.PI) / 180;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);

    // Convert km offsets to degree offsets
    const deltaLat = (dy / earthRadiusKm) * (180 / Math.PI);
    const deltaLon = (dx / (earthRadiusKm * Math.cos(latRad))) * (180 / Math.PI);

    coords.push([centerLon + deltaLon, centerLat + deltaLat]);
  }

  return coords;
}

module.exports = { createCirclePolygon };
