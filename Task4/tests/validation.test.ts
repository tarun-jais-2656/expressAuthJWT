import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../src/modules/user/user.repository', () => ({
  insert: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
  toDomain: vi.fn(),
  toPersistence: vi.fn(),
}));

import app from '../src/app.js';
import * as userRepository from '../src/modules/user/user.repository.js';

const pathsOf = (details: unknown): string => JSON.stringify(details);

describe('reference validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('rejects stored XSS in a user name before the repository runs', async () => {
    // A stored script would run in any page that rendered the name as HTML.
    const response = await request(app).post('/api/users').send({ name: '<script>alert(1)</script>', email: 'ada@example.com' });
    expect(response.status).toBe(400);
    expect(pathsOf(response.body.error.details)).toContain('name');
    expect(userRepository.insert).not.toHaveBeenCalled();
  });

  test('rejects mass assignment of id on create', async () => {
    // A client-supplied id would let someone overwrite another user's row.
    const response = await request(app)
      .post('/api/users')
      .send({ id: 1, name: 'Ada', email: 'ada@example.com' });
    expect(response.status).toBe(400);
    expect(pathsOf(response.body.error.details)).toContain('id');
    expect(userRepository.insert).not.toHaveBeenCalled();
  });
});
