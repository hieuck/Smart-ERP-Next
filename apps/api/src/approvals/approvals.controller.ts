import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalRulesService } from './approval-rules.service';
import { CreateApprovalRuleDto } from './dto/create-approval-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(
    private readonly approvalsService: ApprovalsService,
    private readonly rulesService: ApprovalRulesService,
  ) {}

  // Approval Rules CRUD
  @Post('rules')
  createRule(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateApprovalRuleDto) {
    return this.rulesService.create(tenantId, dto);
  }

  @Get('rules')
  findAllRules(@CurrentUser('tenantId') tenantId: string) {
    return this.rulesService.findAll(tenantId);
  }

  @Get('rules/:id')
  findOneRule(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.rulesService.findOne(tenantId, id);
  }

  @Put('rules/:id')
  updateRule(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateApprovalRuleDto>) {
    return this.rulesService.update(tenantId, id, dto);
  }

  @Delete('rules/:id')
  removeRule(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.rulesService.remove(tenantId, id);
  }

  // Approval requests
  @Post('requests')
  submitForApproval(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { documentType: string; documentId: string; documentAmount: number; approverIds: string[] }
  ) {
    return this.approvalsService.submitForApproval(
      tenantId,
      body.documentType,
      body.documentId,
      body.documentAmount,
      userId,
      body.approverIds,
    );
  }

  @Post('requests/:requestId/approve')
  approveStep(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') approverId: string,
    @Param('requestId') requestId: string,
    @Body() body: { comments?: string }
  ) {
    return this.approvalsService.approveStep(tenantId, requestId, approverId, body.comments);
  }

  @Post('requests/:requestId/reject')
  rejectStep(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') approverId: string,
    @Param('requestId') requestId: string,
    @Body() body: { comments: string }
  ) {
    return this.approvalsService.rejectStep(tenantId, requestId, approverId, body.comments);
  }

  @Get('requests/:id')
  getRequest(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.approvalsService.getRequest(tenantId, id);
  }
}
