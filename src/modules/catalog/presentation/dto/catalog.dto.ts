import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** Query `GET /api/v1/menu/catalog?store_id=<UUID>` (BSD §3). */
export class CatalogQueryDto {
  @IsUUID()
  store_id: string;
}

/** Body `POST /api/v1/menu/products/:id/price`. */
export class PriceQuoteDto {
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  modifier_ids: string[] = [];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;
}
