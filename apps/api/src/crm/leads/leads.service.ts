import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ErrorCode } from "../../common/errors/error-codes";
import { db } from "@smart-erp/database";
import { crmLeads } from "@smart-erp/database/schema";
import { eq, and, ilike, or, sql, desc } from "@smart-erp/database/drizzle";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { NotificationsGateway } from "../../notifications/notifications.gateway";
import { ActivityService } from "../../modules/activity/activity.service";

@Injectable()
export class LeadsService {
  constructor(
    private activityService: ActivityService,
    private notificationsGateway: NotificationsGateway,
  ) {}
  async create(tenantId: string, userId: string, dto: CreateLeadDto) {
    const [lead] = await db
      .insert(crmLeads)
      .values({
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        source: dto.source || 'other',
        status: dto.status || 'new',
        leadScore: dto.leadScore?.toString() || '0',
        industry: dto.industry,
        description: dto.description,
        assignedToId: dto.assignedToId,
        createdBy: userId,
      })
      .returning();

    // Log activity
    await this.activityService.log(tenantId, userId, 'created', 'lead', lead.id, {
      name: `${dto.firstName} ${dto.lastName}`,
      company: dto.company,
    });

    // Send real-time notification
    this.notificationsGateway.broadcastToTenant(tenantId, 'lead.created', {
      leadId: lead.id,
      name: `${dto.firstName} ${dto.lastName}`,
      createdBy: userId,
    });

    return lead;
  }

  async findAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      source?: string;
      assignedToId?: string;
    },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(crmLeads.tenantId, tenantId)];

    if (query.search) {
      conditions.push(
        or(
          ilike(crmLeads.firstName, `%${query.search}%`),
          ilike(crmLeads.lastName, `%${query.search}%`),
          ilike(crmLeads.email, `%${query.search}%`),
          ilike(crmLeads.company, `%${query.search}%`),
        )!,
      );
    }
    if (query.status) {
      conditions.push(eq(crmLeads.status, query.status));
    }
    if (query.source) {
      conditions.push(eq(crmLeads.source, query.source));
    }
    if (query.assignedToId) {
      conditions.push(eq(crmLeads.assignedToId, query.assignedToId));
    }

    const where = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmLeads)
      .where(where);

    const items = await db
      .select()
      .from(crmLeads)
      .where(where)
      .orderBy(desc(crmLeads.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async findOne(tenantId: string, id: string) {
    const [lead] = await db
      .select()
      .from(crmLeads)
      .where(and(eq(crmLeads.tenantId, tenantId), eq(crmLeads.id, id)));

    if (!lead) {
      throw new NotFoundException({ message: 'Lead not found', errorCode: ErrorCode.LEAD_NOT_FOUND });
    }
    return lead;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
    const existing = await this.findOne(tenantId, id);

    const [lead] = await db
      .update(crmLeads)
      .set({
        ...dto,
        leadScore: dto.leadScore?.toString(),
        updatedAt: new Date(),
      })
      .where(and(eq(crmLeads.tenantId, tenantId), eq(crmLeads.id, id)))
      .returning();

    // Log activity
    await this.activityService.log(tenantId, '', 'updated', 'lead', id, {
      changes: Object.keys(dto),
    });

    return lead;
  }

  async remove(tenantId: string, id: string) {
    const lead = await this.findOne(tenantId, id);

    await db
      .delete(crmLeads)
      .where(and(eq(crmLeads.tenantId, tenantId), eq(crmLeads.id, id)));

    // Log activity
    await this.activityService.log(tenantId, '', 'deleted', 'lead', id, {
      name: `${lead.firstName} ${lead.lastName}`,
    });

    return { success: true };
  }

  async getStats(tenantId: string) {
    const stats = await db
      .select({
        status: crmLeads.status,
        count: sql<number>`count(*)::int`,
      })
      .from(crmLeads)
      .where(eq(crmLeads.tenantId, tenantId))
      .groupBy(crmLeads.status);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const won = stats.find(s => s.status === 'won')?.count || 0;

    return {
      total,
      byStatus: stats,
      winRate: total > 0 ? Math.round((won / total) * 100) : 0,
    };
  }

  async convertToCustomer(tenantId: string, leadId: string, customerData?: Partial<CreateLeadDto>) {
    const lead = await this.findOne(tenantId, leadId);

    if (lead.status === 'won') {
      throw new BadRequestException("Lead already converted");
    }

    const [updatedLead] = await db
      .update(crmLeads)
      .set({
        status: 'won',
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(crmLeads.tenantId, tenantId), eq(crmLeads.id, leadId)))
      .returning();

    // Log activity
    await this.activityService.log(tenantId, '', 'updated', 'lead', leadId, {
      action: 'converted_to_customer',
      name: `${lead.firstName} ${lead.lastName}`,
    });

    // Send real-time notification
    this.notificationsGateway.broadcastToTenant(tenantId, 'lead.converted', {
      leadId: leadId,
      name: `${lead.firstName} ${lead.lastName}`,
    });

    return updatedLead;
  }
}
