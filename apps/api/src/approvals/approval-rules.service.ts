import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { approvalRules, NewApprovalRule, ApprovalRule } from '@smart-erp/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { CreateApprovalRuleDto } from './dto/create-approval-rule.dto';

@Injectable()
export class ApprovalRulesService {
  constructor(private drizzle: DrizzleService) {}

  async create(tenantId: string, data: CreateApprovalRuleDto): Promise<ApprovalRule> {
    const newRule: NewApprovalRule = {
      tenantId,
      name: data.name,
      description: data.description,
      documentType: data.documentType,
      minAmount: data.minAmount?.toString(),
      maxAmount: data.maxAmount?.toString(),
      priority: data.priority?.toString() || '1',
      isActive: 'true',
    };
    const [rule] = await this.drizzle.db.insert(approvalRules).values(newRule).returning();
    return rule;
  }

  async findAll(tenantId: string): Promise<ApprovalRule[]> {
    return this.drizzle.db
      .select()
      .from(approvalRules)
      .where(eq(approvalRules.tenantId, tenantId))
      .orderBy(desc(approvalRules.priority));
  }

  async findOne(tenantId: string, id: string): Promise<ApprovalRule> {
    const [rule] = await this.drizzle.db
      .select()
      .from(approvalRules)
      .where(and(eq(approvalRules.tenantId, tenantId), eq(approvalRules.id, id)))
      .limit(1);
    if (!rule) throw new NotFoundException('Approval rule not found');
    return rule;
  }

  async update(tenantId: string, id: string, data: Partial<CreateApprovalRuleDto>): Promise<ApprovalRule> {
    const [updated] = await this.drizzle.db
      .update(approvalRules)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(approvalRules.tenantId, tenantId), eq(approvalRules.id, id)))
      .returning();
    if (!updated) throw new NotFoundException('Approval rule not found');
    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.drizzle.db
      .delete(approvalRules)
      .where(and(eq(approvalRules.tenantId, tenantId), eq(approvalRules.id, id)));
  }

  async findMatchingRule(tenantId: string, documentType: string, amount: number): Promise<ApprovalRule | null> {
    const [rule] = await this.drizzle.db
      .select()
      .from(approvalRules)
      .where(
        and(
          eq(approvalRules.tenantId, tenantId),
          eq(approvalRules.documentType, documentType),
          eq(approvalRules.isActive, 'true'),
          amount !== undefined && amount !== null
            ? sql`${approvalRules.minAmount} IS NULL OR ${amount} >= ${approvalRules.minAmount}`
            : sql`TRUE`,
          amount !== undefined && amount !== null
            ? sql`${approvalRules.maxAmount} IS NULL OR ${amount} <= ${approvalRules.maxAmount}`
            : sql`TRUE`
        )
      )
      .orderBy(desc(approvalRules.priority))
      .limit(1);
    return rule || null;
  }
}
