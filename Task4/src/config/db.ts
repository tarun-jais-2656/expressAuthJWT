import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { getEnv } from './env.js';

let poolInstance: Pool | undefined;

export const getPool = (): Pool => {
  if (!poolInstance) {
    const env = getEnv();
    poolInstance = new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    });
  }
  return poolInstance;
};

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> => getPool().query<T>(text, params);
