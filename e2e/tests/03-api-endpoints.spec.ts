import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════
// Comprehensive API Endpoint Tests — implemented NestJS routes
// ═══════════════════════════════════════════════════════════════════

const API = 'http://localhost:3456';
let token: string;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@demo.vn', password: 'admin123' },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  token = body.access_token || body.data?.access_token;
  expect(token).toBeTruthy();
});

function auth() {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// --- Health ---
test.describe('API: Health', () => {
  test('GET /health', async ({ request }) => {
    const r = await request.get(`${API}/health`);
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /health/ready', async ({ request }) => {
    const r = await request.get(`${API}/health/ready`);
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /health/live', async ({ request }) => {
    const r = await request.get(`${API}/health/live`);
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Auth ---
test.describe('API: Auth', () => {
  test('POST /auth/login success', async ({ request }) => {
    const r = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@demo.vn', password: 'admin123' },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b.access_token || b.data?.access_token).toBeTruthy();
    expect(b.user).toBeTruthy();
  });
  test('POST /auth/login wrong password', async ({ request }) => {
    const r = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@demo.vn', password: 'wrongpass' },
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });
  test('GET /auth/profile', async ({ request }) => {
    const r = await request.get(`${API}/auth/profile`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /auth/profile without token → 401', async ({ request }) => {
    const r = await request.get(`${API}/auth/profile`);
    expect(r.status()).toBe(401);
  });
});

// --- Users ---
test.describe('API: Users', () => {
  test('GET /users', async ({ request }) => {
    const r = await request.get(`${API}/users`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /users/me', async ({ request }) => {
    const r = await request.get(`${API}/users/me`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /users/stats', async ({ request }) => {
    const r = await request.get(`${API}/users/stats`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Tenants ---
test.describe('API: Tenants', () => {
  test('GET /tenants', async ({ request }) => {
    const r = await request.get(`${API}/tenants`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Products ---
test.describe('API: Products', () => {
  test('GET /products', async ({ request }) => {
    const r = await request.get(`${API}/products`, auth());
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b.items || b.data).toBeTruthy();
  });
  test('GET /products/categories', async ({ request }) => {
    const r = await request.get(`${API}/products/categories`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /products/export', async ({ request }) => {
    const r = await request.get(`${API}/products/export`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Customers ---
test.describe('API: Customers', () => {
  test('GET /customers', async ({ request }) => {
    const r = await request.get(`${API}/customers`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- Orders ---
test.describe('API: Orders', () => {
  test('GET /orders', async ({ request }) => {
    const r = await request.get(`${API}/orders`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- Suppliers ---
test.describe('API: Suppliers', () => {
  test('GET /suppliers', async ({ request }) => {
    const r = await request.get(`${API}/suppliers`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Supplier Portal ---
test.describe('API: Supplier Portal', () => {
  test('GET /supplier-portal/orders', async ({ request }) => {
    const r = await request.get(`${API}/supplier-portal/orders`, auth());
    expect(r.ok()).toBeTruthy();
  });
  test('GET /supplier-portal/performance', async ({ request }) => {
    const r = await request.get(`${API}/supplier-portal/performance`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- Inventory ---
test.describe('API: Inventory', () => {
  test('GET /inventory/transactions', async ({ request }) => {
    const r = await request.get(`${API}/inventory/transactions`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /inventory/low-stock', async ({ request }) => {
    const r = await request.get(`${API}/inventory/low-stock`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /inventory/summary', async ({ request }) => {
    const r = await request.get(`${API}/inventory/summary`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /inventory/reorder-suggestions', async ({ request }) => {
    const r = await request.get(`${API}/inventory/reorder-suggestions`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /inventory/lots', async ({ request }) => {
    const r = await request.get(`${API}/inventory/lots`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /inventory/lots/expiring-soon', async ({ request }) => {
    const r = await request.get(`${API}/inventory/lots/expiring-soon`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /inventory/transfers', async ({ request }) => {
    const r = await request.get(`${API}/inventory/transfers`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Payments ---
test.describe('API: Payments', () => {
  test('GET /payments', async ({ request }) => {
    const r = await request.get(`${API}/payments`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /payments/summary', async ({ request }) => {
    const r = await request.get(`${API}/payments/summary`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Purchasing ---
test.describe('API: Purchasing', () => {
  test('GET /purchasing', async ({ request }) => {
    const r = await request.get(`${API}/purchasing`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Warehouses ---
test.describe('API: Warehouses', () => {
  test('GET /warehouses', async ({ request }) => {
    const r = await request.get(`${API}/warehouses`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /warehouses/default', async ({ request }) => {
    const r = await request.get(`${API}/warehouses/default`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /warehouse-transfers', async ({ request }) => {
    const r = await request.get(`${API}/warehouse-transfers`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Currencies ---
test.describe('API: Currencies', () => {
  test('GET /currencies', async ({ request }) => {
    const r = await request.get(`${API}/currencies`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /currencies/base', async ({ request }) => {
    const r = await request.get(`${API}/currencies/base`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /currencies/supported', async ({ request }) => {
    const r = await request.get(`${API}/currencies/supported`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /currencies/rates', async ({ request }) => {
    const r = await request.get(`${API}/currencies/rates`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Approvals ---
test.describe('API: Approvals', () => {
  test('GET /approvals/rules', async ({ request }) => {
    const r = await request.get(`${API}/approvals/rules`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /approvals/pending', async ({ request }) => {
    const r = await request.get(`${API}/approvals/pending`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Accounting ---
test.describe('API: Accounting', () => {
  test('GET /accounting/dashboard', async ({ request }) => {
    const r = await request.get(`${API}/accounting/dashboard`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /accounting/reports', async ({ request }) => {
    const r = await request.get(`${API}/accounting/reports`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /accounting/accounts', async ({ request }) => {
    const r = await request.get(`${API}/accounting/accounts`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /accounting/accounts/tree', async ({ request }) => {
    const r = await request.get(`${API}/accounting/accounts/tree`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /accounting/entries', async ({ request }) => {
    const r = await request.get(`${API}/accounting/entries`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /accounting/entries/trial-balance', async ({ request }) => {
    const r = await request.get(`${API}/accounting/entries/trial-balance`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- HR ---
test.describe('API: HR', () => {
  test('GET /hr/employees', async ({ request }) => {
    const r = await request.get(`${API}/hr/employees`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /hr/payroll', async ({ request }) => {
    const r = await request.get(`${API}/hr/payroll`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /hr/attendance/shifts', async ({ request }) => {
    const r = await request.get(`${API}/hr/attendance/shifts`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /hr/attendance/today', async ({ request }) => {
    const r = await request.get(`${API}/hr/attendance/today`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /hr/attendance/records', async ({ request }) => {
    const r = await request.get(`${API}/hr/attendance/records`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /hr/attendance/leave', async ({ request }) => {
    const r = await request.get(`${API}/hr/attendance/leave`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /hr/payroll/boards', async ({ request }) => {
    const r = await request.get(`${API}/hr/payroll/boards`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /hr/performance/my-kpis', async ({ request }) => {
    const r = await request.get(`${API}/hr/performance/my-kpis`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Fixed Assets ---
test.describe('API: Fixed Assets', () => {
  test('GET /fixed-assets', async ({ request }) => {
    const r = await request.get(`${API}/fixed-assets`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Projects ---
test.describe('API: Projects', () => {
  test('GET /projects', async ({ request }) => {
    const r = await request.get(`${API}/projects`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- CRM ---
test.describe('API: CRM', () => {
  test('GET /crm/leads', async ({ request }) => {
    const r = await request.get(`${API}/crm/leads`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /crm/leads/stats', async ({ request }) => {
    const r = await request.get(`${API}/crm/leads/stats`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /crm/pipelines', async ({ request }) => {
    const r = await request.get(`${API}/crm/pipelines`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Reports & Insights ---
test.describe('API: Reports', () => {
  test('GET /reports/revenue', async ({ request }) => {
    const r = await request.get(`${API}/reports/revenue`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /reports/profit', async ({ request }) => {
    const r = await request.get(`${API}/reports/profit`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /reports/top-products', async ({ request }) => {
    const r = await request.get(`${API}/reports/top-products`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /reports/inventory', async ({ request }) => {
    const r = await request.get(`${API}/reports/inventory`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /reports/customers', async ({ request }) => {
    const r = await request.get(`${API}/reports/customers`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /reports/summary', async ({ request }) => {
    const r = await request.get(`${API}/reports/summary`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /insights/dashboard', async ({ request }) => {
    const r = await request.get(`${API}/insights/dashboard`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Analytics Dashboard ---
test.describe('API: Analytics Dashboard', () => {
  test('GET /analytics-dashboard/kpis', async ({ request }) => {
    const r = await request.get(`${API}/analytics-dashboard/kpis`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /analytics-dashboard/revenue-chart', async ({ request }) => {
    const r = await request.get(`${API}/analytics-dashboard/revenue-chart`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /analytics-dashboard/top-products', async ({ request }) => {
    const r = await request.get(`${API}/analytics-dashboard/top-products`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /analytics-dashboard/ai-insights', async ({ request }) => {
    const r = await request.get(`${API}/analytics-dashboard/ai-insights`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Manufacturing ---
test.describe('API: Manufacturing', () => {
  test('GET /manufacturing/orders', async ({ request }) => {
    const r = await request.get(`${API}/manufacturing/orders`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- QMS ---
test.describe('API: QMS', () => {
  test('GET /qms/plans', async ({ request }) => {
    const r = await request.get(`${API}/qms/plans`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /qms/inspections', async ({ request }) => {
    const r = await request.get(`${API}/qms/inspections`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /qms/ncrs', async ({ request }) => {
    const r = await request.get(`${API}/qms/ncrs`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /qms/capas', async ({ request }) => {
    const r = await request.get(`${API}/qms/capas`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /qms/defect-codes', async ({ request }) => {
    const r = await request.get(`${API}/qms/defect-codes`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /qms/report', async ({ request }) => {
    const r = await request.get(`${API}/qms/report`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /qms/suppliers/quality-report', async ({ request }) => {
    const r = await request.get(`${API}/qms/suppliers/quality-report`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});


// --- Ecommerce ---
test.describe('API: Ecommerce', () => {
  test('GET /ecommerce/stores', async ({ request }) => {
    const r = await request.get(`${API}/ecommerce/stores`, auth());
    expect(r.ok()).toBeTruthy();
  });
  test('GET /ecommerce/logs', async ({ request }) => {
    const r = await request.get(`${API}/ecommerce/logs`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- Activity ---
test.describe('API: Activity', () => {
  test('GET /activity', async ({ request }) => {
    const r = await request.get(`${API}/activity`, auth());
    expect(r.ok()).toBeTruthy();
  });
  test('GET /activity/recent', async ({ request }) => {
    const r = await request.get(`${API}/activity/recent`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- Automation ---
test.describe('API: Automation', () => {
  test('GET /automation/triggers', async ({ request }) => {
    const r = await request.get(`${API}/automation/triggers`, auth());
    expect(r.ok()).toBeTruthy();
  });
  test('GET /automation/actions', async ({ request }) => {
    const r = await request.get(`${API}/automation/actions`, auth());
    expect(r.ok()).toBeTruthy();
  });
  test('GET /automation', async ({ request }) => {
    const r = await request.get(`${API}/automation`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- Search ---
test.describe('API: Search', () => {
  test('GET /search?q=test', async ({ request }) => {
    const r = await request.get(`${API}/search?q=test`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /search/autocomplete?q=a', async ({ request }) => {
    const r = await request.get(`${API}/search/autocomplete?q=a`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Sync ---
test.describe('API: Sync', () => {
  test('GET /sync/metadata', async ({ request }) => {
    const r = await request.get(`${API}/sync/metadata`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- Exports ---
test.describe('API: Exports', () => {
  test('GET /exports/entities', async ({ request }) => {
    const r = await request.get(`${API}/exports/entities`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- Webhooks ---
test.describe('API: Webhooks', () => {
  test('GET /webhooks', async ({ request }) => {
    const r = await request.get(`${API}/webhooks`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Inventory Recommendation ---
test.describe('API: Inventory Recommendation', () => {
  test('GET /inventory-recommendation/suggest', async ({ request }) => {
    const r = await request.get(`${API}/inventory-recommendation/suggest`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- AI Copilot ---
test.describe('API: AI Copilot', () => {
  test('GET /ai-copilot/insights', async ({ request }) => {
    const r = await request.get(`${API}/ai-copilot/insights`, auth());
    expect(r.ok()).toBeTruthy();
  });
});

// --- Portal ---
test.describe('API: Customer Portal', () => {
  test('GET /portal/orders', async ({ request }) => {
    const r = await request.get(`${API}/portal/orders`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /portal/tickets', async ({ request }) => {
    const r = await request.get(`${API}/portal/tickets`, auth());
    expect(r.status()).toBeLessThan(500);
  });
  test('GET /portal/invoices', async ({ request }) => {
    const r = await request.get(`${API}/portal/invoices`, auth());
    expect(r.status()).toBeLessThan(500);
  });
});

// --- Root ---
test.describe('API: Root', () => {
  test('GET /', async ({ request }) => {
    const r = await request.get(`${API}/`);
    expect(r.status()).toBeLessThan(500);
  });
});

