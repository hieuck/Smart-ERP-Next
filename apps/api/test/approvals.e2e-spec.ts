import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db, tenants, users } from '@smart-erp/database';
import { AppModule } from '../src/app.module';

const { sign } = require('jsonwebtoken');

const TEST_JWT_SECRET = 'approvals-e2e-secret';

describe('Approvals E2E', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    const runCode = randomUUID().slice(0, 8);
    tenantId = randomUUID();
    userId = randomUUID();

    await db.insert(tenants).values({
      id: tenantId,
      name: `Approvals E2E ${runCode}`,
      slug: `approvals-e2e-${runCode}`,
    });
    await db.insert(users).values({
      id: userId,
      email: `approvals-e2e-${runCode}@smarterp.vn`,
      name: 'Approvals E2E Admin',
      tenantId,
      role: 'admin',
    });

    authToken = sign(
      {
        sub: userId,
        email: `approvals-e2e-${runCode}@smarterp.vn`,
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

  describe('POST /approvals/requests', () => {
    it('should create approval request and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/approvals/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          documentType: 'purchase_order',
          documentId: randomUUID(),
          documentAmount: 1000000,
          approverIds: [userId],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
    });

    it('should auto-approve small orders under threshold', async () => {
      const res = await request(app.getHttpServer())
        .post('/approvals/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          documentType: 'purchase_order',
          documentId: randomUUID(),
          documentAmount: 100000,
          approverIds: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('approved');
    });
  });

  describe('POST /approvals/requests/:id/approve', () => {
    it('should approve pending request', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/approvals/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          documentType: 'purchase_order',
          documentId: randomUUID(),
          documentAmount: 10000000,
          approverIds: [userId],
        });

      const requestId = createRes.body.id;

      const approveRes = await request(app.getHttpServer())
        .post(`/approvals/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({ comments: 'Approved by approvals E2E' });

      expect(approveRes.status).toBe(201);
    });
  });
});
