/**
 * Shared Drizzle ORM mock helper.
 * Usage:
 *   import { createMockDb, resetMockDb } from '../__tests__/db.mock';
 *   const mockDb = createMockDb();
 *   jest.mock('@smart-erp/database', () => ({ db: mockDb, ...mockSchema }));
 *
 * Then in each test:
 *   mockDb._resolveWith([{ id: '1', ... }]);
 *   const result = await service.findAll('t1');
 */

// Empty schema table references (Drizzle just passes these as symbols; mocks don't need real column defs)
export const mockSchema = {
  users: {},
  tenants: {},
  orders: {},
  orderItems: {},
  products: {},
  inventoryItems: {},
  inventoryTransactions: {},
  inventoryReservations: {},
  ecommerceStores: {},
  customers: {},
  suppliers: {},
  approvalRules: {},
  approvalRequests: {},
  approvalChainItems: {},
  billingPlans: {},
  billingSubscriptions: {},
  billingInvoices: {},
  chats: {},
  chatMessages: {},
  comments: {},
  notifications: {},
  activities: {},
  activityLogs: {},
  warehouses: {},
  warehouseTransfers: {},
  warehouseTransferItems: {},
  // WMS
  wmsPickingOrders: {},
  wmsTasks: {},
  // HR
  employees: {},
  // Finance
  accounts: {},
  journalEntries: {},
  journalLines: {},
  // Accounting
  accountingEntries: {},
  // Projects
  projects: {},
  projectTasks: {},
  // Reports
  reports: {},
  // Webhooks
  webhooks: {},
  webhookDeliveries: {},
  // Forecasts
  forecasts: {},
};

/** Build a Drizzle chain mock with a shared resolved-value slot. */
export function createMockDb() {
  let _value: any = [];
  let _queue: any[] = [];

  const chain: any = {
    // Chainable query methods — all return `chain` (this)
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockImplementation(function (this: any, arg: any) {
      if (typeof arg === 'function') {
        try {
          arg({});
        } catch (e) {}
      }
      return this;
    }),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),

    // Terminal methods — return Promises
    returning: jest.fn().mockImplementation(() => {
      const val = _queue.length > 0 ? _queue.shift() : _value;
      return Promise.resolve(val);
    }),
    execute: jest.fn().mockImplementation(() => {
      const val = _queue.length > 0 ? _queue.shift() : _value;
      const res: any = Array.isArray(val) ? [...val] : [];
      res.rows = res;
      return Promise.resolve(res);
    }),

    // Make the chain itself awaitable (thenable interface)
    then: jest.fn().mockImplementation(
      (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) => {
        const val = _queue.length > 0 ? _queue.shift() : _value;
        return Promise.resolve(val).then(onFulfilled, onRejected);
      }
    ),
    catch: jest.fn().mockImplementation((onRejected: (e: any) => any) => {
      const val = _queue.length > 0 ? _queue.shift() : _value;
      return Promise.resolve(val).catch(onRejected);
    }),
    finally: jest.fn().mockImplementation((onFinally: () => void) => {
      const val = _queue.length > 0 ? _queue.shift() : _value;
      return Promise.resolve(val).finally(onFinally);
    }),

    /** Set what `await db.select()...` or `returning()` resolves to */
    _resolveWith(value: any) {
      _value = value;
      _queue = [];
    },
    /** Queue multiple values to be resolved in sequence */
    _queueSequence(values: any[]) {
      _queue = [...values];
    },
    /** Reset resolved value to empty array */
    _reset() {
      _value = [];
      _queue = [];
      Object.keys(chain).forEach((k) => {
        if (typeof chain[k]?.mockClear === 'function') chain[k].mockClear();
      });
    },
  };

  return chain;
}

/** Convenience: create a fully-mocked DrizzleService */
export function createMockDrizzleService(mockDb: ReturnType<typeof createMockDb>) {
  return { db: mockDb };
}
