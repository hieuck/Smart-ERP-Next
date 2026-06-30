import { HttpStatus } from '@nestjs/common';

const BASE_URL = process.env.API_URL || 'http://localhost:3456';

describe('API Contracts — Health', () => {
  it('GET /health returns 200 with ok status', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(HttpStatus.OK);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'ok' });
  });

  it('GET /status returns 200 with version and uptime', async () => {
    const res = await fetch(`${BASE_URL}/status`);
    expect(res.status).toBe(HttpStatus.OK);
    const body = await res.json();
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('uptime');
  });
});

describe('API Contracts — Auth', () => {
  it('POST /auth/login with bad credentials returns 401', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'none@test.com', password: 'wrong' }),
    });
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });
});

describe('API Contracts — Products', () => {
  it('GET /products without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/products`);
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });
});

describe('API Contracts — Orders', () => {
  it('GET /orders without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/orders`);
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('GET /orders/:id with invalid UUID returns 400', async () => {
    const res = await fetch(`${BASE_URL}/orders/not-a-uuid`, {
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
  });
});

describe('API Contracts — Response format', () => {
  it('returns consistent error envelope on 404', async () => {
    const res = await fetch(`${BASE_URL}/api/nonexistent-route`);
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    const body = await res.json();
    expect(body).toMatchObject({
      success: false,
      data: null,
    });
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('requestId');
  });
});
