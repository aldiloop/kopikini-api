import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../config/app-config.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CLOCK, Clock } from '../../../common/clock';
import { isOpenAt, minutesInTimeZone, StoreOperationalStatus } from '../domain/store-hours';
import { Store, STORE_REPOSITORY, StoreRepository } from '../domain/store.repository';

export interface StoreView {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  open_time: string;
  close_time: string;
  status: StoreOperationalStatus;
  distance_km?: number;
}

@Injectable()
export class StoreService {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    private readonly config: AppConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async findNearby(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<StoreView[]> {
    const radiusKm = params.radiusKm ?? this.config.get('STORE_NEARBY_DEFAULT_RADIUS_KM');
    const limit = params.limit ?? 20;
    const rows = await this.stores.findNearby({
      latitude: params.latitude,
      longitude: params.longitude,
      radiusKm,
      limit,
    });
    const now = this.nowMinutes();
    return rows.map((s) => ({
      ...this.toView(s, now),
      distance_km: Math.round(s.distanceKm * 100) / 100,
    }));
  }

  async getActiveStore(id: string): Promise<StoreView> {
    const store = await this.stores.findActiveById(id);
    if (!store) {
      throw AppException.notFound('Store not found', [
        { field: 'store_id', issue: 'Store does not exist or is inactive' },
      ]);
    }
    return this.toView(store, this.nowMinutes());
  }

  private nowMinutes(): number {
    return minutesInTimeZone(this.clock(), this.config.get('STORE_TIMEZONE'));
  }

  private toView(s: Store, nowMinutes: number): StoreView {
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      open_time: s.openTime.slice(0, 5),
      close_time: s.closeTime.slice(0, 5),
      status: isOpenAt(s.openTime, s.closeTime, nowMinutes) ? 'OPEN' : 'CLOSED',
    };
  }
}
