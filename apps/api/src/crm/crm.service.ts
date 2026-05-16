import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { leads, crmPipelines, crmStages, crmDeals, orders } from '@smart-erp/database';
import { eq, and, desc, asc } from 'drizzle-orm';

@Injectable()
export class CrmService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getPipelines(tenantId: string) {
    const pipelines = await this.drizzle.db
      .select()
      .from(crmPipelines)
      .where(eq(crmPipelines.tenantId, tenantId));

    const results = [];
    for (const pipe of pipelines) {
      const stages = await this.drizzle.db
        .select()
        .from(crmStages)
        .where(eq(crmStages.pipelineId, pipe.id))
        .orderBy(asc(crmStages.sequence));
      results.push({ ...pipe, stages });
    }
    return results;
  }

  async getDealsByStage(tenantId: string, stageId: string) {
    return this.drizzle.db
      .select()
      .from(crmDeals)
      .where(and(eq(crmDeals.tenantId, tenantId), eq(crmDeals.stageId, stageId)))
      .orderBy(desc(crmDeals.createdAt));
  }

  async createDeal(tenantId: string, data: { title: string; leadId?: string; stageId?: string; amount?: number | string; assignedTo?: string }) {
    const [deal] = await this.drizzle.db
      .insert(crmDeals)
      .values({
        tenantId,
        title: data.title,
        leadId: data.leadId,
        stageId: data.stageId,
        amount: data.amount?.toString() || '0',
        assignedTo: data.assignedTo,
        status: 'open',
      })
      .returning();
    return deal;
  }

  async updateDealStage(tenantId: string, dealId: string, stageId: string) {
    const [updated] = await this.drizzle.db
      .update(crmDeals)
      .set({ stageId, updatedAt: new Date() })
      .where(and(eq(crmDeals.id, dealId), eq(crmDeals.tenantId, tenantId)))
      .returning();
    
    // Trigger Automation: Notify manager if high value
    if (updated && Number(updated.amount) > 1000000000) {
      // Mock notification
      console.log('High value deal alert!');
    }
    
    return updated;
  }

  async getLeads(tenantId: string) {
    return this.drizzle.db
      .select()
      .from(leads)
      .where(eq(leads.tenantId, tenantId))
      .orderBy(desc(leads.createdAt));
  }

  async createLead(tenantId: string, data: any) {
    const [lead] = await this.drizzle.db
      .insert(leads)
      .values({
        tenantId,
        ...data,
      })
      .returning();
    return lead;
  }

  async updateLeadStatus(tenantId: string, leadId: string, status: string) {
    const [updated] = await this.drizzle.db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();
      
    if (!updated) {
      throw new NotFoundException('Lead not found');
    }
    return updated;
  }

  /**
   * Close the loop: Convert Won Deal to Sales Order
   */
  async convertToOrder(tenantId: string, dealId: string) {
    const [deal] = await this.drizzle.db
      .select()
      .from(crmDeals)
      .where(and(eq(crmDeals.id, dealId), eq(crmDeals.tenantId, tenantId)));

    if (!deal) throw new NotFoundException('Deal not found');

    // Create the order
    const [order] = await this.drizzle.db
      .insert(orders)
      .values({
        tenantId,
        customerId: deal.leadId, // Assuming lead is converted to customer or linked
        totalAmount: deal.amount,
        status: 'pending',
        orderNumber: `SO-FROM-DEAL-${dealId.slice(0, 8).toUpperCase()}`,
      })
      .returning();

    // Mark deal as won
    await this.drizzle.db
      .update(crmDeals)
      .set({ status: 'won', updatedAt: new Date() })
      .where(eq(crmDeals.id, dealId));

    return order;
  }
}
