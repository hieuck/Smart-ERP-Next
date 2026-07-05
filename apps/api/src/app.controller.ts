import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '@smart-erp/database';
import { sql } from '@smart-erp/database/drizzle';

const apiVersion = (() => {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
    );
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
})();

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return { name: 'Smart ERP Next API', version: apiVersion };
  }

  @Get('health')
  async getHealth() {
    let dbStatus = 'ok';
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      db: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
