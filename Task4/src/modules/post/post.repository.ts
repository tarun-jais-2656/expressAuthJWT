import { query } from '../../config/db.js';
import { buildInsert } from '../../db/sql.js';
import { notFound } from '../../errors/AppError.js';
import { pgCode } from '../../db/pgError.js';
import { POST_STATUSES, type Post, type PostChanges, type PostRow, type PostStatus } from './post.interface.js';

const COLUMNS = ['user_id', 'title', 'body', 'status'] as const;

const isStatus = (value: string): value is PostStatus =>
  (POST_STATUSES as readonly string[]).includes(value);

export const toDomain = (row: PostRow): Post => {
  if (!isStatus(row.status)) {
    throw new Error(`Unknown status "${row.status}"`);
  }
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

export const toPersistence = (changes: PostChanges): Record<string, string | number> => {
  const columns: Record<string, string | number> = {};
  if (changes.userId !== undefined) columns.user_id = changes.userId;
  if (changes.title !== undefined) columns.title = changes.title;
  if (changes.body !== undefined) columns.body = changes.body;
  if (changes.status !== undefined) columns.status = changes.status;
  return columns;
};

export const insert = async (changes: PostChanges): Promise<Post> => {
  const statement = buildInsert('posts', COLUMNS, toPersistence(changes));
  try {
    const result = await query<PostRow>(statement.text, statement.values);
    const row = result.rows[0];
    if (!row) throw new Error('Insert did not return a post');
    return toDomain(row);
  } catch (err) {
    if (pgCode(err) === '23503') throw notFound(`User ${changes.userId ?? ''} not found`);
    throw err;
  }
};
