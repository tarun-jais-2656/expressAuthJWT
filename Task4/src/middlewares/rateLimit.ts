import type { Request, RequestHandler } from 'express';
import { createError } from '../errors/AppError.js';

interface RateLimitOptions {
  windowMs: number;
  max: number | (() => number);
  keyGenerator: (req: Request) => string;
}

export interface RateLimiter extends RequestHandler {
  reset: () => void;
}

/** In-memory limiter. Key it by the authenticated user, not by IP. */
export const createRateLimiter = (options: RateLimitOptions): RateLimiter => {
  const hits = new Map<string, number[]>();
  const middleware = ((req, _res, next) => {
    const max = typeof options.max === 'function' ? options.max() : options.max;
    const key = options.keyGenerator(req);
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < options.windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      next(createError(429, 'Too many requests'));
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  }) as RateLimiter;
  middleware.reset = () => hits.clear();
  return middleware;
};

/** School NAT: many people share one address, so the marks write limit follows req.user.id. */
export const perUserKey = (req: Request): string => `user:${req.user?.id ?? 'none'}`;

const marksMax = (): number => {
  const raw = process.env.MARKS_RATE_LIMIT_MAX;
  if (raw === undefined || raw.trim() === '') return 60;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 60;
};

export const marksWriteLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: marksMax,
  keyGenerator: perUserKey,
});

export const resetRateLimits = (): void => {
  marksWriteLimiter.reset();
};
