import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db, tenants, users } from '@smart-erp/database';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters';
import { ResponseFormatInterceptor } from '../src/common/interceptors/response-format.interceptor';

const { sign } = require('jsonwebtoken');

const TEST_JWT_SECRET = 'api-contracts-e2e-secret';

describe('API Contracts', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new ResponseFormatInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    const runCode = randomUUID().slice(0, 8);
    const tenantId = randomUUID();
    const userId = randomUUID();

    await db.insert(tenants).values({
      id: tenantId,
      name: `API Contracts E2E ${runCode}`,
      slug: `api-contracts-e2e-${runCode}`,
    });
    await db.insert(users).values({
      id: userId,
      email: `api-contracts-e2e-${runCode}@smarterp.vn`,
      name: 'API Contracts E2E Admin',
      tenantId,
      role: 'admin',
    });

    authToken = sign(
      {
        sub: userId,
        email: `api-contracts-e2e-${runCode}@smarterp.vn`,
        tenantId,
        role: 'admin',
      },
      TEST_JWT_SECRET,
      { expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /health returns 200 with ok status', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
      expect(res.body.data).toMatchObject({ status: 'ok' });
      expect(typeof res.headers['x-request-id']).toBe('string');
    });
  });

  describe('Status', () => {
    it('GET /status returns 200 with version and uptime', async () => {
      const res = await request(app.getHttpServer()).get('/status');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
      expect(typeof res.body.data.version).toBe('string');
      expect(typeof res.body.data.uptime).toBe('number');
    });
  });

  describe('Auth', () => {
    it('POST /auth/login with bad credentials returns 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'none@test.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        success: false,
        data: null,
      });
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('Products', () => {
    it('GET /products without auth returns 401', async () => {
      const res = await request(app.getHttpServer()).get('/products');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        success: false,
        data: null,
      });
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('Orders', () => {
    it('GET /orders without auth returns 401', async () => {
      const res = await request(app.getHttpServer()).get('/orders');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        success: false,
        data: null,
      });
      expect(typeof res.body.error).toBe('string');
    });

    it('GET /orders/:id with invalid UUID returns 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        data: null,
      });
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('Response format', () => {
    it('returns consistent error envelope on 404', async () => {
      const res = await request(app.getHttpServer()).get('/api/nonexistent-route');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        data: null,
      });
      expect(typeof res.body.error).toBe('string');
      expect(typeof res.body.errorCode).toBe('string');
      expect(typeof res.body.requestId).toBe('string');
    });
  });
});
