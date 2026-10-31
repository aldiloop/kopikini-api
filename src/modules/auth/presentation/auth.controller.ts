import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ResponseMessage } from '../../../common/response/response-message.decorator';
import { AuthService } from '../application/auth.service';
import type { AuthenticatedUser } from '../infrastructure/jwt.strategy';
import { OtpRequestDto, OtpVerifyDto, RefreshTokenDto } from './dto/auth.dto';
import { CurrentUser, JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/v1/auth/otp-request — kirim kode OTP (BSD §3). */
  @Post('otp-request')
  @HttpCode(200)
  @ResponseMessage('OTP sent successfully')
  requestOtp(@Body() body: OtpRequestDto) {
    return this.authService.requestOtp(body.phone_number);
  }

  /** POST /api/v1/auth/otp-verify — verifikasi OTP & kembalikan JWT (BSD §3). */
  @Post('otp-verify')
  @HttpCode(200)
  @ResponseMessage('OTP verified successfully')
  verifyOtp(@Body() body: OtpVerifyDto) {
    return this.authService.verifyOtp(body.phone_number, body.otp, body.full_name);
  }

  /** POST /api/v1/auth/refresh — tukar refresh token (rotasi). */
  @Post('refresh')
  @HttpCode(200)
  @ResponseMessage('Token refreshed successfully')
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refresh_token);
  }

  /** GET /api/v1/auth/me — profil pengguna login (contoh endpoint ber-guard JWT). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Profile retrieved successfully')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }
}
