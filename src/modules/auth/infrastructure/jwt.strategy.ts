import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../../config/app-config.service';
import { AccessTokenPayload } from '../application/token.service';

export interface AuthenticatedUser {
  userId: string;
  role: AccessTokenPayload['role'];
  phoneNumber: string;
}

/** Strategy JWT: membaca `Authorization: Bearer <token>` (TRD §6.1). */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser | false {
    if (payload.typ !== 'access' || !payload.sub) return false;
    return { userId: payload.sub, role: payload.role, phoneNumber: payload.phone };
  }
}
