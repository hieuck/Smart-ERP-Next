import { pgTable, uuid, text, numeric, timestamp, index, date, boolean, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

/**
 * Bảng lương (Salary Boards)
 * Đại diện cho đợt trả lương của cả công ty trong một tháng
 */
export const salaryBoards = pgTable(
  'salary_boards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    
    /** Tên bảng lương (VD: Bảng lương tháng 05/2026) */
    name: text('name').notNull(),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    
    /** Trạng thái: draft | approved | paid */
    status: text('status', {
      enum: ['draft', 'approved', 'paid'],
    }).notNull().default('draft'),
    
    /** Tổng số nhân viên trong bảng lương này */
    totalEmployees: numeric('total_employees').default('0'),
    /** Tổng quỹ lương phải trả */
    totalNetSalary: numeric('total_net_salary', { precision: 15, scale: 2 }).default('0'),

    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('salary_boards_tenant_idx').on(t.tenantId),
    periodIdx: index('salary_boards_period_idx').on(t.tenantId, t.year, t.month),
  })
);

export type SalaryBoard = typeof salaryBoards.$inferSelect;
export type NewSalaryBoard = typeof salaryBoards.$inferInsert;

/**
 * Phiếu lương nhân viên (Payslips)
 * Chi tiết lương của từng nhân viên dựa trên hợp đồng và chấm công
 */
export const payslips = pgTable(
  'payslips',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    boardId: uuid('board_id')
      .notNull()
      .references(() => salaryBoards.id, { onDelete: 'cascade' }),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Mức lương cơ bản (Gross) theo hợp đồng */
    baseSalary: numeric('base_salary', { precision: 15, scale: 2 }).notNull(),
    
    /** Số ngày công chuẩn của tháng (thường là 22, 24 hoặc 26) */
    standardWorkDays: numeric('standard_work_days', { precision: 4, scale: 1 }).notNull(),
    
    /** Số ngày công thực tế lấy từ AttendanceRecords */
    actualWorkDays: numeric('actual_work_days', { precision: 4, scale: 1 }).notNull().default('0'),
    /** Số giờ tăng ca (OT) */
    overtimeHours: numeric('overtime_hours', { precision: 5, scale: 2 }).default('0'),
    
    /** Phụ cấp (Tiền cơm, xăng xe, điện thoại...) */
    allowances: numeric('allowances', { precision: 15, scale: 2 }).default('0'),
    /** Tiền thưởng (KPI, chuyên cần) */
    bonus: numeric('bonus', { precision: 15, scale: 2 }).default('0'),
    
    /** Các khoản khấu trừ (BHXH, BHYT, đi trễ, thuế TNCN) */
    deductions: numeric('deductions', { precision: 15, scale: 2 }).default('0'),
    /** Tiền lương OT (đã nhân hệ số) */
    overtimePay: numeric('overtime_pay', { precision: 15, scale: 2 }).default('0'),
    
    /** Thực lĩnh (Net Salary) = Lương thực tế + Phụ cấp + Thưởng + OT - Khấu trừ */
    netSalary: numeric('net_salary', { precision: 15, scale: 2 }).notNull(),
    
    /** Có cho phép nhân viên xem phiếu lương này trên App chưa */
    isPublished: boolean('is_published').default(false),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('payslips_tenant_idx').on(t.tenantId),
    boardIdx:  index('payslips_board_idx').on(t.boardId),
    employeeIdx: index('payslips_employee_idx').on(t.employeeId),
  })
);

export type Payslip = typeof payslips.$inferSelect;
export type NewPayslip = typeof payslips.$inferInsert;
