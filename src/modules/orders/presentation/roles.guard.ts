import { CanActivate, ExecutionContext, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../../common/exceptions/app.exception';
import { UserRole } from '../../auth/domain/auth.ports';

export const STAFF_ROLES: UserRole[] = ['BARISTA', 'STORE_MANAGER', 'ADMIN'];
export const ROLES_KEY = 'kopikini:roles';

/** Dekorator rute staf: `@StaffRoles()` (hanya BARISTA/STORE_MANAGER/ADMIN). */
export const StaffRoles = () => SetMetadata(ROLES_KEY, STAFF_ROLES);

/**
 * Guard peran sederhana di dalam modul orders (tidak mengubah modul auth):
 * membaca role dari user JWT (diisi JwtAuthGuard) dan menolak 403 bila role
 * tidak termasuk daftar yang diminta decorator. Tanpa decorator, guard lolos
 * (dipakai bersama JwtAuthGuard saja untuk rute user biasa).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const user = ctx.switchToHttp().getRequest().user as { role?: UserRole } | undefined;
    if (!user || !user.role || !roles.includes(user.role)) {
      throw new AppException(HttpStatus.FORBIDDEN, 'Staff access required');
    }
    return true;
  }
}
