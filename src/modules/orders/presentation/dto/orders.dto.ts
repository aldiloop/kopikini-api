import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ORDER_STATUSES, PAYMENT_CHANNELS } from '../../domain/order.entities';

/** Satu item checkout — sesuai body CheckoutRequest web (tanpa harga dari client). */
export class CheckoutItemDto {
  @IsUUID()
  product_id: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  modifier_ids?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

/** Body POST /orders/checkout (BSD §3 + web CheckoutRequest). */
export class CheckoutDto {
  @IsUUID()
  store_id: string;

  @IsIn(['PICKUP', 'DELIVERY'])
  order_type: 'PICKUP' | 'DELIVERY';

  @IsIn(PAYMENT_CHANNELS)
  payment_channel: (typeof PAYMENT_CHANNELS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}

/** Body PATCH /orders/:id/status (staf saja). */
export class UpdateStatusDto {
  @IsIn(ORDER_STATUSES)
  status: (typeof ORDER_STATUSES)[number];
}

/** Query GET /orders/staff (staf saja). */
export class StaffOrdersQueryDto {
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: (typeof ORDER_STATUSES)[number];
}
