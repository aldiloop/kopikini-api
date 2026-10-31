import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './application/auth.service';
import { TokenService } from './application/token.service';
import {
  OTP_REPOSITORY,
  OTP_SENDER,
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from './domain/auth.ports';
import { ConsoleOtpSender } from './infrastructure/console-otp.sender';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import {
  PgOtpRepository,
  PgRefreshTokenRepository,
  PgUserRepository,
} from './infrastructure/pg-auth.repositories';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/jwt-auth.guard';

@Module({
  // Secret & TTL diberikan per-panggilan di TokenService (dari environment).
  imports: [PassportModule, JwtModule.register({ signOptions: { algorithm: 'HS256' } })],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    { provide: USER_REPOSITORY, useClass: PgUserRepository },
    { provide: OTP_REPOSITORY, useClass: PgOtpRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PgRefreshTokenRepository },
    { provide: OTP_SENDER, useClass: ConsoleOtpSender },
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
