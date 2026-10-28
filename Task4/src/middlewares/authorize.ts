import type { RequestHandler } from 'express';
import { hasPermission, type Permission } from '../config/permissions.js';
import { forbidden, unauthorized } from '../errors/AppError.js';

export const requirePermission =
  (...permissions: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!permissions.every((permission) => hasPermission(req.user!.role, permission))) {
      next(forbidden());
      return;
    }
    next();
  };

export const requireAnyPermission =
  (...permissions: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!permissions.some((permission) => hasPermission(req.user!.role, permission))) {
      next(forbidden());
      return;
    }
    next();
  };
