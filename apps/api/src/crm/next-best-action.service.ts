import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { crmLeads, crmOpportunities, customers, orders } from '@smart-erp/database/schema';
import { eq, and, sql, desc, gte } from '@smart-erp/database/drizzle';

interface LeadContext {
  id: string;
  source: string;
  industry?: string;
  emailOpens?: number;
  emailClicks?: number;
  websiteVisits?: number;
  totalSpent?: number;
  daysSinceLastContact?: number;
}

interface NextBestAction {
  action: 'call' | 'email' | 'meeting' | 'proposal' | 'follow_up';
  priority: number; // 0-100
  reason: string;
}

@Injectable()
export class NextBestActionService {
  private readonly models: Record<string, any> = {}; // store loaded ML models if any

  /**
   * Simple rule‑based + weighted scoring for demonstration.
   * In a real system, you would load a trained logistic regression
   * or decision tree model and run inference.
   */
  async getNextBestAction(leadId: string, tenantId: string): Promise<NextBestAction> {
    const lead = await db.select().from(crmLeads)
      .where(and(eq(crmLeads.id, leadId), eq(crmLeads.tenantId, tenantId)))
      .then(r => r[0]);
    if (!lead) throw new Error('Lead not found');

    const context = await this.buildContext(lead, tenantId);
    const scores = this.computeActionScores(context);
    const bestAction = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
    return {
      action: bestAction[0] as NextBestAction['action'],
      priority: Math.round(bestAction[1] * 100),
      reason: this.generateReason(bestAction[0], context),
    };
  }

  private async buildContext(lead: any, tenantId: string): Promise<LeadContext> {
    // fetch additional signals from CRM, orders, activity logs (simplified)
    const activityCounts = await db.execute(sql`
      SELECT
        COUNT(CASE WHEN type = 'email_open' THEN 1 END) as email_opens,
        COUNT(CASE WHEN type = 'email_click' THEN 1 END) as email_clicks,
        COUNT(CASE WHEN type = 'website_visit' THEN 1 END) as website_visits,
        EXTRACT(DAY FROM NOW() - MAX(created_at)) as days_since_last_contact
      FROM crm_activities
      WHERE lead_id = ${lead.id}
    `);
    const row = activityCounts.rows[0] as any;
    return {
      id: lead.id,
      source: lead.source,
      industry: lead.industry,
      emailOpens: Number(row?.email_opens ?? 0),
      emailClicks: Number(row?.email_clicks ?? 0),
      websiteVisits: Number(row?.website_visits ?? 0),
      daysSinceLastContact: Number(row?.days_since_last_contact ?? 999),
    };
  }

  private computeActionScores(ctx: LeadContext): Record<NextBestAction['action'], number> {
    let callScore = 0.2;
    let emailScore = 0.2;
    let meetingScore = 0.2;
    let proposalScore = 0.2;
    let followUpScore = 0.2;

    // rule scoring based on signals
    if (ctx.daysSinceLastContact > 14) {
      callScore += 0.4;
      emailScore += 0.2;
    } else if (ctx.daysSinceLastContact > 7) {
      followUpScore += 0.3;
    }
    if (ctx.emailOpens > 3 && ctx.emailClicks > 1) {
      emailScore += 0.5;
      proposalScore += 0.3;
    }
    if (ctx.websiteVisits > 5) {
      meetingScore += 0.4;
      proposalScore += 0.3;
    }
    if (ctx.source === 'referral' || ctx.source === 'trade_show') {
      callScore += 0.3;
      meetingScore += 0.2;
    }
    if (ctx.industry === 'manufacturing' || ctx.industry === 'wholesale') {
      meetingScore += 0.2;
      proposalScore += 0.2;
    }
    if (ctx.daysSinceLastContact < 3 && (ctx.emailOpens > 0 || ctx.websiteVisits > 0)) {
      followUpScore += 0.3;
    }

    // normalise
    const total = callScore + emailScore + meetingScore + proposalScore + followUpScore;
    return {
      call: callScore / total,
      email: emailScore / total,
      meeting: meetingScore / total,
      proposal: proposalScore / total,
      follow_up: followUpScore / total,
    };
  }

  private generateReason(action: string, ctx: LeadContext): string {
    switch (action) {
      case 'call':
        return `No contact for ${ctx.daysSinceLastContact} days. Source: ${ctx.source}.`;
      case 'email':
        return `High email engagement (opens: ${ctx.emailOpens}, clicks: ${ctx.emailClicks}).`;
      case 'meeting':
        return `High website activity (${ctx.websiteVisits} visits) and industry: ${ctx.industry}.`;
      case 'proposal':
        return `Strong interest signals (email + web activity). Ready for proposal.`;
      default:
        return 'Scheduled follow‑up recommended.';
    }
  }
}
