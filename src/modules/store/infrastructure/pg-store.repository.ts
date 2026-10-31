import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';
import { toNumber } from '../../../infrastructure/database/pg-mappers';
import { boundingBox, EARTH_RADIUS_KM } from '../domain/haversine';
import {
  NearbyStoreQuery,
  Store,
  StoreRepository,
  StoreWithDistance,
} from '../domain/store.repository';

interface StoreRow {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
  open_time: string;
  close_time: string;
  distance_km?: number;
}

const mapRow = (r: StoreRow): Store => ({
  id: r.id,
  code: r.code,
  name: r.name,
  address: r.address,
  latitude: toNumber(r.latitude),
  longitude: toNumber(r.longitude),
  isActive: r.is_active,
  openTime: r.open_time,
  closeTime: r.close_time,
});

/**
 * Query Haversine murni di PostgreSQL (tanpa PostGIS) dengan pra-filter bounding
 * box agar index `idx_stores_lat_lng` terpakai.
 */
export const NEARBY_STORES_SQL = `
SELECT * FROM (
  SELECT s.id, s.code, s.name, s.address, s.latitude, s.longitude, s.is_active,
         s.open_time, s.close_time,
         2 * ${EARTH_RADIUS_KM} * ASIN(LEAST(1, SQRT(
             POWER(SIN(RADIANS(s.latitude::float8 - $1::float8) / 2), 2)
           + COS(RADIANS($1::float8)) * COS(RADIANS(s.latitude::float8))
           * POWER(SIN(RADIANS(s.longitude::float8 - $2::float8) / 2), 2)
         ))) AS distance_km
  FROM stores s
  WHERE s.is_active = TRUE
    AND s.latitude  BETWEEN $3::float8 AND $4::float8
    AND s.longitude BETWEEN $5::float8 AND $6::float8
) nearby
WHERE nearby.distance_km <= $7::float8
ORDER BY nearby.distance_km ASC, nearby.code ASC
LIMIT $8::int`;

@Injectable()
export class PgStoreRepository implements StoreRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findNearby(q: NearbyStoreQuery): Promise<StoreWithDistance[]> {
    const box = boundingBox(q, q.radiusKm);
    const { rows } = await this.pool.query<StoreRow>(NEARBY_STORES_SQL, [
      q.latitude,
      q.longitude,
      box.minLat,
      box.maxLat,
      box.minLng,
      box.maxLng,
      q.radiusKm,
      q.limit,
    ]);
    return rows.map((r) => ({ ...mapRow(r), distanceKm: toNumber(r.distance_km) }));
  }

  async findActiveById(id: string): Promise<Store | null> {
    const { rows } = await this.pool.query<StoreRow>(
      `SELECT id, code, name, address, latitude, longitude, is_active, open_time, close_time
         FROM stores WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }
}
