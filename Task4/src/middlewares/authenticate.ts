import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../auth/tokens.js';
import { isAppError, unauthorized } from '../errors/AppError.js';
import type { Actor } from '../modules/access/actor.js';
import * as userRepository from '../modules/user/user.repository.js';

/** JWT -> req.user. The role always comes from the database, not from the token. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized());
    return;
  }

  try {
    const claims = verifyAccessToken(header.slice('Bearer '.length).trim());
    const user = await userRepository.findById(claims.sub);
    if (!user) {
      next(unauthorized());
      return;
    }
    req.user = { id: user.id, role: user.role, studentId: user.studentId };
    next();
  } catch (err) {
    next(isAppError(err) ? err : unauthorized());
  }
};

export const currentActor = (req: { user?: Actor }): Actor => {
  if (!req.user) throw unauthorized();
  return req.user;
};
