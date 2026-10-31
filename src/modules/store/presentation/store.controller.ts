import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ResponseMessage } from '../../../common/response/response-message.decorator';
import { StoreService } from '../application/store.service';
import { NearbyStoresQueryDto } from './dto/nearby-stores.query.dto';

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  /** GET /api/v1/stores/nearby — gerai terdekat berdasarkan GPS (Haversine). */
  @Get('nearby')
  @ResponseMessage('Nearby stores retrieved successfully')
  findNearby(@Query() q: NearbyStoresQueryDto) {
    return this.storeService.findNearby({
      latitude: q.lat,
      longitude: q.lng,
      radiusKm: q.radius_km,
      limit: q.limit,
    });
  }

  /** GET /api/v1/stores/:id — detail gerai aktif. */
  @Get(':id')
  @ResponseMessage('Store retrieved successfully')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.storeService.getActiveStore(id);
  }
}
