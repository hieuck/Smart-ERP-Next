import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://smart_erp:secret_password@localhost:5432/smart_erp';

async function main() {
  console.log('🔌 Connecting to database...');
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected!');

    console.log('🗑️ Resetting database schema...');
    // Drop and recreate schema public to wipe all outdated tables and custom columns
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    console.log('✅ Schema reset complete!');

    console.log('🚀 Running sequential Drizzle migrations (Pure SQL Mode)...');
    const drizzleDir = path.resolve(__dirname, '../packages/database/drizzle');
    const files = fs.readdirSync(drizzleDir);
    
    // Filter for sql files directly in packages/database/drizzle and sort alphabetically
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    console.log(`📦 Found ${sqlFiles.length} sequential migration files.`);

    for (const sqlFile of sqlFiles) {
      const filePath = path.join(drizzleDir, sqlFile);
      console.log(`   ➡️ Executing: ${sqlFile}`);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      // Execute the entire migration SQL script
      await client.query(sqlContent);
    }
    
    console.log('✅ All migrations completed successfully!');
    client.release();

    // Execute Golden Seed using pnpm filter to guarantee all NestJS dependency paths work
    console.log('🌱 Seeding database via Golden Seed...');
    execSync('pnpm --filter @smart-erp/api seed', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL,
      },
    });
    console.log('✅ Golden Seed executed successfully!');

  } catch (error: any) {
    console.error('❌ Error occurred during reset/migration/seed process:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Root execution error:', err);
  process.exit(1);
});
