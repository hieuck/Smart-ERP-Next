import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db, tenants, users } from '@smart-erp/database';
import { sql } from '@smart-erp/database/drizzle';
import { AppModule } from '../src/app.module';

const { sign } = require('jsonwebtoken');

const TEST_JWT_SECRET = 'core-journey-e2e-secret';

describe('Smart ERP Next - Core User Journey (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  const runCode = randomUUID().slice(0, 8);
  const tenantId = randomUUID();
  const userId = randomUUID();

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    await db.insert(tenants).values({
      id: tenantId,
      name: `Core Journey ${runCode}`,
      slug: `core-journey-${runCode}`,
    });
    await db.insert(users).values({
      id: userId,
      email: `core-journey-${runCode}@smarterp.vn`,
      name: 'Core Journey Admin',
      tenantId,
      role: 'admin',
    });

    authToken = sign(
      {
        sub: userId,
        email: `core-journey-${runCode}@smarterp.vn`,
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

  function authed(requestBuilder: request.Test) {
    return requestBuilder
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', tenantId);
  }

  it('rejects protected core APIs without a JWT', async () => {
    const res = await request(app.getHttpServer()).get('/approvals/pending');

    expect(res.status).toBe(401);
  });

  it('returns product forecast data for an authenticated user', async () => {
    const productId = randomUUID();
    await db.execute(sql`
      INSERT INTO products (id, name, tenant_id, sku, price, created_at, updated_at)
      VALUES (${productId}, 'Core Journey Product', ${tenantId}, 'CJ-SKU', 100000, NOW(), NOW())
    `);

    const res = await authed(
      request(app.getHttpServer()).get(`/forecast/product/${productId}`),
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ productId });
    expect(Array.isArray(res.body.data.predictions)).toBe(true);
  });

  it('returns inventory reorder recommendation for an authenticated user', async () => {
    const productId = randomUUID();
    const warehouseId = randomUUID();
    await db.execute(sql`
      INSERT INTO products (id, name, tenant_id, sku, price, created_at, updated_at)
      VALUES (${productId}, 'Core Journey Inv Product', ${tenantId}, 'CJI-SKU', 100000, NOW(), NOW())
    `);
    await db.execute(sql`
      INSERT INTO warehouses (id, name, tenant_id, created_at, updated_at)
      VALUES (${warehouseId}, 'Core Journey WH', ${tenantId}, NOW(), NOW())
    `);
    await db.execute(sql`
      INSERT INTO inventory (id, product_id, warehouse_id, quantity, tenant_id, created_at, updated_at)
      VALUES (${randomUUID()}, ${productId}, ${warehouseId}, 50, ${tenantId}, NOW(), NOW())
    `);

    const res = await authed(
      request(app.getHttpServer()).get(`/inventory-recommendation/suggest?productId=${productId}&stock=50`),
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ productId });
    expect(res.body).toHaveProperty('suggestedReorder');
  });

  it('submits and approves a purchase approval request', async () => {
    const createRes = await authed(
      request(app.getHttpServer())
        .post('/approvals/requests')
        .send({
          documentType: 'purchase_order',
          documentId: randomUUID(),
          documentAmount: 15000000,
          approverIds: [userId],
        }),
    );

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ status: 'pending' });
    expect(createRes.body.id).toEqual(expect.any(String));

    const pendingRes = await authed(
      request(app.getHttpServer()).get('/approvals/pending'),
    );

    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: createRes.body.id, status: 'pending' }),
      ]),
    );

    const approveRes = await authed(
      request(app.getHttpServer())
        .post(`/approvals/requests/${createRes.body.id}/approve`)
        .send({ comments: 'Approved by core E2E' }),
    );

    expect(approveRes.status).toBe(201);
  });

  it('creates a CRM lead for the authenticated tenant', async () => {
    const res = await authed(
      request(app.getHttpServer())
        .post('/crm/leads')
        .send({
          firstName: 'Khach hang',
          lastName: `B2B ${runCode}`,
          company: 'Smart ERP E2E',
          source: 'website',
          status: 'new',
          phone: '0909123456',
          leadScore: 80,
        }),
    );

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      tenantId,
      firstName: 'Khach hang',
      lastName: `B2B ${runCode}`,
      company: 'Smart ERP E2E',
      source: 'website',
      status: 'new',
    });
    expect(Number(res.body.leadScore)).toBe(80);
  });

  it('creates and issues a draft e-invoice', async () => {
    const createRes = await authed(
      request(app.getHttpServer())
        .post('/e-invoice')
        .send({
          invoiceSeries: `EI${runCode}`,
          buyerName: 'Cong ty Co phan Test E2E',
          buyerTaxCode: '0101234567',
          buyerAddress: 'Quan 1, TP. HCM',
          buyerEmail: 'ketoan@test.vn',
          provider: 'vnpt',
          lineItems: [
            {
              itemName: 'Smart ERP annual license',
              quantity: 1,
              unitPrice: 10000000,
              vatRate: 10,
            },
          ],
        }),
    );

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      tenantId,
      buyerName: 'Cong ty Co phan Test E2E',
      status: 'draft',
    });

    const issueRes = await authed(
      request(app.getHttpServer()).patch(`/e-invoice/${createRes.body.id}/issue`),
    );

    expect(issueRes.status).toBe(200);
    expect(issueRes.body).toMatchObject({ id: createRes.body.id, status: 'issued' });
  });

});
