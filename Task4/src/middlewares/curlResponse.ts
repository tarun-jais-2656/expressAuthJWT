import type { RequestHandler } from 'express';

/** Logs the request as a curl-style line once the response status is known. */
export const curlResponse: RequestHandler = (req, res, next) => {
  res.on('finish', () => {
    console.log(`curl -X ${req.method} '${req.originalUrl}' -> ${res.statusCode}`);
  });
  next();
};
