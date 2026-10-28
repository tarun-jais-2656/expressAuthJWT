import { signAccessToken } from '../src/auth/tokens.js';
import type { Role } from '../src/config/permissions.js';

/** Bearer token whose role claim is only a hint. authenticate reloads the role from the user repository. */
export const as = (id: number, role: Role): string => `Bearer ${signAccessToken({ sub: id, role })}`;
