import { test, expect } from '@playwright/test';

const API = 'http://localhost:3456';
let token = '';

function h() { return { Authorization: `Bearer ${token}` }; }
function u(d: any): any { return d && d.success === true ? d.data : d; }

test.describe('Export Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: { email: 'admin@demo.vn', password: 'admin123' } });
    const body = await res.json();
    token = body.access_token || body.data?.access_token || '';
  });

  test('GET /exports/entities returns exportable modules', async ({ request }) => {
    const res = await request.get(`${API}/exports/entities`, { headers: h() });
    expect(res.ok()).toBeTruthy();
    const body = u(await res.json());
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const keys = body.map((e: any) => e.key);
    expect(keys).toContain('products');
    expect(keys).toContain('customers');
    expect(keys).toContain('orders');
  });

  test('POST /exports with CSV format returns data', async ({ request }) => {
    const res = await request.post(`${API}/exports`, {
      headers: h(),
      data: { format: 'csv', entities: ['products'] },
    });
    expect(res.ok()).toBeTruthy();
    const body = u(await res.json());
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('format', 'csv');
  });

  test('POST /exports with JSON format returns valid JSON', async ({ request }) => {
    const res = await request.post(`${API}/exports`, {
      headers: h(),
      data: { format: 'json', entities: ['products'] },
    });
    expect(res.ok()).toBeTruthy();
    const body = u(await res.json());
    expect(body).toHaveProperty('format', 'json');
    const parsed = JSON.parse(body.data);
    expect(parsed).toHaveProperty('products');
  });
});
