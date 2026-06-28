import { test, expect } from '@playwright/test';

const API = 'http://localhost:3456';
let token = '';

function h() { return { Authorization: `Bearer ${token}` }; }
function u(d: any): any { return d && d.success === true ? d.data : d; }

test.describe('Onboarding Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: { email: 'admin@demo.vn', password: 'admin123' } });
    const body = await res.json();
    token = body.access_token || body.data?.access_token || '';
  });

  test('GET /onboarding/status returns current state', async ({ request }) => {
    const res = await request.get(`${API}/onboarding/status`, { headers: h() });
    expect(res.ok()).toBeTruthy();
    const body = u(await res.json());
    expect(body).toHaveProperty('status');
  });

  test('POST /onboarding/company saves company info', async ({ request }) => {
    const res = await request.post(`${API}/onboarding/company`, {
      headers: h(),
      data: { name: 'E2E Test Company', industry: 'retail', address: '123 Test St' },
    });
    expect(res.ok()).toBeTruthy();
    const body = u(await res.json());
    expect(body.companyInfo.name).toBe('E2E Test Company');
  });

  test('POST /onboarding/complete marks onboarding done', async ({ request }) => {
    const res = await request.post(`${API}/onboarding/complete`, { headers: h() });
    expect(res.ok()).toBeTruthy();
    const body = u(await res.json());
    expect(body.status).toBe('complete');
  });
});
