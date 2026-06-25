import { test, expect, type APIResponse } from '@playwright/test';

const API = 'http://localhost:3456';
let token: string;

function auth() {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function jsonOk<T = any>(response: APIResponse, label: string): Promise<T> {
  const text = await response.text();
  expect(response.ok(), `${label} failed: ${response.status()} ${text}`).toBeTruthy();
  return text ? JSON.parse(text) as T : ({} as T);
}

test.describe('HR workflows', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@smarterp.vn', password: 'admin123' },
    });
    const body = await jsonOk<{ access_token: string }>(response, 'POST /auth/login');
    token = body.access_token;
    expect(token).toBeTruthy();
  });

  test('creates employee, checks attendance, submits leave, and processes payroll', async ({ request }) => {
    const marker = `HR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

    // 1. Create employee
    const employee = await jsonOk(await request.post(`${API}/hr/employees`, {
      ...auth(),
      data: {
        name: `Nguyen Van ${marker}`,
        email: `${marker.toLowerCase()}@company.test`,
        phone: `09${Date.now().toString().slice(-8)}`,
        position: 'Nhan vien ban hang',
        department: 'Kinh doanh',
        salary: 10000000,
        joinDate: '2026-01-15',
      },
    }), 'POST /hr/employees');
    expect(employee).toBeDefined();
    expect(employee.id).toBeDefined();

    // 2. List employees
    const employees = await jsonOk(await request.get(`${API}/hr/employees`, auth()), 'GET /hr/employees');
    expect(employees).toBeDefined();

    // 3. Get employee by ID
    const found = await jsonOk(await request.get(`${API}/hr/employees/${employee.id}`, auth()), `GET /hr/employees/${employee.id}`);
    expect(found.id).toBe(employee.id);
    expect(found.name).toContain(marker);

    // 4. List attendance shifts
    const shifts = await jsonOk(await request.get(`${API}/hr/attendance/shifts`, auth()), 'GET /hr/attendance/shifts');
    expect(shifts).toBeDefined();

    // 5. List attendance records
    const records = await jsonOk(await request.get(`${API}/hr/attendance/records`, auth()), 'GET /hr/attendance/records');
    expect(records).toBeDefined();

    // 6. Create leave request
    const leave = await jsonOk(await request.post(`${API}/hr/attendance/leave`, {
      ...auth(),
      data: {
        leaveType: 'annual',
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        totalDays: 2,
        reason: `Nghi phep thu ${marker}`,
      },
    }), 'POST /hr/attendance/leave');
    expect(leave).toBeDefined();

    // 7. List leave requests
    const leaves = await jsonOk(await request.get(`${API}/hr/attendance/leave`, auth()), 'GET /hr/attendance/leave');
    expect(leaves).toBeDefined();

    // 8. List salary boards
    const boards = await jsonOk(await request.get(`${API}/hr/payroll/boards`, auth()), 'GET /hr/payroll/boards');
    expect(boards).toBeDefined();

    // 9. Get monthly attendance summary
    const now = new Date();
    const summary = await jsonOk(await request.get(
      `${API}/hr/attendance/summary/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
      auth(),
    ), 'GET /hr/attendance/summary/monthly');
    expect(summary).toBeDefined();
  });
});
