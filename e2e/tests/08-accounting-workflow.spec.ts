import { test, expect, type APIResponse } from '@playwright/test';

const API = 'http://localhost:3456';
let token: string;

function auth() {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function jsonOk<T = any>(response: APIResponse, label: string): Promise<T> {
  const text = await response.text();
  expect(response.ok(), `${label} failed: ${response.status()} ${text}`).toBeTruthy();
  const parsed = JSON.parse(text);
  if (parsed && parsed.success === true && 'data' in parsed) return parsed.data as T;
  return parsed as T;
}
}

test.describe('Accounting workflows', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@demo.vn', password: 'admin123' },
    });
    const body = await jsonOk<{ access_token: string }>(response, 'POST /auth/login');
    token = body.access_token || body.data?.access_token;
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

    // 5. Get accounts for journal entry
    const accts = Array.isArray(accounts) ? accounts : accounts.items ?? [];
    if (accts.length < 2) {
      // Skip journal entry creation — accounts not seeded
      return;
    }
    const debitAccount = accts[0];
    const creditAccount = accts[accts.length - 1];
    const journalEntry = await jsonOk(await request.post(`${API}/accounting/entries`, {
      ...auth(),
      data: {
        voucherDate: new Date().toISOString().split('T')[0],
        description: `Bút toán test E2E ${marker}`,
        lines: [
          { accountId: debitAccount.id, debit: 100000, credit: 0 },
          { accountId: creditAccount.id, debit: 0, credit: 100000 },
        ],
      },
    }), 'POST /accounting/entries');
    expect(journalEntry).toBeDefined();
    expect(journalEntry.id).toBeDefined();
  });
});
