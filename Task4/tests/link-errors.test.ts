import { describe, expect, test } from 'vitest';
import { conflict, isAppError } from '../src/errors/AppError.js';
import { translateLinkError } from '../src/modules/access/access.repository.js';

describe('link errors', () => {
  test('a unique violation becomes 409', () => {
    const translated = translateLinkError(Object.assign(new Error('duplicate key'), { code: '23505' }));
    expect(isAppError(translated)).toBe(true);
    if (isAppError(translated)) expect(translated.statusCode).toBe(409);
  });

  test('other failures are left untouched', () => {
    const err = conflict('kept');
    expect(translateLinkError(err)).toBe(err);
  });
});
