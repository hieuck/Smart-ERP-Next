jest.mock('@smart-erp/database', () => {
  const m: any = {};
  m.select = jest.fn();
  m.insert = jest.fn();
  m.update = jest.fn();
  m.delete = jest.fn();
  return { db: m };
});
jest.mock('@smart-erp/database/schema', () => ({ products: {}, activityLogs: {}, tenants: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn(), and: jest.fn(), lt: jest.fn(), sql: jest.fn() }));

import { SchedulerService } from '../scheduler/scheduler.service';

describe('SchedulerService', () => {
  let service: SchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new (SchedulerService as any)();
  });

  it('can be instantiated', () => {
    expect(service).toBeDefined();
  });

  it('checkLowStock returns notification count', async () => {
    const { db } = require('@smart-erp/database');
    const chain: any = Promise.resolve([]);
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    db.select.mockReturnValue(chain);

    const result = await service.checkLowStock();
    expect(result).toHaveProperty('checked');
    expect(typeof result.checked).toBe('number');
  });

  it('cleanupOldLogs deletes logs older than 90 days', async () => {
    const { db } = require('@smart-erp/database');
    const chain: any = Promise.resolve({ rowCount: 5 });
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.delete = jest.fn().mockReturnValue(chain);
    db.delete.mockReturnValue(chain);

    const result = await service.cleanupOldLogs();
    expect(result).toHaveProperty('deleted');
    expect(typeof result.deleted).toBe('number');
  });
});
