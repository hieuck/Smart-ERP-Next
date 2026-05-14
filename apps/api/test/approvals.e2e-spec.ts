import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Approvals E2E', () => {
  let app: INestApplication;
  let authToken: string;
  const tenantId = 'test-tenant-id';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Login to get token (mock)
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /approvals', () => {
    it('should create approval request and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          documentType: 'purchase_order',
          documentId: 'doc-123',
          documentAmount: 1000000,
          approverIds: ['user-1', 'user-2'],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
    });

    it('should auto-approve small orders under threshold', async () => {
      const res = await request(app.getHttpServer())
        .post('/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          documentType: 'purchase_order',
          documentId: 'doc-small',
          documentAmount: 100000, // Under 5M VND
          approverIds: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('approved');
    });
  });

  describe('POST /approvals/:id/approve', () => {
    it('should approve pending request', async () => {
      // First create a request
      const createRes = await request(app.getHttpServer())
        .post('/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          documentType: 'purchase_order',
          documentId: 'doc-approve-test',
          documentAmount: 10000000,
          approverIds: ['user-1'],
        });

      const requestId = createRes.body.id;

      const approveRes = await request(app.getHttpServer())
        .post(`/approvals/${requestId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      expect(approveRes.status).toBe(200);
    });
  });
});