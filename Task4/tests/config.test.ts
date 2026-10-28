import { describe, expect, test } from 'vitest';
import { validateConfig } from '../src/config/env.js';

const valid = {
  NODE_ENV: 'test',
  PORT: '3000',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'user',
  DB_PASSWORD: 'secret',
  DB_NAME: 'school',
  PASS_PERCENTAGE: '40',
  ACADEMIC_YEAR: '2026-27',
  JWT_SECRET: 'test-jwt-secret-value',
  CORS_ORIGINS: 'http://localhost:3000',
  MARKS_RATE_LIMIT_MAX: '60',
};

describe('validateConfig', () => {
  test('PASS_PERCENTAGE missing -> is required but missing', () => {
    const source = { ...valid };
    delete (source as Partial<typeof source>).PASS_PERCENTAGE;
    expect(() => validateConfig(source)).toThrow(/PASS_PERCENTAGE is required but missing/);
  });

  test('PASS_PERCENTAGE = abc is not a number', () => {
    expect(() => validateConfig({ ...valid, PASS_PERCENTAGE: 'abc' })).toThrow(
      /PASS_PERCENTAGE must be a number \(received "abc"\)/,
    );
  });

  test('PASS_PERCENTAGE = 150 is out of range', () => {
    expect(() => validateConfig({ ...valid, PASS_PERCENTAGE: '150' })).toThrow(
      /PASS_PERCENTAGE must be from 0 to 100 \(received "150"\)/,
    );
  });

  test('ACADEMIC_YEAR = 26-27 is the wrong format', () => {
    expect(() => validateConfig({ ...valid, ACADEMIC_YEAR: '26-27' })).toThrow(
      /ACADEMIC_YEAR must use YYYY-YY \(received "26-27"\)/,
    );
  });

  test('ACADEMIC_YEAR = 2026-28 fails the year cross-check', () => {
    expect(() => validateConfig({ ...valid, ACADEMIC_YEAR: '2026-28' })).toThrow(
      /ACADEMIC_YEAR: second year must follow the first \(received "2026-28"\)/,
    );
  });

  test('CORS_ORIGINS=* is rejected with its own message', () => {
    const message =
      "CORS_ORIGINS=* is unsafe: a wildcard lets any website call this API with the user's browser session. List explicit https origins instead.";
    expect(() => validateConfig({ ...valid, CORS_ORIGINS: '*' })).toThrow(message);
    try {
      validateConfig({ ...valid, CORS_ORIGINS: '*' });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe(message);
    }
  });

  test('CORS_ORIGINS that is not a URL still says it must be a full URL', () => {
    expect(() => validateConfig({ ...valid, CORS_ORIGINS: 'nowhere' })).toThrow(
      'CORS_ORIGINS must be a full URL (received "nowhere")',
    );
  });

  test('PASS_PERCENTAGE "33.5" parses to the number 33.5', () => {
    const env = validateConfig({ ...valid, PASS_PERCENTAGE: '33.5' });
    expect(env.PASS_PERCENTAGE).toBe(33.5);
    expect(env.ACADEMIC_YEAR).toBe('2026-27');
  });
});
