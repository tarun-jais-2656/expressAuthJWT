import type { RequestHandler } from 'express';
import { notFound } from '../errors/AppError.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found`));
};
