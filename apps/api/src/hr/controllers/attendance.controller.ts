import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from '../services/attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Attendance')
@Controller('hr/attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // ── Shifts ─────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List work shifts' })
  @Get('shifts')
  listShifts(@Request() req: any) {
    return this.service.listShifts(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Create work shift' })
  @Post('shifts')
  createShift(@Request() req: any, @Body() body: {
    name: string; code: string; startTime: string; endTime: string;
    workHours: number; breakMinutes?: number; color?: string;
  }) {
    return this.service.createShift(req.user.tenantId, body);
  }

  // ── Check-in / Check-out ───────────────────────────────────────────────────

  @ApiOperation({ summary: 'Check in for today' })
  @Post('check-in')
  checkIn(@Request() req: any, @Body() body: {
    shiftId?: string; method?: string;
    latitude?: number; longitude?: number;
  }) {
    return this.service.checkIn(req.user.tenantId, req.user.sub, body);
  }

  @ApiOperation({ summary: 'Check out for today' })
  @Post('check-out')
  checkOut(@Request() req: any, @Body() body: {
    method?: string; latitude?: number; longitude?: number;
  }) {
    return this.service.checkOut(req.user.tenantId, req.user.sub, body);
  }

  @ApiOperation({ summary: "Get today's attendance status for current user" })
  @Get('today')
  getToday(@Request() req: any) {
    return this.service.getTodayStatus(req.user.tenantId, req.user.sub);
  }

  @ApiOperation({ summary: "Get any employee's today status (manager)" })
  @Get('today/:employeeId')
  getEmployeeToday(@Request() req: any, @Param('employeeId') employeeId: string) {
    return this.service.getTodayStatus(req.user.tenantId, employeeId);
  }

  // ── Records ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List attendance records' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'startDate',  required: false })
  @ApiQuery({ name: 'endDate',    required: false })
  @ApiQuery({ name: 'status',     required: false })
  @ApiQuery({ name: 'page',       required: false })
  @Get('records')
  listRecords(
    @Request() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?: string,
    @Query('status')    status?: string,
    @Query('page')      page?: string,
  ) {
    return this.service.listRecords(req.user.tenantId, {
      employeeId, startDate, endDate, status,
      page: page ? Number(page) : 1,
    });
  }

  // ── Monthly Stats ─────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Monthly attendance summary' })
  @Get('summary/monthly')
  getMonthlySummary(
    @Request() req: any,
    @Query('year')       year?: string,
    @Query('month')      month?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const now = new Date();
    return this.service.getMonthlySummary(
      req.user.tenantId,
      year  ? Number(year)  : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
      employeeId,
    );
  }

  // ── Leave Requests ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create leave request' })
  @Post('leave')
  createLeave(@Request() req: any, @Body() body: {
    leaveType: string; startDate: string; endDate: string;
    totalDays: number; reason?: string;
  }) {
    return this.service.createLeaveRequest(req.user.tenantId, req.user.sub, body);
  }

  @ApiOperation({ summary: 'List leave requests' })
  @ApiQuery({ name: 'status', required: false })
  @Get('leave')
  listLeave(@Request() req: any, @Query('status') status?: string) {
    return this.service.listLeaveRequests(req.user.tenantId, status);
  }

  @ApiOperation({ summary: 'Approve leave request' })
  @Patch('leave/:id/approve')
  approveLeave(@Request() req: any, @Param('id') id: string) {
    return this.service.approveLeave(req.user.tenantId, id, req.user.sub);
  }

  @ApiOperation({ summary: 'Reject leave request' })
  @Patch('leave/:id/reject')
  rejectLeave(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.rejectLeave(req.user.tenantId, id, req.user.sub, body.reason);
  }
}
