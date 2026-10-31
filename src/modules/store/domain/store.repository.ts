/** Entitas gerai (tabel `stores`, BSD §2). */
export interface Store {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  openTime: string;
  closeTime: string;
}

export interface StoreWithDistance extends Store {
  distanceKm: number;
}

export interface NearbyStoreQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
}

export const STORE_REPOSITORY = Symbol('STORE_REPOSITORY');

/** Port repository gerai — diimplementasikan oleh lapisan infrastruktur. */
export interface StoreRepository {
  /** Gerai aktif dalam radius, terurut dari yang terdekat. */
  findNearby(query: NearbyStoreQuery): Promise<StoreWithDistance[]>;
  findActiveById(id: string): Promise<Store | null>;
}
