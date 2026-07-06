jest.mock('@smart-erp/database', () => ({
  attendanceRecords: {
    id: 'attendance.id',
    tenantId: 'attendance.tenantId',
    employeeId: 'attendance.employeeId',
    workDate: 'attendance.workDate',
  },
  leaveRequests: {
    id: 'leave.id',
    tenantId: 'leave.tenantId',
    employeeId: 'leave.employeeId',
  },
  workShifts: {
    id: 'shift.id',
    tenantId: 'shift.tenantId',
    isActive: 'shift.isActive',
    startTime: 'shift.startTime',
  },
  users: { id: 'user.id' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  lte: jest.fn((field, value) => ({ op: 'lte', field, value })),
  between: jest.fn((field, from, to) => ({ op: 'between', field, from, to })),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

const selectQueue: any[][] = [];
const insertQueue: any[][] = [];
const updateQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = (queue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('AttendanceService coverage', () => {
  const db = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    execute: jest.fn(),
  };
  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T10:00:00.000Z'));
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    db.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    db.insert.mockImplementation(() => makeWriteChain(insertQueue));
    db.update.mockImplementation(() => makeWriteChain(updateQueue));
    db.execute.mockResolvedValue([]);
    service = new AttendanceService({ db } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists and creates work shifts with default values', async () => {
    selectQueue.push([{ id: 'shift-1', name: 'Morning' }]);
    insertQueue.push([{ id: 'shift-2', breakMinutes: 60, color: '#3b82f6' }]);

    await expect(service.listShifts('tenant-1')).resolves.toEqual([{ id: 'shift-1', name: 'Morning' }]);
    await expect(service.createShift('tenant-1', {
      name: 'Afternoon',
      code: 'PM',
      startTime: '13:00',
      endTime: '17:00',
      workHours: 4,
    })).resolves.toEqual({ id: 'shift-2', breakMinutes: 60, color: '#3b82f6' });
  });

  it('checks in new, late, existing, and duplicate attendance records', async () => {
    selectQueue.push([], [{ id: 'shift-1', startTime: '08:00' }]);
    insertQueue.push([{ id: 'att-1', status: 'late', lateMinutes: 105 }]);

    await expect(service.checkIn('tenant-1', 'emp-1', {
      shiftId: 'shift-1',
      method: 'gps',
      latitude: 10.1,
      longitude: 106.7,
    })).resolves.toEqual({ id: 'att-1', status: 'late', lateMinutes: 105 });

    selectQueue.push([{ id: 'att-2', checkInAt: null }]);
    updateQueue.push([{ id: 'att-2', status: 'present' }]);
    await expect(service.checkIn('tenant-1', 'emp-1', {})).resolves.toEqual({ id: 'att-2', status: 'present' });

    selectQueue.push([{ id: 'att-3', checkInAt: new Date('2026-05-21T08:00:00.000Z') }]);
    await expect(service.checkIn('tenant-1', 'emp-1', {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('checks in with default methods and coordinate fallbacks', async () => {
    selectQueue.push([]);
    insertQueue.push([{ id: 'att-default', status: 'present' }]);

    await expect(service.checkIn('tenant-1', 'emp-default', {})).resolves.toEqual({
      id: 'att-default',
      status: 'present',
    });
    const insertValues = db.insert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        checkInMethod: 'app',
        checkInLatitude: undefined,
        checkInLongitude: undefined,
      }),
    );

    selectQueue.push([{ id: 'att-existing', checkInAt: null }]);
    updateQueue.push([{ id: 'att-existing', status: 'present' }]);

    await expect(service.checkIn('tenant-1', 'emp-default', {
      latitude: 10.5,
      longitude: 106.9,
    })).resolves.toEqual({ id: 'att-existing', status: 'present' });
    const updateValues = db.update.mock.results[0].value.set;
    expect(updateValues).toHaveBeenCalledWith(
      expect.objectContaining({
        checkInMethod: 'app',
        checkInLatitude: '10.5',
        checkInLongitude: '106.9',
      }),
    );
  });

  it('checks out with not-found, duplicate, and overtime branches', async () => {
    selectQueue.push([]);
    await expect(service.checkOut('tenant-1', 'emp-1', {})).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'att-1', checkInAt: new Date('2026-05-21T08:00:00.000Z'), checkOutAt: new Date() }]);
    await expect(service.checkOut('tenant-1', 'emp-1', {})).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push(
      [{ id: 'att-2', shiftId: 'shift-1', checkInAt: new Date('2026-05-21T00:00:00.000Z'), checkOutAt: null }],
      [{ id: 'shift-1', workHours: '8' }],
    );
    updateQueue.push([{ id: 'att-2', actualHours: '10', overtimeHours: '2' }]);

    await expect(service.checkOut('tenant-1', 'emp-1', {
      method: 'app',
      latitude: 10.2,
      longitude: 106.8,
    })).resolves.toEqual({ id: 'att-2', actualHours: '10', overtimeHours: '2' });
  });

  it('checks out with default method, no coordinates, and no shift overtime lookup', async () => {
    selectQueue.push([{ id: 'att-default-out', checkInAt: new Date('2026-05-21T09:00:00.000Z'), checkOutAt: null }]);
    updateQueue.push([{ id: 'att-default-out', actualHours: '1', overtimeHours: '0' }]);

    await expect(service.checkOut('tenant-1', 'emp-1', {})).resolves.toEqual({
      id: 'att-default-out',
      actualHours: '1',
      overtimeHours: '0',
    });

    const updateValues = db.update.mock.results[0].value.set;
    expect(updateValues).toHaveBeenCalledWith(
      expect.objectContaining({
        checkOutMethod: 'app',
        checkOutLatitude: undefined,
        checkOutLongitude: undefined,
        overtimeHours: '0',
      }),
    );
  });

  it('stores checkout coordinates in checkout fields and does not overwrite check-in fields', async () => {
    selectQueue.push([{
      id: 'att-coords',
      checkInAt: new Date('2026-05-21T08:00:00.000Z'),
      checkInLatitude: '10.1',
      checkInLongitude: '106.7',
      checkOutAt: null,
    }]);
    updateQueue.push([{ id: 'att-coords', actualHours: '2', overtimeHours: '0' }]);

    await expect(service.checkOut('tenant-1', 'emp-1', {
      method: 'gps',
      latitude: 10.8,
      longitude: 107.2,
    })).resolves.toEqual({ id: 'att-coords', actualHours: '2', overtimeHours: '0' });

    const updateValues = db.update.mock.results[0].value.set;
    expect(updateValues).toHaveBeenCalledWith(
      expect.objectContaining({
        checkOutMethod: 'gps',
        checkOutLatitude: '10.8',
        checkOutLongitude: '107.2',
      }),
    );
    expect(updateValues).toHaveBeenCalledWith(
      expect.not.objectContaining({
        checkInLatitude: expect.anything(),
        checkInLongitude: expect.anything(),
      }),
    );
  });

  it('returns status, records, monthly summary, and leave request flows', async () => {
    selectQueue.push([{ id: 'att-today', status: 'present' }], []);
    await expect(service.getTodayStatus('tenant-1', 'emp-1')).resolves.toEqual({ id: 'att-today', status: 'present' });
    await expect(service.getTodayStatus('tenant-1', 'emp-2')).resolves.toEqual({
      status: 'not_checked_in',
      workDate: '2026-05-21',
    });

    db.execute
      .mockResolvedValueOnce([{ id: 'att-row' }])
      .mockResolvedValueOnce([{ present_days: 20, total_hours: '160' }])
      .mockResolvedValueOnce([]);

    await expect(service.listRecords('tenant-1', {
      employeeId: 'emp-1',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      status: 'present',
      page: 2,
      limit: 10,
    })).resolves.toEqual([{ id: 'att-row' }]);
    await expect(service.getMonthlySummary('tenant-1', 2026, 5, 'emp-1')).resolves.toEqual({
      present_days: 20,
      total_hours: '160',
    });
    await expect(service.getMonthlySummary('tenant-1', 2026, 6)).resolves.toEqual({});

    insertQueue.push([{ id: 'leave-1', status: 'pending' }]);
    updateQueue.push([{ id: 'leave-1', status: 'approved' }], [{ id: 'leave-2', status: 'rejected' }]);
    db.execute.mockResolvedValueOnce([{ id: 'leave-1' }]);

    await expect(service.createLeaveRequest('tenant-1', 'emp-1', {
      leaveType: 'annual',
      startDate: '2026-05-22',
      endDate: '2026-05-23',
      totalDays: 2,
      reason: 'Family',
    })).resolves.toEqual({ id: 'leave-1', status: 'pending' });
    await expect(service.approveLeave('tenant-1', 'leave-1', 'manager-1')).resolves.toEqual({ id: 'leave-1', status: 'approved' });
    await expect(service.rejectLeave('tenant-1', 'leave-2', 'manager-1', 'Invalid')).resolves.toEqual({ id: 'leave-2', status: 'rejected' });
    await expect(service.listLeaveRequests('tenant-1', 'pending', 'emp-1')).resolves.toEqual([{ id: 'leave-1' }]);
  });

  it('lists records with default filters and pagination', async () => {
    db.execute.mockResolvedValueOnce([{ id: 'att-default-row' }]);

    await expect(service.listRecords('tenant-1')).resolves.toEqual([{ id: 'att-default-row' }]);
    expect(db.execute).toHaveBeenCalledTimes(1);
  });
});
