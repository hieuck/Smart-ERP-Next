import { pgTable, uuid, text, numeric, timestamp, integer, boolean, index, date, time } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

/**
 * Work Shifts (Ca lam viec)
 * Dinh nghia cac ca lam viec cua doanh nghiep
 */
export const workShifts = pgTable(
  'work_shifts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    /** Gio bat dau ca (HH:mm) */
    startTime: time('start_time').notNull(),
    /** Gio ket thuc ca (HH:mm) */
    endTime: time('end_time').notNull(),
    /** Tong gio lam viec trong ca */
    workHours: numeric('work_hours', { precision: 4, scale: 2 }).notNull(),
    /** Gio nghi giua ca (phut) */
    breakMinutes: integer('break_minutes').default(60),
    /** Mau hien thi tren lich (hex color) */
    color: text('color').default('#3b82f6'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('work_shifts_tenant_idx').on(t.tenantId),
    codeIdx: index('work_shifts_code_idx').on(t.tenantId, t.code),
  })
);

export type WorkShift = typeof workShifts.$inferSelect;
export type NewWorkShift = typeof workShifts.$inferInsert;

/**
 * Attendance Records (Cham cong)
 * Ghi nhan cham cong hang ngay cho tung nhan vien
 */
export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shiftId: uuid('shift_id').references(() => workShifts.id, { onDelete: 'set null' }),

    /** Ngay lam viec */
    workDate: date('work_date').notNull(),

    /** Thoi gian check-in thuc te */
    checkInAt: timestamp('check_in_at'),
    /** Thoi gian check-out thuc te */
    checkOutAt: timestamp('check_out_at'),

    /** Phuong thuc cham cong: manual | biometric | qr | gps | app */
    checkInMethod: text('check_in_method', {
      enum: ['manual', 'biometric', 'qr', 'gps', 'app'],
    }).default('app'),
    checkOutMethod: text('check_out_method', {
      enum: ['manual', 'biometric', 'qr', 'gps', 'app'],
    }).default('app'),

    /** Toa do GPS khi check-in */
    checkInLatitude:  numeric('check_in_latitude',  { precision: 10, scale: 7 }),
    checkInLongitude: numeric('check_in_longitude', { precision: 10, scale: 7 }),
    /** Toa do GPS khi check-out */
    checkOutLatitude:  numeric('check_out_latitude',  { precision: 10, scale: 7 }),
    checkOutLongitude: numeric('check_out_longitude', { precision: 10, scale: 7 }),

    /** Trang thai: present | absent | late | half_day | leave */
    status: text('status', {
      enum: ['present', 'absent', 'late', 'half_day', 'leave'],
    }).notNull().default('present'),

    /** Tong gio lam thuc te (tinh sau check-out) */
    actualHours: numeric('actual_hours', { precision: 5, scale: 2 }).default('0'),
    /** Gio lam them (OT) */
    overtimeHours: numeric('overtime_hours', { precision: 5, scale: 2 }).default('0'),

    /** So phut di tre (neu di tre) */
    lateMinutes: integer('late_minutes').default(0),
    /** So phut ve som (neu ve som) */
    earlyLeaveMinutes: integer('early_leave_minutes').default(0),

    /** Ghi chu nhan vien */
    notes: text('notes'),
    /** Da duoc phe duyet boi quan ly */
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx:    index('attendance_tenant_idx').on(t.tenantId),
    employeeIdx:  index('attendance_employee_idx').on(t.employeeId),
    workDateIdx:  index('attendance_work_date_idx').on(t.tenantId, t.workDate),
    employeeDateIdx: index('attendance_employee_date_idx').on(t.employeeId, t.workDate),
    statusIdx:    index('attendance_status_idx').on(t.tenantId, t.status),
  })
);

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;

/**
 * Leave Requests (Don nghi phep)
 * Quan ly don xin nghi phep, nghi om, nghi phep nam, ...
 */
export const leaveRequests = pgTable(
  'leave_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Loai nghi: annual | sick | unpaid | maternity | paternity | compensatory */
    leaveType: text('leave_type', {
      enum: ['annual', 'sick', 'unpaid', 'maternity', 'paternity', 'compensatory'],
    }).notNull(),

    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    /** Tong ngay nghi */
    totalDays: numeric('total_days', { precision: 5, scale: 1 }).notNull(),

    reason: text('reason'),

    /** Trang thai: pending | approved | rejected | cancelled */
    status: text('status', {
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
    }).notNull().default('pending'),

    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at'),
    rejectionReason: text('rejection_reason'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx:   index('leave_requests_tenant_idx').on(t.tenantId),
    employeeIdx: index('leave_requests_employee_idx').on(t.employeeId),
    statusIdx:   index('leave_requests_status_idx').on(t.tenantId, t.status),
    dateIdx:     index('leave_requests_date_idx').on(t.tenantId, t.startDate),
  })
);

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;
