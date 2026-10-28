import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('base64url');
  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${hash.toString('base64url')}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [algo, salt, digest] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !digest) return false;
  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  const expected = Buffer.from(digest, 'base64url');
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
};
