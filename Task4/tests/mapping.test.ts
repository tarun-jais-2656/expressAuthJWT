import { describe, expect, test } from 'vitest';
import { toDomain as userToDomain, toPersistence as userToPersistence } from '../src/modules/user/user.repository.js';
import { toDomain as postToDomain, toPersistence as postToPersistence } from '../src/modules/post/post.repository.js';
import type { PostRow } from '../src/modules/post/post.interface.js';
import type { UserRow } from '../src/modules/user/user.interface.js';

const timestamp = new Date('2026-01-01T00:00:00.000Z');

describe('reference mapping', () => {
  test('user round trip keeps name and email', () => {
    const columns = userToPersistence({ name: 'Ada Lovelace', email: 'ada@example.com' });
    const row: UserRow = {
      id: 4,
      name: typeof columns.name === 'string' ? columns.name : '',
      email: typeof columns.email === 'string' ? columns.email : '',
      created_at: timestamp,
      updated_at: timestamp,
    };
    expect(userToDomain(row)).toMatchObject({ id: 4, name: 'Ada Lovelace', email: 'ada@example.com' });
  });

  test('post toDomain throws on an unknown status', () => {
    const row: PostRow = {
      id: 1,
      user_id: 2,
      title: 'Hello',
      body: 'World',
      status: 'archived',
      created_at: timestamp,
      updated_at: timestamp,
    };
    expect(() => postToDomain(row)).toThrow(/Unknown status "archived"/);
  });

  test('post partial update maps only the fields present', () => {
    expect(postToPersistence({ title: 'Updated' })).toEqual({ title: 'Updated' });
  });
});
