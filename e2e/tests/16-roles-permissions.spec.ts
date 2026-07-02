import { test, expect } from '@playwright/test';

const API = 'http://localhost:3456';
let token = '';
let testRoleId = '';

function h() { return { Authorization: `Bearer ${token}` }; }
function u(d: any): any { return d && d.success === true ? d.data : d; }

test.describe('Roles & Permissions', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: { email: 'admin@demo.vn', password: 'admin123' } });
    const body = await res.json();
    token = body.access_token || body.data?.access_token || '';
  });

  test('GET /rbac/permissions returns permission list', async ({ request }) => {
    const res = await request.get(`${API}/rbac/permissions`, { headers: h() });
    expect(res.ok()).toBeTruthy();
    const raw = await res.json();
    const body = raw.success === true ? raw.data : raw;
    const list = Array.isArray(body) ? body : body.permissions || body.items || [];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('module');
  });

  test('GET /rbac/roles returns default roles', async ({ request }) => {
    const res = await request.get(`${API}/rbac/roles`, { headers: h() });
    expect(res.ok()).toBeTruthy();
    const raw = await res.json();
    const body = raw.success === true ? raw.data : raw;
    const roles = Array.isArray(body) ? body : body.items || body.roles || [];
    expect(roles.length).toBeGreaterThanOrEqual(3);
    const names = roles.map((r: any) => r.name);
    expect(names).toContain('admin');
    expect(names).toContain('manager');
    expect(names).toContain('staff');
  });

  test('POST /rbac/roles creates custom role', async ({ request }) => {
    const marker = `E2E-${Date.now().toString(36)}`;
    const res = await request.post(`${API}/rbac/roles`, {
      headers: h(),
      data: { name: `Test Role ${marker}`, permissions: ['products:view', 'orders:view'], description: 'E2E test' },
    });
    expect(res.ok()).toBeTruthy();
    const raw = await res.json();
    const body = raw.success === true ? raw.data : raw;
    expect(body).toHaveProperty('id');
    testRoleId = body.id;
  });

  test('DELETE /rbac/roles/:id removes custom role', async ({ request }) => {
    test.skip(!testRoleId, 'Prerequisite role creation failed; delete test has no role to delete');
    const res = await request.delete(`${API}/rbac/roles/${testRoleId}`, { headers: h() });
    expect(res.ok()).toBeTruthy();
  });
});
