import { SetMetadata } from '@nestjs/common';

import type { UserRole } from '../types/domain.types';

/** RolesGuard bu metadata'yı okur; işaretlenmemiş handler herkese açıktır. */
export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
