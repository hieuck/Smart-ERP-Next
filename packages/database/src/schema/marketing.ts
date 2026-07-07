import { pgTable, uuid, text, timestamp, decimal, integer, index, boolean, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const marketingCampaigns = pgTable(
  'marketing_campaigns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    name: text('name').notNull(),
    type: text('type', { enum: ['email', 'sms', 'social', 'ads'] }).notNull(),
    status: text('status', { enum: ['draft', 'scheduled', 'active', 'completed'] }).default('draft'),
    
    budget: decimal('budget', { precision: 20, scale: 2 }).default('0'),
    actualCost: decimal('actual_cost', { precision: 20, scale: 2 }).default('0'),
    
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    
    content: text('content'), // Template or Message content
    
    // Performance Metrics
    sentCount: integer('sent_count').default(0),
    openCount: integer('open_count').default(0),
    clickCount: integer('click_count').default(0),
    conversionCount: integer('conversion_count').default(0),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('mkt_camp_tenant_idx').on(t.tenantId),
    nameUnique: unique('mkt_camp_tenant_name_unique').on(t.tenantId, t.name),
  })
);

export const marketingSegments = pgTable(
  'marketing_segments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    name: text('name').notNull(),
    description: text('description'),
    
    // Dynamic Filter Query (JSON logic)
    filterCriteria: text('filter_criteria'), 
    
    memberCount: integer('member_count').default(0),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('mkt_seg_tenant_idx').on(t.tenantId),
    nameUnique: unique('mkt_seg_tenant_name_unique').on(t.tenantId, t.name),
  })
);

export const leadScoringRules = pgTable(
  'lead_scoring_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    event: text('event').notNull(), // e.g., 'email_open', 'form_submit', 'page_visit'
    points: integer('points').notNull(), // can be negative for 'unsubscribe'
    
    isActive: boolean('is_active').default(true),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('mkt_score_tenant_idx').on(t.tenantId),
    eventUnique: unique('mkt_score_tenant_event_unique').on(t.tenantId, t.event),
  })
);

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type MarketingSegment = typeof marketingSegments.$inferSelect;
export type LeadScoringRule = typeof leadScoringRules.$inferSelect;
