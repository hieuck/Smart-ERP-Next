jest.mock('@smart-erp/database', () => ({ db: { execute: jest.fn() } }));
jest.mock('@smart-erp/database/drizzle', () => ({ sql: jest.fn((s: any) => s) }));

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';

describe('App integration', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    appController = module.get<AppController>(AppController);
  });

  it('should return health status', async () => {
    const { db } = require('@smart-erp/database');
    db.execute.mockResolvedValue([{ '1': 1 }]);
    const result = await appController.getHealth();
    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('timestamp');
  });
});
