import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db, tenants, users } from '@smart-erp/database';
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
      const res = await request(app.getHttpServer())
        .get('/forecast/product/prod-123')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('productId', 'prod-123');
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
      const res = await request(app.getHttpServer())
        .get('/inventory-recommendation/suggest?productId=prod-123&stock=50')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('productId', 'prod-123');
      expect(res.body).toHaveProperty('suggestedReorder');
    });
  });
});
