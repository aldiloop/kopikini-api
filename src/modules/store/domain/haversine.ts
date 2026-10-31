/** Radius rata-rata bumi (km) — dipakai juga oleh query SQL di PgStoreRepository. */
export const EARTH_RADIUS_KM = 6371;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Jarak great-circle (km) dengan formula Haversine (TRD §5.2):
 * d = 2R · asin( sqrt( sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2) ) )
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Kotak pembatas (bounding box) di sekitar titik untuk pra-filter berbasis index
 * `idx_stores_lat_lng` sebelum menghitung Haversine yang mahal.
 */
export function boundingBox(center: GeoPoint, radiusKm: number) {
  const latDelta = radiusKm / 111.045;
  const cosLat = Math.max(Math.cos(toRad(center.latitude)), 1e-6);
  const lngDelta = radiusKm / (111.045 * cosLat);
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}
