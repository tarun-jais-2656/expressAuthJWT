import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { getPool } from '../config/db.js';
import { getEnv } from '../config/env.js';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const migrate = async (): Promise<void> => {
  const env = getEnv();
  if (!IDENTIFIER.test(env.DB_NAME)) {
    throw new Error(`Invalid DB_NAME "${env.DB_NAME}"`);
  }

  const admin = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: 'postgres',
  });

  await admin.connect();
  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [env.DB_NAME]);
    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${env.DB_NAME}`);
    }
  } finally {
    await admin.end();
  }

  const sql = readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
  const pool = getPool();
  await pool.query(sql);
  await pool.end();
  console.log(`Migrated database "${env.DB_NAME}"`);
};

migrate().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
