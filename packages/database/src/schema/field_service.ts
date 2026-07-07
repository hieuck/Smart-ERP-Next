import { pgTable, uuid, text, timestamp, jsonb, decimal, index, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { users } from './users';

export const serviceTickets = pgTable(
  'service_tickets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    ticketNumber: text('ticket_number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
      
    // Trạng thái: open, assigned, in_progress, completed, cancelled
    status: text('status', {
      enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'],
    }).notNull().default('open'),
    
    priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).default('medium'),
    
    assignedTechnicianId: uuid('assigned_technician_id').references(() => users.id),
    
    // GPS Check-in data
    checkInTime: timestamp('check_in_time'),
    checkInLocation: jsonb('check_in_location'), // { lat, lng, address }
    
    // Completion data
    completedAt: timestamp('completed_at'),
    serviceReport: text('service_report'),
    customerSignatureUrl: text('customer_signature_url'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('service_tickets_tenant_idx').on(t.tenantId),
    customerIdx: index('service_tickets_customer_idx').on(t.customerId),
    technicianIdx: index('service_tickets_technician_idx').on(t.assignedTechnicianId),
    statusIdx: index('service_tickets_status_idx').on(t.status),
    ticketNumberUnique: unique('service_tickets_tenant_ticket_number_unique').on(t.tenantId, t.ticketNumber),
  })
);

export type ServiceTicket = typeof serviceTickets.$inferSelect;
export type NewServiceTicket = typeof serviceTickets.$inferInsert;
