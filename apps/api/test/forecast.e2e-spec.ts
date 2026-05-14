import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Forecast E2E', () => {
  let app: INestApplication;
  let authToken: string;
  const tenantId = 'test-tenant-id';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginRes.body.access_token;
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
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

describe('InventoryRecommendation E2E', () => {
  let app: INestApplication;
  let authToken: string;
  const tenantId = 'test-tenant-id';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginRes.body.access_token;
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