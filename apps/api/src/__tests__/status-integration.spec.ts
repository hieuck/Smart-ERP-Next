jest.mock('@smart-erp/database', () => ({ db: { execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } }));
jest.mock('@smart-erp/database/drizzle', () => ({ sql: jest.fn((s: any) => s) }));

import { StatusController } from '../monitor/status.controller';
import { StatusService } from '../monitor/status.service';

describe('Status API — Monitoring Foundation', () => {
  let service: StatusService;
  let controller: StatusController;

  beforeEach(() => {
    service = new (StatusService as any)();
    controller = new (StatusController as any)(service);
  });

  it('getStatus returns version, uptime, dbStatus', async () => {
    const result = await controller.getStatus();
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('uptime');
    expect(result).toHaveProperty('dbStatus');
    expect(typeof result.version).toBe('string');
    expect(typeof result.uptime).toBe('number');
  });

  it('getStatus returns healthy dbStatus when DB is reachable', async () => {
    const result = await controller.getStatus();
    expect(result.dbStatus).toBe('healthy');
  });

  it('status endpoint returns timestamp in ISO format', async () => {
    const result = await controller.getStatus();
    expect(result).toHaveProperty('timestamp');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
