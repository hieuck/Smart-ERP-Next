import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';
import * as schema from './schema';
import { buildPoolConfig } from './pool-config';

if (!process.env.DATABASE_URL) {
  const envCandidates = [
    process.env.SMART_ERP_API_ENV,
    resolve(process.cwd(), 'apps/api/.env'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../apps/api/.env'),
  ].filter(Boolean) as string[];

  for (const envPath of envCandidates) {
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath });
      if (process.env.DATABASE_URL) break;
    }
  }
}

const pool = new Pool(buildPoolConfig());

export const db = drizzle(pool, { schema });
export { pool };
export type DB = typeof db;
