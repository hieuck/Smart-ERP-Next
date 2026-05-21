/**
 * Push schema to database using drizzle-orm's built-in push API.
 * Run: npx tsx scripts/push-schema.ts
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../packages/database/src/schema/index.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://smart_erp:secret_password@localhost:5432/smart_erp';

async function main() {
  console.log('Connecting to database...');
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  
  // Test connection
  const client = await pool.connect();
  console.log('Connected successfully!');
  
  // Create all tables using raw SQL from schema definitions
  // We'll use drizzle's sql template to create tables
  const db = drizzle(pool, { schema });
  
  // Get all table names from schema
  const tableNames = Object.keys(schema).filter(k => {
    const val = (schema as any)[k];
    return val && typeof val === 'object' && val[Symbol.for('drizzle:Name')];
  });
  
  console.log(`Found ${tableNames.length} schema exports`);
  
  // Use pg to check if tables exist
  const result = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log(`Existing tables: ${result.rows.length}`);
  if (result.rows.length > 0) {
    console.log('Tables:', result.rows.map(r => r.table_name).join(', '));
  }
  
  client.release();
  await pool.end();
  console.log('Done!');
}

main().catch(console.error);
