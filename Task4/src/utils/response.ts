import type { Response } from 'express';
import { requestCurl } from './curl.js';

/** The only way handlers send a successful body. `curl` is the request line, never the headers or body. */
export const sendSuccess = (res: Response, data: unknown, status = 200): void => {
  if (status === 204) {
    res.status(204).end();
    return;
  }
  res.status(status).json({ data, curl: requestCurl(res.req) });
};
