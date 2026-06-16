jest.mock('@smart-erp/database', () => ({ db: { execute: jest.fn() } }));
jest.mock('@smart-erp/database/drizzle', () => ({ sql: jest.fn((s: any) => s) }));

import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(() => { controller = new AppController(); });

  it('getRoot returns API info', () => {
    const r = controller.getRoot();
    expect(r).toHaveProperty('name');
    expect(r).toHaveProperty('version');
  });

  it('getHealth returns ok when DB is up', async () => {
    const { db } = require('@smart-erp/database');
    db.execute.mockResolvedValue([{ '1': 1 }]);
    const r = await controller.getHealth();
    expect(r.status).toBe('ok');
    expect(r.db).toBe('ok');
  });

  it('getHealth returns degraded when DB fails', async () => {
    const { db } = require('@smart-erp/database');
    db.execute.mockRejectedValue(new Error('DB down'));
    const r = await controller.getHealth();
    expect(r.status).toBe('degraded');
    expect(r.db).toBe('error');
  });
});
