import type { Request } from 'express';

/** A request line for debugging. It never includes headers or the body, so secrets stay out. */
export const requestCurl = (req: Request): string => {
  const host = req.get('host') ?? 'localhost';
  return `curl -X ${req.method} '${req.protocol}://${host}${req.originalUrl}'`;
};
