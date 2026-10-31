import { createParamDecorator, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppException } from '../../../common/exceptions/app.exception';
import type { AuthenticatedUser } from '../infrastructure/jwt.strategy';

/** Guard JWT untuk endpoint yang butuh login. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = AuthenticatedUser>(err: unknown, user: TUser | false): TUser {
    if (err || !user) throw AppException.unauthorized('Missing or invalid access token');
    return user;
  }
}

/** Ambil user terautentikasi dari request: `@CurrentUser() user: AuthenticatedUser`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    ctx.switchToHttp().getRequest().user,
);
