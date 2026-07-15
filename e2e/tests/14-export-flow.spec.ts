import { test, expect } from '@playwright/test';

const API = 'http://localhost:3456';
let token = '';

function h() { return { Authorization: `Bearer ${token}` }; }

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
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const keys = body.map((e: any) => e.key);
    expect(keys).toContain('products');
    expect(keys).toContain('customers');
    expect(keys).toContain('orders');
  });

  test('POST /exports creates an async CSV job and downloads the file', async ({ request }) => {
    const res = await request.post(`${API}/exports`, {
      headers: h(),
      data: { format: 'csv', entities: ['products'] },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status', 'pending');
    expect(body).toHaveProperty('format', 'csv');

    const download = await request.get(`${API}/exports/${body.id}/download?format=csv`, { headers: h() });
    expect(download.ok()).toBeTruthy();
    expect(download.headers()['content-type']).toContain('text/csv');
    const text = await download.text();
    expect(text.length).toBeGreaterThan(0);
  });

  test('POST /exports creates an async JSON job and downloads valid JSON', async ({ request }) => {
    const res = await request.post(`${API}/exports`, {
      headers: h(),
      data: { format: 'json', entities: ['products'] },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status', 'pending');
    expect(body).toHaveProperty('format', 'json');

    const download = await request.get(`${API}/exports/${body.id}/download?format=json`, { headers: h() });
    expect(download.ok()).toBeTruthy();
    expect(download.headers()['content-type']).toContain('application/json');
    const text = await download.text();
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty('products');
  });
});
