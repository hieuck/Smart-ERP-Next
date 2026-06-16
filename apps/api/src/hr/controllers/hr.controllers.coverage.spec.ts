import { Test, TestingModule } from '@nestjs/testing';
import { HrController } from './hr.controller';
import { AttendanceController } from './attendance.controller';
import { PayrollController } from './payroll.controller';
import { PerformanceController } from './performance.controller';
import { DrizzleService } from '../../drizzle/drizzle.service';

const mockDrizzle = { db: { execute: jest.fn(), select: jest.fn(), insert: jest.fn() } };

describe('HR Controllers', () => {
  it('HrController can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HrController],
      providers: [{ provide: DrizzleService, useValue: mockDrizzle }],
    }).compile();
    expect(module.get<HrController>(HrController)).toBeDefined();
  });

  it('AttendanceController can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: DrizzleService, useValue: mockDrizzle }],
    }).compile();
    expect(module.get<AttendanceController>(AttendanceController)).toBeDefined();
  });

  it('PayrollController can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollController],
      providers: [{ provide: DrizzleService, useValue: mockDrizzle }],
    }).compile();
    expect(module.get<PayrollController>(PayrollController)).toBeDefined();
  });

  it('PerformanceController can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerformanceController],
      providers: [{ provide: DrizzleService, useValue: mockDrizzle }],
    }).compile();
    expect(module.get<PerformanceController>(PerformanceController)).toBeDefined();
  });
});
