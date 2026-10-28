import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isAppError } from '../errors/AppError.js';
import { getEnv } from '../config/env.js';
import { requestCurl } from '../utils/curl.js';

interface FieldError {
  path: string;
  message: string;
}

const formatZodError = (err: ZodError): FieldError[] => {
  const details: FieldError[] = [];
  for (const issue of err.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        details.push({
          path: [...issue.path.map(String), key].filter(Boolean).join('.'),
          message: `Unrecognized key: ${key}`,
        });
      }
      continue;
    }
    details.push({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    });
  }
  return details;
};

/**
 * The only place errors become HTTP responses.
 * Express 5 forwards rejected promises from async handlers here.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const curl = requestCurl(req);

  if (isAppError(err)) {
    res.status(err.statusCode).json({ error: { message: err.message, details: err.details }, curl });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: 'Validation failed', details: formatZodError(err) }, curl });
    return;
  }

  const type = typeof err === 'object' && err !== null && 'type' in err ? String((err as { type?: unknown }).type) : '';

  if (type === 'entity.too.large') {
    res.status(413).json({
      error: { message: 'Payload too large', details: [{ path: 'body', message: 'Payload too large' }] },
      curl,
    });
    return;
  }

  if (type === 'entity.parse.failed') {
    res.status(400).json({
      error: { message: 'Malformed JSON body', details: [{ path: 'body', message: 'Malformed JSON body' }] },
      curl,
    });
    return;
  }

  console.error('Unhandled error:', err);
  const message = getEnv().NODE_ENV === 'production' ? 'Internal Server Error' : (err as Error).message;
  res.status(500).json({ error: { message }, curl });
};
