import { createHmac, timingSafeEqual } from 'node:crypto';
import { getEnv } from '../config/env.js';
import type { Role } from '../config/permissions.js';
import { unauthorized } from '../errors/AppError.js';

/** Access tokens last 15 minutes. The role claim is not trusted; authenticate reloads it. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface AccessTokenClaims {
  sub: number;
  role: Role;
}

const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');

export const signAccessToken = (claims: AccessTokenClaims): string => {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: claims.sub,
    role: claims.role,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
  });
  const data = `${header}.${payload}`;
  const signature = createHmac('sha256', getEnv().JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
};

export const verifyAccessToken = (token: string): { sub: number } => {
  const parts = token.split('.');
  if (parts.length !== 3) throw unauthorized('Authentication required');
  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) throw unauthorized('Authentication required');

  const data = `${header}.${payload}`;
  const expected = createHmac('sha256', getEnv().JWT_SECRET).update(data).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw unauthorized('Authentication required');
  }

  let body: { sub?: unknown; exp?: unknown };
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: unknown; exp?: unknown };
  } catch {
    throw unauthorized('Authentication required');
  }

  if (typeof body.exp !== 'number' || body.exp < Math.floor(Date.now() / 1000)) {
    throw unauthorized('Authentication required');
  }
  if (typeof body.sub !== 'number' || !Number.isInteger(body.sub) || body.sub <= 0) {
    throw unauthorized('Authentication required');
  }
  return { sub: body.sub };
};
