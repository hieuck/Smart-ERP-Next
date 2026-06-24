import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { attendanceRecords, leaveRequests, workShifts, users } from '@smart-erp/database';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';

@Injectable()
export class AttendanceService {
  constructor(private readonly drizzle: DrizzleService) {}

  // ─── Work Shifts ─────────────────────────────────────────────────────────────

  async listShifts(tenantId: string) {
    return this.drizzle.db
      .select()
      .from(workShifts)
      .where(and(eq(workShifts.tenantId, tenantId), eq(workShifts.isActive, true)))
      .orderBy(workShifts.startTime);
  }

  async createShift(tenantId: string, data: {
    name: string; code: string;
    startTime: string; endTime: string;
    workHours: number; breakMinutes?: number; color?: string;
  }) {
    const [shift] = await this.drizzle.db
      .insert(workShifts)
      .values({
        tenantId,
        name: data.name,
        code: data.code,
        startTime: data.startTime,
        endTime: data.endTime,
        workHours: String(data.workHours),
        breakMinutes: data.breakMinutes ?? 60,
        color: data.color ?? '#3b82f6',
      })
      .returning();
    return shift;
  }

  // ─── Check In / Check Out ────────────────────────────────────────────────────

  /** Employee check-in */
  async checkIn(tenantId: string, employeeId: string, data: {
    shiftId?: string;
    method?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const today = new Date().toISOString().split('T')[0];

    // Prevent double check-in
    const existing = await this.drizzle.db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.workDate, today),
      ))
      .limit(1);

    if (existing.length > 0 && existing[0].checkInAt) {
      throw new ConflictException('Already checked in for today');
    }

    // Determine if late (compare to shift start)
    let lateMinutes = 0;
    let status: 'present' | 'late' = 'present';
    if (data.shiftId) {
      const [shift] = await this.drizzle.db
        .select()
        .from(workShifts)
        .where(eq(workShifts.id, data.shiftId))
        .limit(1);

      if (shift) {
        const now = new Date();
        const [shiftHour, shiftMin] = (shift.startTime as string).split(':').map(Number);
        const shiftStartToday = new Date();
        shiftStartToday.setHours(shiftHour, shiftMin + 15, 0); // 15 min grace period
        if (now > shiftStartToday) {
          lateMinutes = Math.round((now.getTime() - shiftStartToday.getTime()) / 60000);
          status = 'late';
        }
      }
    }

    if (existing.length > 0) {
      // Update existing record
      const [updated] = await this.drizzle.db
        .update(attendanceRecords)
        .set({
          checkInAt: new Date(),
          checkInMethod: (data.method as any) ?? 'app',
          checkInLatitude: data.latitude ? String(data.latitude) : undefined,
          checkInLongitude: data.longitude ? String(data.longitude) : undefined,
          status,
          lateMinutes,
          updatedAt: new Date(),
        })
        .where(eq(attendanceRecords.id, existing[0].id))
        .returning();
      return updated;
    }

    const [record] = await this.drizzle.db
      .insert(attendanceRecords)
      .values({
        tenantId,
        employeeId,
        shiftId: data.shiftId,
        workDate: today,
        checkInAt: new Date(),
        checkInMethod: (data.method as any) ?? 'app',
        checkInLatitude: data.latitude ? String(data.latitude) : undefined,
        checkInLongitude: data.longitude ? String(data.longitude) : undefined,
        status,
        lateMinutes,
      })
      .returning();

    return record;
  }

  /** Employee check-out */
  async checkOut(tenantId: string, employeeId: string, data: {
    method?: string; latitude?: number; longitude?: number;
  }) {
    const today = new Date().toISOString().split('T')[0];

    const [record] = await this.drizzle.db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.workDate, today),
      ))
      .limit(1);

    if (!record) throw new NotFoundException('No check-in found for today');
    if (record.checkOutAt) throw new ConflictException('Already checked out');

    const checkIn = record.checkInAt!;
    const checkOut = new Date();
    const actualMinutes = Math.round((checkOut.getTime() - new Date(checkIn).getTime()) / 60000);
    const actualHours = Math.round((actualMinutes / 60) * 100) / 100;

    // Calculate OT (hours beyond standard shift hours)
    let overtimeHours = 0;
    if (record.shiftId) {
      const [shift] = await this.drizzle.db
        .select()
        .from(workShifts)
        .where(eq(workShifts.id, record.shiftId))
        .limit(1);
      if (shift) {
        const standardHours = Number(shift.workHours);
        overtimeHours = Math.max(0, Math.round((actualHours - standardHours) * 100) / 100);
      }
    }

    const [updated] = await this.drizzle.db
      .update(attendanceRecords)
      .set({
        checkOutAt: checkOut,
        checkOutMethod: (data.method as any) ?? 'app',
        checkInLatitude: data.latitude ? String(data.latitude) : undefined,
        checkInLongitude: data.longitude ? String(data.longitude) : undefined,
        actualHours: String(actualHours),
        overtimeHours: String(overtimeHours),
        updatedAt: new Date(),
      })
      .where(eq(attendanceRecords.id, record.id))
      .returning();

    return updated;
  }

  /** Get today's attendance for an employee */
  async getTodayStatus(tenantId: string, employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const [record] = await this.drizzle.db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.workDate, today),
      ))
      .limit(1);

    return record ?? { status: 'not_checked_in', workDate: today };
  }

  /** List attendance records for a period */
  async listRecords(tenantId: string, filters: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { page = 1, limit = 30, employeeId, startDate, endDate, status } = filters;
    const offset = (page - 1) * limit;

    let query = sql`
      SELECT
        a.*,
        u.name as employee_name,
        ws.name as shift_name,
        ws.start_time as shift_start,
        ws.end_time as shift_end
      FROM attendance_records a
      LEFT JOIN users u ON u.id = a.employee_id
      LEFT JOIN work_shifts ws ON ws.id = a.shift_id
      WHERE a.tenant_id = ${tenantId}
    `;

    if (employeeId) query = sql`${query} AND a.employee_id = ${employeeId}`;
    if (startDate)  query = sql`${query} AND a.work_date >= ${startDate}::date`;
    if (endDate)    query = sql`${query} AND a.work_date <= ${endDate}::date`;
    if (status)     query = sql`${query} AND a.status = ${status}`;

    query = sql`${query} ORDER BY a.work_date DESC, u.name ASC LIMIT ${limit} OFFSET ${offset}`;

    return this.drizzle.db.execute(query);
  }

  /** Get monthly summary stats for an employee or all employees */
  async getMonthlySummary(tenantId: string, year: number, month: number, employeeId?: string) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).getDate();
    const end   = `${year}-${String(month).padStart(2, '0')}-${endDate}`;

    let whereClause = sql`tenant_id = ${tenantId} AND work_date BETWEEN ${start}::date AND ${end}::date`;
    if (employeeId) whereClause = sql`${whereClause} AND employee_id = ${employeeId}`;

    const result = await this.drizzle.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'present')::int  AS present_days,
        COUNT(*) FILTER (WHERE status = 'late')::int     AS late_days,
        COUNT(*) FILTER (WHERE status = 'absent')::int   AS absent_days,
        COUNT(*) FILTER (WHERE status = 'half_day')::int AS half_days,
        COUNT(*) FILTER (WHERE status = 'leave')::int    AS leave_days,
        COALESCE(SUM(actual_hours::numeric), 0)    AS total_hours,
        COALESCE(SUM(overtime_hours::numeric), 0)  AS total_overtime,
        COALESCE(SUM(late_minutes), 0)             AS total_late_minutes
      FROM attendance_records
      WHERE ${whereClause}
    `);
    return (result as unknown as any[])[0] || {};
  }

  // ─── Leave Requests ───────────────────────────────────────────────────────────

  async createLeaveRequest(tenantId: string, employeeId: string, data: {
    leaveType: string; startDate: string; endDate: string;
    totalDays: number; reason?: string;
  }) {
    const [req] = await this.drizzle.db
      .insert(leaveRequests)
      .values({
        tenantId,
        employeeId,
        leaveType: data.leaveType as any,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: String(data.totalDays),
        reason: data.reason,
        status: 'pending',
      })
      .returning();
    return req;
  }

  async approveLeave(tenantId: string, requestId: string, approverId: string) {
    const [updated] = await this.drizzle.db
      .update(leaveRequests)
      .set({ status: 'approved', approvedBy: approverId, approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.id, requestId)))
      .returning();
    return updated;
  }

  async rejectLeave(tenantId: string, requestId: string, approverId: string, reason: string) {
    const [updated] = await this.drizzle.db
      .update(leaveRequests)
      .set({ status: 'rejected', approvedBy: approverId, approvedAt: new Date(), rejectionReason: reason, updatedAt: new Date() })
      .where(and(eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.id, requestId)))
      .returning();
    return updated;
  }

  async listLeaveRequests(tenantId: string, status?: string, employeeId?: string) {
    let query = sql`
      SELECT lr.*, u.name as employee_name
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.employee_id
      WHERE lr.tenant_id = ${tenantId}
    `;
    if (status)     query = sql`${query} AND lr.status = ${status}`;
    if (employeeId) query = sql`${query} AND lr.employee_id = ${employeeId}`;
    query = sql`${query} ORDER BY lr.created_at DESC LIMIT 50`;
    return this.drizzle.db.execute(query);
  }
}
