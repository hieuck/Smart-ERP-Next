import { test, expect } from '@playwright/test';

const API = 'http://localhost:3456';

test.describe('API Documentation', () => {
  test('Swagger API docs are accessible in dev mode', async ({ request }) => {
    const res = await request.get(`${API}/api`);
    expect(res.status()).toBeLessThan(500);
    const text = await res.text();
    expect(text).toContain('swagger');
  });

  test('Swagger JSON spec is valid', async ({ request }) => {
    const res = await request.get(`${API}/api-json`);
    expect(res.status()).toBe(200);
    const spec = await res.json();
    expect(spec).toHaveProperty('openapi');
    expect(spec).toHaveProperty('info');
    expect(spec).toHaveProperty('paths');
    expect(typeof spec.paths).toBe('object');
  });

  test('API has documented auth endpoints', async ({ request }) => {
    const res = await request.get(`${API}/api-json`);
    const spec = await res.json();
    const paths = Object.keys(spec.paths || {});
    const hasAuth = paths.some((p: string) => p.startsWith('/auth'));
    expect(hasAuth).toBeTruthy();
  });
});
