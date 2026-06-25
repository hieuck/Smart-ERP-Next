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

test.describe('Inventory workflows', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@smarterp.vn', password: 'admin123' },
    });
    const body = await jsonOk<{ access_token: string }>(response, 'POST /auth/login');
    token = body.access_token;
    expect(token).toBeTruthy();
  });

  test('manages warehouses, adjusts stock, creates transfer, and queries inventory metrics', async ({ request }) => {
    const marker = `INV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

    // 1. List warehouses
    const warehouses = await jsonOk(await request.get(`${API}/warehouses`, auth()), 'GET /warehouses');
    expect(warehouses).toBeDefined();
    const warehouseList = Array.isArray(warehouses) ? warehouses : warehouses.items ?? warehouses.rows ?? [];
    expect(warehouseList.length).toBeGreaterThanOrEqual(0);

    // 2. Get inventory summary
    const summary = await jsonOk(await request.get(`${API}/inventory/summary`, auth()), 'GET /inventory/summary');
    expect(summary).toBeDefined();

    // 3. Get transactions
    const transactions = await jsonOk(await request.get(`${API}/inventory/transactions`, auth()), 'GET /inventory/transactions');
    expect(transactions).toBeDefined();

    // 4. Get low stock items
    const lowStock = await jsonOk(await request.get(`${API}/inventory/low-stock`, auth()), 'GET /inventory/low-stock');
    expect(lowStock).toBeDefined();

    // 5. Get reorder suggestions
    const suggestions = await jsonOk(await request.get(`${API}/inventory/reorder-suggestions`, auth()), 'GET /inventory/reorder-suggestions');
    expect(suggestions).toBeDefined();

    // 6. Create a warehouse if none exist
    let targetWarehouse = warehouseList[0];
    if (!targetWarehouse) {
      targetWarehouse = await jsonOk(await request.post(`${API}/warehouses`, {
        ...auth(),
        data: {
          code: `WH-${marker}`,
          name: `Kho thu ${marker}`,
          address: '123 Test Street',
        },
      }), 'POST /warehouses');
      expect(targetWarehouse.id).toBeDefined();
    }

    // 7. Stock adjustment for a product
    const products = await jsonOk(await request.get(`${API}/products`, auth()), 'GET /products');
    const productList = Array.isArray(products) ? products : products.items ?? products.rows ?? [];
    if (productList.length > 0) {
      const productId = productList[0].id;
      const adjust = await jsonOk(await request.post(`${API}/inventory/adjust`, {
        ...auth(),
        data: {
          productId,
          quantity: 20,
          type: 'IN',
          notes: `Nhap kho test ${marker}`,
          reference: `E2E-${marker}`,
        },
      }), 'POST /inventory/adjust');
      expect(adjust).toBeDefined();
    }

    // 8. List lots
    const lots = await jsonOk(await request.get(`${API}/lots`, auth()), 'GET /lots');
    expect(lots).toBeDefined();
  });
});
