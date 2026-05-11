import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { approvalRequests, approvalChainItems, NewApprovalRequest, NewApprovalChainItem, ApprovalRequest } from '@smart-erp/database';
import { eq, and } from 'drizzle-orm';
import { ApprovalRulesService } from './approval-rules.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private drizzle: DrizzleService,
    private rulesService: ApprovalRulesService,
  ) {}

  async submitForApproval(
    tenantId: string,
    documentType: string,
    documentId: string,
    documentAmount: number,
    requestedBy: string,
    approverIds: string[], // order matters
  ): Promise<ApprovalRequest> {
    // Check if already has pending request
    const existing = await this.drizzle.db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.tenantId, tenantId),
          eq(approvalRequests.documentId, documentId),
          eq(approvalRequests.documentType, documentType),
          eq(approvalRequests.status, 'pending')
        )
      )
      .limit(1);
    if (existing.length) {
      throw new BadRequestException('Document already has a pending approval request');
    }

    // Find matching rule
    const rule = await this.rulesService.findMatchingRule(tenantId, documentType, documentAmount);

    // Create approval request
    const newRequest: NewApprovalRequest = {
      tenantId,
      documentId,
      documentType,
      ruleId: rule?.id,
      requestedBy,
      status: 'pending',
      currentStepIndex: '0',
    };
    const [request] = await this.drizzle.db.insert(approvalRequests).values(newRequest).returning();

    // Create chain items
    const chainItems: NewApprovalChainItem[] = approverIds.map((approverId, idx) => ({
      requestId: request.id,
      stepIndex: idx.toString(),
      approverId,
      status: idx === 0 ? 'pending' : 'pending',
    }));
    await this.drizzle.db.insert(approvalChainItems).values(chainItems);

    return request;
  }

  async approveStep(tenantId: string, requestId: string, approverId: string, comments?: string) {
    const request = await this.getRequest(tenantId, requestId);
    if (request.status !== 'pending') {
      throw new BadRequestException('Approval request is not pending');
    }

    const items = await this.drizzle.db
      .select()
      .from(approvalChainItems)
      .where(eq(approvalChainItems.requestId, requestId))
      .orderBy(({ stepIndex }) => stepIndex);

    const currentIdx = parseInt(request.currentStepIndex || '0');
    if (currentIdx >= items.length) {
      throw new BadRequestException('No more approval steps');
    }
    const currentItem = items[currentIdx];
    if (currentItem.approverId !== approverId) {
      throw new BadRequestException('You are not the approver for this step');
    }

    // Update current step
    await this.drizzle.db
      .update(approvalChainItems)
      .set({ status: 'approved', comments, respondedAt: new Date() })
      .where(eq(approvalChainItems.id, currentItem.id));

    const nextIdx = currentIdx + 1;
    if (nextIdx >= items.length) {
      // All steps approved
      await this.drizzle.db
        .update(approvalRequests)
        .set({ status: 'approved', updatedAt: new Date() })
        .where(eq(approvalRequests.id, requestId));
    } else {
      // Move to next step
      await this.drizzle.db
        .update(approvalChainItems)
        .set({ status: 'pending', notifiedAt: new Date() })
        .where(eq(approvalChainItems.id, items[nextIdx].id));
      await this.drizzle.db
        .update(approvalRequests)
        .set({ currentStepIndex: nextIdx.toString(), updatedAt: new Date() });
    }
  }

  async rejectStep(tenantId: string, requestId: string, approverId: string, comments: string) {
    const request = await this.getRequest(tenantId, requestId);
    if (request.status !== 'pending') {
      throw new BadRequestException('Approval request is not pending');
    }

    const items = await this.drizzle.db
      .select()
      .from(approvalChainItems)
      .where(eq(approvalChainItems.requestId, requestId))
      .orderBy(({ stepIndex }) => stepIndex);

    const currentIdx = parseInt(request.currentStepIndex || '0');
    if (currentIdx >= items.length) {
      throw new BadRequestException('No more approval steps');
    }
    const currentItem = items[currentIdx];
    if (currentItem.approverId !== approverId) {
      throw new BadRequestException('You are not the approver for this step');
    }

    await this.drizzle.db
      .update(approvalChainItems)
      .set({ status: 'rejected', comments, respondedAt: new Date() })
      .where(eq(approvalChainItems.id, currentItem.id));

    await this.drizzle.db
      .update(approvalRequests)
      .set({ status: 'rejected', updatedAt: new Date() });
  }

  async getRequest(tenantId: string, requestId: string): Promise<ApprovalRequest> {
    const [request] = await this.drizzle.db
      .select()
      .from(approvalRequests)
      .where(and(eq(approvalRequests.tenantId, tenantId), eq(approvalRequests.id, requestId)))
      .limit(1);
    if (!request) throw new NotFoundException('Approval request not found');
    return request;
  }
}
