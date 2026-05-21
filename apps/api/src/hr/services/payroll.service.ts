// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { salaryBoards, payslips, attendanceRecords, users } from '@smart-erp/database';
import { eq, and, sql, desc } from 'drizzle-orm';

@Injectable()
export class PayrollService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Lấy danh sách bảng lương */
  async listBoards(tenantId: string) {
    return this.drizzle.db
      .select()
      .from(salaryBoards)
      .where(eq(salaryBoards.tenantId, tenantId))
      .orderBy(desc(salaryBoards.year), desc(salaryBoards.month));
  }

  /**
   * Tự động sinh bảng lương cho một tháng
   * - Quét toàn bộ attendanceRecords trong tháng
   * - Tổng hợp số ngày công, overtime
   * - Áp dụng lương cơ bản giả định (vì bảng user hiện tại chưa có lương)
   */
  async generateSalaryBoard(tenantId: string, authorId: string, month: number, year: number) {
    const boardName = `Bảng lương tháng ${String(month).padStart(2, '0')}/${year}`;

    // Tạo bảng lương nháp
    const [board] = await this.drizzle.db
      .insert(salaryBoards)
      .values({
        tenantId,
        name: boardName,
        month: String(month),
        year: String(year),
        status: 'draft',
        createdBy: authorId,
      })
      .returning();

    // Tính toán ngày đầu và ngày cuối tháng
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    // Lấy thông tin chấm công tổng hợp theo từng nhân viên
    const attendanceStats = await this.drizzle.db.execute(sql`
      SELECT 
        employee_id,
        COUNT(*) FILTER (WHERE status IN ('present', 'late'))::numeric AS present_days,
        COALESCE(SUM(overtime_hours::numeric), 0) AS total_ot,
        COALESCE(SUM(late_minutes), 0) AS total_late
      FROM attendance_records
      WHERE tenant_id = ${tenantId}
        AND work_date BETWEEN ${startStr}::date AND ${endStr}::date
      GROUP BY employee_id
    `);

    // Lưu chi tiết từng phiếu lương
    let totalEmployees = 0;
    let totalNetSalary = 0;

    for (const stat of attendanceStats as any[]) {
      // Trong thực tế, baseSalary lấy từ Hợp đồng nhân sự.
      // Ở đây ta gán giả định 10.000.000đ cho demo, hoặc lấy từ bảng users nếu có.
      const baseSalary = 10000000;
      const standardWorkDays = 22;
      
      const actualWorkDays = Number(stat.present_days) || 0;
      const otHours = Number(stat.total_ot) || 0;
      const lateMinutes = Number(stat.total_late) || 0;

      // Tính lương ngày và lương giờ
      const dailyRate = baseSalary / standardWorkDays;
      const hourlyRate = dailyRate / 8;

      // Tính lương cơ bản thực nhận
      const calculatedSalary = (actualWorkDays / standardWorkDays) * baseSalary;
      
      // Tính OT (Hệ số 1.5)
      const overtimePay = otHours * hourlyRate * 1.5;
      
      // Khấu trừ đi trễ (giả sử 10k/phút)
      const deductions = lateMinutes * 10000;

      const netSalary = Math.max(0, calculatedSalary + overtimePay - deductions);

      await this.drizzle.db.insert(payslips).values({
        tenantId,
        boardId: board.id,
        employeeId: stat.employee_id,
        baseSalary: String(baseSalary),
        standardWorkDays: String(standardWorkDays),
        actualWorkDays: String(actualWorkDays),
        overtimeHours: String(otHours),
        overtimePay: String(overtimePay),
        deductions: String(deductions),
        netSalary: String(netSalary),
      });

      totalEmployees++;
      totalNetSalary += netSalary;
    }

    // Cập nhật lại tổng quan bảng lương
    await this.drizzle.db
      .update(salaryBoards)
      .set({
        totalEmployees: String(totalEmployees),
        totalNetSalary: String(totalNetSalary),
      })
      .where(eq(salaryBoards.id, board.id));

    return board;
  }

  /** Lấy chi tiết các phiếu lương trong 1 bảng lương */
  async getPayslips(tenantId: string, boardId: string) {
    return this.drizzle.db.execute(sql`
      SELECT p.*, u.name as employee_name, u.email as employee_email
      FROM payslips p
      JOIN users u ON u.id = p.employee_id
      WHERE p.tenant_id = ${tenantId} AND p.board_id = ${boardId}
    `);
  }

  /** Duyệt bảng lương */
  async approveBoard(tenantId: string, boardId: string) {
    const [updated] = await this.drizzle.db
      .update(salaryBoards)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(and(eq(salaryBoards.tenantId, tenantId), eq(salaryBoards.id, boardId)))
      .returning();
    if (!updated) throw new NotFoundException('Board not found');
    return updated;
  }
}
