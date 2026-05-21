// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { eq, and, sql } from '@smart-erp/database/drizzle';

@Injectable()
export class HelpdeskService {
  private async generateTicketNumber(tenantId: string): Promise<string> {
    const { serviceTickets: tickets } = await import('@smart-erp/database/schema');
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(tickets).where(eq(tickets.tenantId, tenantId));
    return `TKT-${String(count + 1).padStart(6, '0')}`;
  }

  async createTicket(tenantId: string, userId: string, dto: any) {
    const { serviceTickets: tickets, ticketHistory } = await import('@smart-erp/database/schema');
    const ticketNumber = await this.generateTicketNumber(tenantId);
    const [ticket] = await db.insert(tickets).values({
      ...dto,
      title: dto.title || dto.subject || 'Support ticket',
      tenantId,
      ticketNumber,
    }).returning();
    if (ticketHistory) {
      await db.insert(ticketHistory).values({ tenantId, ticketId: ticket.id, userId, action: 'created', newValue: 'open' });
    }
    return ticket;
  }

  async findAll(tenantId: string, query: { page?: number; limit?: number; status?: string; priority?: string; assigneeId?: number; customerId?: number }) {
    const { serviceTickets: tickets } = await import('@smart-erp/database/schema');
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;
    const conditions = [eq(tickets.tenantId, tenantId)];
    if (query.status) conditions.push(eq(tickets.status, query.status));
    if (query.priority) conditions.push(eq(tickets.priority, query.priority));
    if (query.assigneeId) conditions.push(eq(tickets.assignedTechnicianId, query.assigneeId));
    if (query.customerId) conditions.push(eq(tickets.customerId, query.customerId));
    const where = and(...conditions);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(tickets).where(where);
    const items = await db.select().from(tickets).where(where).orderBy(tickets.createdAt).limit(limit).offset(offset);
    return { items, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async findOne(tenantId: string, id: number) {
    const { serviceTickets: tickets } = await import('@smart-erp/database/schema');
    const [ticket] = await db.select().from(tickets).where(and(eq(tickets.tenantId, tenantId), eq(tickets.id, id)));
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async updateStatus(tenantId: string, userId: string, id: number, status: string) {
    const { serviceTickets: tickets, ticketHistory } = await import('@smart-erp/database/schema');
    const ticket = await this.findOne(tenantId, id);
    const [updated] = await db.update(tickets).set({ status, updatedAt: new Date(), ...(status === 'resolved' ? { resolvedAt: new Date() } : {}), ...(status === 'closed' ? { closedAt: new Date() } : {}) }).where(and(eq(tickets.tenantId, tenantId), eq(tickets.id, id))).returning();
    if (ticketHistory) {
      await db.insert(ticketHistory).values({ tenantId, ticketId: id, userId, action: 'status_changed', oldValue: ticket.status, newValue: status });
    }
    return updated;
  }

  async assignTicket(tenantId: string, userId: string, id: number, assigneeId: number) {
    const { serviceTickets: tickets, ticketHistory } = await import('@smart-erp/database/schema');
    const ticket = await this.findOne(tenantId, id);
    const [updated] = await db.update(tickets).set({ assignedTechnicianId: assigneeId, updatedAt: new Date() }).where(and(eq(tickets.tenantId, tenantId), eq(tickets.id, id))).returning();
    if (ticketHistory) {
      await db.insert(ticketHistory).values({ tenantId, ticketId: id, userId, action: 'assigned', oldValue: String(ticket.assignedTechnicianId || ''), newValue: String(assigneeId) });
    }
    return updated;
  }

  async addComment(tenantId: string, userId: string, ticketId: number, content: string, isInternal = false) {
    const { ticketComments } = await import('@smart-erp/database/schema');
    const ticket = await this.findOne(tenantId, ticketId);
    if (!ticketComments) return { ticketId, authorId: userId, content, isInternal };
    const [comment] = await db.insert(ticketComments).values({ tenantId, ticketId, authorId: userId, content, isInternal }).returning();
    return comment;
  }

  async getComments(tenantId: string, ticketId: number) {
    const { ticketComments } = await import('@smart-erp/database/schema');
    if (!ticketComments) return [];
    return db.select().from(ticketComments).where(and(eq(ticketComments.tenantId, tenantId), eq(ticketComments.ticketId, ticketId))).orderBy(ticketComments.createdAt);
  }

  async getHistory(tenantId: string, ticketId: number) {
    const { ticketHistory } = await import('@smart-erp/database/schema');
    if (!ticketHistory) return [];
    return db.select().from(ticketHistory).where(and(eq(ticketHistory.tenantId, tenantId), eq(ticketHistory.ticketId, ticketId))).orderBy(ticketHistory.createdAt);
  }

  async getStats(tenantId: string) {
    const { serviceTickets: tickets } = await import('@smart-erp/database/schema');
    const all = await db.select().from(tickets).where(eq(tickets.tenantId, tenantId));
    return { total: all.length, open: all.filter(t => t.status === 'open').length, inProgress: all.filter(t => t.status === 'in_progress').length, resolved: all.filter(t => t.status === 'resolved').length, closed: all.filter(t => t.status === 'closed').length, urgent: all.filter(t => t.priority === 'urgent' && t.status !== 'closed').length };
  }
}
