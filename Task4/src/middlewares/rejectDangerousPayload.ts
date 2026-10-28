import type { RequestHandler } from 'express';
import { badRequest } from '../errors/AppError.js';

const DANGEROUS_KEY = /"(__proto__|constructor|prototype)"\s*:/;

/**
 * Rejects prototype-pollution keys in the raw JSON body before a controller runs.
 * express.json() calls `verify` with the buffer; see `jsonVerify`.
 */
export const jsonVerify = (req: unknown, _res: unknown, buf: Buffer): void => {
  if (buf.length === 0) return;
  const text = buf.toString('utf8');
  const match = DANGEROUS_KEY.exec(text);
  if (!match) return;
  const key = match[1] ?? 'payload';
  throw badRequest('Dangerous payload key rejected', [
    { path: key, message: 'prototype pollution key is not allowed' },
  ]);
};

/** Second check on the parsed body, for keys that survived JSON.parse. */
export const rejectDangerousPayload: RequestHandler = (req, _res, next) => {
  const found = findDangerousKey(req.body);
  if (found) {
    next(
      badRequest('Dangerous payload key rejected', [
        { path: found, message: 'prototype pollution key is not allowed' },
      ]),
    );
    return;
  }
  next();
};

const findDangerousKey = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  for (const key of Object.getOwnPropertyNames(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return key;
    const nested = findDangerousKey((value as Record<string, unknown>)[key]);
    if (nested) return nested;
  }
  return undefined;
};
