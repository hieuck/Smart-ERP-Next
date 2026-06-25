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

test.describe('Accounting workflows', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@smarterp.vn', password: 'admin123' },
    });
    const body = await jsonOk<{ access_token: string }>(response, 'POST /auth/login');
    token = body.access_token;
    expect(token).toBeTruthy();
  });

  test('queries dashboard, chart of accounts, journal entries, and creates entries', async ({ request }) => {
    const marker = `ACC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

    // 1. Get accounting dashboard
    const dashboard = await jsonOk(await request.get(`${API}/accounting/dashboard`, auth()), 'GET /accounting/dashboard');
    expect(dashboard).toBeDefined();

    // 2. List chart of accounts
    const accounts = await jsonOk(await request.get(`${API}/accounting/accounts`, auth()), 'GET /accounting/accounts');
    expect(accounts).toBeDefined();

    // 3. Get accounts tree
    const tree = await jsonOk(await request.get(`${API}/accounting/accounts/tree`, auth()), 'GET /accounting/accounts/tree');
    expect(tree).toBeDefined();

    // 4. List journal entries
    const entries = await jsonOk(await request.get(`${API}/accounting/entries`, auth()), 'GET /accounting/entries');
    expect(entries).toBeDefined();

    // 5. Create a journal entry
    const journalEntry = await jsonOk(await request.post(`${API}/accounting/entries`, {
      ...auth(),
      data: {
        voucherDate: new Date().toISOString().split('T')[0],
        description: `Bút toán test E2E ${marker}`,
        lines: [
          { accountCode: '1111', debitAmount: 100000, creditAmount: 0 },
          { accountCode: '5111', debitAmount: 0, creditAmount: 100000 },
        ],
      },
    }), 'POST /accounting/entries');
    expect(journalEntry).toBeDefined();
    expect(journalEntry.id).toBeDefined();
  });
});
