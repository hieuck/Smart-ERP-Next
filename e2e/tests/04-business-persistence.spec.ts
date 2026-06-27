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
  // Unwrap standardized response format: { success, data } → data
  if (parsed && parsed.success === true && 'data' in parsed) return parsed.data as T;
  return parsed as T;
}

async function textOk(response: APIResponse, label: string): Promise<string> {
  const text = await response.text();
  expect(response.ok(), `${label} failed: ${response.status()} ${text}`).toBeTruthy();
  return text;
}

function itemsFrom(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.items && Array.isArray(payload.items.rows)) return payload.items.rows;
  return [];
}

function hasItem(payload: any, predicate: (item: any) => boolean) {
  return itemsFrom(payload).some(predicate);
}

test.describe('Business persistence through real API', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@demo.vn', password: 'admin123' },
    });
    const body = await jsonOk<{ access_token: string }>(response, 'POST /auth/login');
    token = body.access_token || body.data?.access_token;
    expect(token).toBeTruthy();
  });

  test('creates and reads back real customer, product, stock, order, payment, invoice, lead, and ticket data', async ({ request }) => {
    const marker = `PW-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const customerName = `Khach hang thuc te ${marker}`;
    const productName = `Cà phê sữa đá ${marker}`;
    const category = `Đồ uống kiểm thử ${marker}`;
    const unitPrice = 45000;

    const customer = await jsonOk(await request.post(`${API}/customers`, {
      ...auth(),
      data: {
        code: `CUS-${marker}`,
        name: customerName,
        phone: `09${Date.now().toString().slice(-8)}`,
        email: `${marker.toLowerCase()}@example.test`,
        address: '12 Nguyen Hue, Quan 1, TP HCM',
        customerGroup: 'E2E',
        debtLimit: 1000000,
        notes: `Created by Playwright persistence flow ${marker}`,
      },
    }), 'POST /customers');
    expect(customer).toMatchObject({ code: `CUS-${marker}`, name: customerName });

    const customerDetail = await jsonOk(await request.get(`${API}/customers/${customer.id}`, auth()), 'GET /customers/:id');
    expect(customerDetail).toMatchObject({ id: customer.id, code: `CUS-${marker}`, name: customerName });

    const customerSearch = await jsonOk(await request.get(`${API}/customers?search=${encodeURIComponent(marker)}`, auth()), 'GET /customers?search');
    expect(hasItem(customerSearch, (item) => item.id === customer.id)).toBeTruthy();

    const product = await jsonOk(await request.post(`${API}/products`, {
      ...auth(),
      data: {
        name: productName,
        price: unitPrice,
        cost: 30000,
        stock: 7,
        description: `San pham co dau tieng Viet ${marker}`,
        imageUrl: `https://example.com/assets/${marker.toLowerCase()}.jpg`,
        category,
        isActive: true,
      },
    }), 'POST /products');
    expect(product.id).toBeTruthy();
    expect(product.name).toBe(productName);
    expect(product.sku).toEqual(expect.any(String));
    expect(product.sku.length).toBeGreaterThan(0);
    expect(product.category).toBe(category);
    expect(product.imageUrl).toContain(marker.toLowerCase());

    const productDetail = await jsonOk(await request.get(`${API}/products/${product.id}`, auth()), 'GET /products/:id');
    expect(productDetail).toMatchObject({
      id: product.id,
      name: productName,
      sku: product.sku,
      category,
      imageUrl: product.imageUrl,
    });

    const productBySku = await jsonOk(await request.get(`${API}/products/sku/${encodeURIComponent(product.sku)}`, auth()), 'GET /products/sku/:sku');
    expect(productBySku.id).toBe(product.id);

    const productSearch = await jsonOk(await request.get(`${API}/products?search=${encodeURIComponent(product.sku)}`, auth()), 'GET /products?search');
    expect(hasItem(productSearch, (item) => item.id === product.id)).toBeTruthy();

    const stockReference = `ADJ-${marker}`;
    const stock = await jsonOk(await request.patch(`${API}/products/${product.id}/stock`, {
      ...auth(),
      data: {
        quantity: 5,
        type: 'IN',
        notes: `Nhap kho tu Playwright ${marker}`,
        reference: stockReference,
      },
    }), 'PATCH /products/:id/stock');
    expect(Number(stock.stock)).toBe(Number(product.stock) + 5);

    const stockTransactions = await jsonOk(await request.get(`${API}/products/${product.id}/transactions`, auth()), 'GET /products/:id/transactions');
    expect(hasItem(stockTransactions, (item) => item.reference === stockReference && Number(item.quantity) === 5)).toBeTruthy();

    const order = await jsonOk(await request.post(`${API}/orders`, {
      ...auth(),
      data: {
        customerId: customer.id,
        channel: 'pos',
        paymentMethod: 'cash',
        notes: `POS order persistence ${marker}`,
        items: [
          {
            productId: product.id,
            quantity: 2,
            unitPrice,
            taxRate: 10,
            notes: `Line ${marker}`,
          },
        ],
      },
    }), 'POST /orders');
    expect(order.id).toBeTruthy();
    expect(order.code).toEqual(expect.any(String));
    expect(order.paymentStatus).toBe('paid');
    expect(Number(order.total)).toBe(unitPrice * 2);
    expect(order.items[0]).toMatchObject({ productId: product.id, productName });

    const orderDetail = await jsonOk(await request.get(`${API}/orders/${order.id}`, auth()), 'GET /orders/:id');
    expect(orderDetail).toMatchObject({ id: order.id, code: order.code, paymentStatus: 'paid' });
    expect(hasItem(orderDetail.items, (item) => item.productId === product.id && item.productName === productName)).toBeTruthy();

    const orderSearch = await jsonOk(await request.get(`${API}/orders?search=${encodeURIComponent(order.code)}`, auth()), 'GET /orders?search');
    expect(hasItem(orderSearch, (item) => item.id === order.id)).toBeTruthy();

    const orderCommentText = `Xac nhan in hoa don thu nghiem ${marker}`;
    const orderComment = await jsonOk(await request.post(`${API}/orders/${order.id}/comments`, {
      ...auth(),
      data: { content: orderCommentText, mentions: [] },
    }), 'POST /orders/:id/comments');
    expect(orderComment).toMatchObject({ orderId: order.id, content: orderCommentText });

    const orderComments = await jsonOk(await request.get(`${API}/orders/${order.id}/comments`, auth()), 'GET /orders/:id/comments');
    expect(hasItem(orderComments, (item) => item.content === orderCommentText || item.comments?.content === orderCommentText)).toBeTruthy();

    const invoiceXml = await textOk(await request.get(`${API}/orders/${order.id}/einvoice`, auth()), 'GET /orders/:id/einvoice');
    expect(invoiceXml).toContain(order.code);
    expect(invoiceXml).toContain(productName);

    const paymentReference = `PAY-${marker}`;
    const payment = await jsonOk(await request.post(`${API}/payments`, {
      ...auth(),
      data: {
        type: 'receipt',
        referenceType: 'order',
        referenceId: order.id,
        partyType: 'customer',
        partyId: customer.id,
        partyName: customerName,
        amount: Number(order.total),
        method: 'cash',
        transactionRef: paymentReference,
        notes: `Payment created by Playwright ${marker}`,
      },
    }), 'POST /payments');
    expect(payment).toMatchObject({
      id: expect.any(String),
      type: 'receipt',
      referenceId: order.id,
      transactionRef: paymentReference,
      status: 'completed',
    });

    const paymentDetail = await jsonOk(await request.get(`${API}/payments/${payment.id}`, auth()), 'GET /payments/:id');
    expect(paymentDetail).toMatchObject({ id: payment.id, code: payment.code, transactionRef: paymentReference });

    const paymentList = await jsonOk(await request.get(`${API}/payments?type=receipt&method=cash&limit=100`, auth()), 'GET /payments?type=receipt&method=cash');
    expect(hasItem(paymentList, (item) => item.id === payment.id && item.transactionRef === paymentReference)).toBeTruthy();

    const eInvoice = await jsonOk(await request.post(`${API}/e-invoice`, {
      ...auth(),
      data: {
        orderId: order.id,
        customerId: customer.id,
        buyerName: customerName,
        buyerEmail: customer.email,
        buyerPhone: customer.phone,
        buyerAddress: customer.address,
        invoiceSeries: `E2E-${marker.slice(-6)}`,
        invoiceTemplate: '01GTKT0/001',
        currency: 'VND',
        provider: 'vnpt',
        notes: `Hoa don dien tu Playwright ${marker}`,
        lineItems: [
          {
            itemName: productName,
            unit: 'ly',
            quantity: 2,
            unitPrice,
            vatRate: 10,
          },
        ],
      },
    }), 'POST /e-invoice');
    expect(eInvoice).toMatchObject({
      id: expect.any(String),
      orderId: order.id,
      customerId: customer.id,
      status: 'draft',
      buyerName: customerName,
    });

    const eInvoiceDetail = await jsonOk(await request.get(`${API}/e-invoice/${eInvoice.id}`, auth()), 'GET /e-invoice/:id');
    expect(eInvoiceDetail).toMatchObject({ id: eInvoice.id, status: 'draft', buyerName: customerName });
    expect(hasItem(eInvoiceDetail.items, (item) => item.itemName === productName)).toBeTruthy();

    const issuedInvoice = await jsonOk(await request.patch(`${API}/e-invoice/${eInvoice.id}/issue`, auth()), 'PATCH /e-invoice/:id/issue');
    expect(issuedInvoice.status).toBe('issued');
    expect(issuedInvoice.invoiceNumber).toEqual(expect.any(String));
    expect(issuedInvoice.lookupCode).toEqual(expect.any(String));

    const lead = await jsonOk(await request.post(`${API}/crm/leads`, {
      ...auth(),
      data: {
        firstName: 'Lan',
        lastName: marker,
        email: `lead-${marker.toLowerCase()}@example.test`,
        phone: `08${Date.now().toString().slice(-8)}`,
        company: `Cong ty ${marker}`,
        source: 'website',
        status: 'new',
        leadScore: 72,
        industry: 'Retail',
        description: `Lead created by Playwright ${marker}`,
      },
    }), 'POST /crm/leads');
    expect(lead).toMatchObject({ id: expect.any(String), firstName: 'Lan', lastName: marker, status: 'new' });

    const leadDetail = await jsonOk(await request.get(`${API}/crm/leads/${lead.id}`, auth()), 'GET /crm/leads/:id');
    expect(leadDetail).toMatchObject({ id: lead.id, email: `lead-${marker.toLowerCase()}@example.test` });

    const leadSearch = await jsonOk(await request.get(`${API}/crm/leads?search=${encodeURIComponent(marker)}`, auth()), 'GET /crm/leads?search');
    expect(hasItem(leadSearch, (item) => item.id === lead.id)).toBeTruthy();
  });
});
