import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResponseMessage } from '../../../common/response/response-message.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { OrdersService } from '../application/orders.service';
import { CurrentUser, JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { CheckoutDto, StaffOrdersQueryDto, UpdateStatusDto } from './dto/orders.dto';
import { presentOrder } from './orders.presenter';
import { RolesGuard, StaffRoles } from './roles.guard';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** POST /api/v1/orders/checkout — JWT, header Idempotency-Key (UUID) wajib. */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Order created successfully')
  async checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey || !UUID_RE.test(idempotencyKey)) {
      throw AppException.badRequest('Idempotency-Key header is required and must be a UUID', [
        { field: 'Idempotency-Key', issue: 'Header is required and must be a UUID' },
      ]);
    }
    return presentOrder(await this.ordersService.checkout(user.userId, dto, idempotencyKey));
  }

  /** GET /api/v1/orders/my — daftar order pengguna yang login. */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Orders retrieved successfully')
  async listMine(@CurrentUser() user: AuthenticatedUser) {
    return (await this.ordersService.listMyOrders(user.userId)).map(presentOrder);
  }

  /** GET /api/v1/orders/staff — daftar order untuk staf (filter opsional). */
  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @StaffRoles()
  @ResponseMessage('Orders retrieved successfully')
  async listStaff(@CurrentUser() user: AuthenticatedUser, @Query() q: StaffOrdersQueryDto) {
    return (
      await this.ordersService.listStaffOrders({ storeId: q.store_id, status: q.status }, user)
    ).map(presentOrder);
  }

  /** GET /api/v1/orders/:id/track — pemilik order atau staf. */
  @Get(':id/track')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Order retrieved successfully')
  async track(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return presentOrder(await this.ordersService.track(id, user));
  }

  /** PATCH /api/v1/orders/:id/status — staf saja, dengan aturan transisi. */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @StaffRoles()
  @ResponseMessage('Order status updated successfully')
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return presentOrder(await this.ordersService.updateStatus(id, dto.status, user));
  }
}

/**
 * Webhook Midtrans — PUBLIK (tanpa JWT, sesuai kontrak gateway).
 * Body diterima mentah (Record) dengan sengaja, BUKAN DTO class-validator:
 * payload Midtrans membawa banyak field tambahan dan global ValidationPipe
 * (forbidNonWhitelisted) akan menolaknya 400. Validasi & verifikasi signature
 * dilakukan di OrdersService.handleMidtransWebhook.
 */
@Controller('payments')
export class MidtransWebhookController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('midtrans-webhook')
  @HttpCode(200)
  @ResponseMessage('Webhook received')
  async handleWebhook(@Body() body: Record<string, unknown>) {
    return presentOrder(await this.ordersService.handleMidtransWebhook(body ?? {}));
  }
}
