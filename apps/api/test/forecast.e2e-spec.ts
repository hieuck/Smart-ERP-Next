import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db, tenants, users } from '@smart-erp/database';
import { sql } from '@smart-erp/database/drizzle';
import { AppModule } from '../src/app.module';

const { sign } = require('jsonwebtoken');

const TEST_JWT_SECRET = 'forecast-e2e-secret';

async function createAuthContext(prefix: string) {
  const runCode = randomUUID().slice(0, 8);
  const tenantId = randomUUID();
  const userId = randomUUID();

  await db.insert(tenants).values({
    id: tenantId,
    name: `${prefix} ${runCode}`,
    slug: `${prefix.toLowerCase()}-${runCode}`,
  });
  await db.insert(users).values({
    id: userId,
    email: `${prefix.toLowerCase()}-${runCode}@smarterp.vn`,
    name: `${prefix} Admin`,
    tenantId,
    role: 'admin',
  });

  const authToken = sign(
    {
      sub: userId,
      email: `${prefix.toLowerCase()}-${runCode}@smarterp.vn`,
      tenantId,
      role: 'admin',
    },
    TEST_JWT_SECRET,
    { expiresIn: '1h' },
  );

  return { authToken, tenantId };
}

describe('Forecast E2E', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    const authContext = await createAuthContext('ForecastE2E');
    authToken = authContext.authToken;
    tenantId = authContext.tenantId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /forecast/product/:id', () => {
    it('should return forecast data for product', async () => {
      const productId = randomUUID();
      await db.execute(sql`
        INSERT INTO products (id, name, tenant_id, sku, created_at, updated_at)
        VALUES (${productId}, 'E2E Forecast Product', ${tenantId}, 'FCT-SKU', NOW(), NOW())
      `);

      const res = await request(app.getHttpServer())
        .get(`/forecast/product/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('productId', productId);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data.predictions)).toBe(true);
    });
  });
});

describe('InventoryRecommendation E2E', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    const authContext = await createAuthContext('InventoryE2E');
    authToken = authContext.authToken;
    tenantId = authContext.tenantId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /inventory-recommendation/suggest', () => {
    it('should return reorder suggestion', async () => {
      // Create a product with a valid UUID to avoid PG error
      const productId = randomUUID();
      const warehouseId = randomUUID();
      await db.execute(sql`
        INSERT INTO products (id, name, tenant_id, sku, created_at, updated_at)
        VALUES (${productId}, 'E2E Test Product', ${tenantId}, 'E2E-SKU', NOW(), NOW())
      `);
      await db.execute(sql`
        INSERT INTO warehouses (id, name, tenant_id, created_at, updated_at)
        VALUES (${warehouseId}, 'E2E Warehouse', ${tenantId}, NOW(), NOW())
      `);
      await db.execute(sql`
        INSERT INTO inventory (id, product_id, warehouse_id, quantity, tenant_id, created_at, updated_at)
        VALUES (${randomUUID()}, ${productId}, ${warehouseId}, 50, ${tenantId}, NOW(), NOW())
      `);

      const res = await request(app.getHttpServer())
        .get(`/inventory-recommendation/suggest?productId=${productId}&stock=50`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('productId', productId);
      expect(res.body).toHaveProperty('suggestedReorder');
    });
  });
});
