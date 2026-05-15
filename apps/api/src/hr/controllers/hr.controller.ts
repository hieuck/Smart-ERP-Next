import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { HrService } from '../services/hr.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Post('employees')
  create(@Request() req: any, @Body() dto: CreateEmployeeDto) {
    return this.hrService.createEmployee(req.user.tenantId, dto);
  }

  @Get('employees')
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.hrService.findAllEmployees(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
    });
  }

  @Get('employees/:id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.hrService.findOneEmployee(req.user.tenantId, id);
  }

  @Patch('employees/:id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.hrService.updateEmployee(req.user.tenantId, req.user.sub, id, dto);
  }

  @Delete('employees/:id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.hrService.removeEmployee(req.user.tenantId, req.user.sub, id);
  }

  @Post('payroll/process')
  processPayroll(@Request() req: any) {
    return this.hrService.processPayroll(req.user.tenantId);
  }

  @Get('payroll')
  getPayrolls(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hrService.getPayrolls(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}