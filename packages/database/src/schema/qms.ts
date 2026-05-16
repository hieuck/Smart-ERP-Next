import { pgTable, uuid, text, timestamp, decimal, integer, index, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';
import { users } from './users';

export const qmsInspectionPlans = pgTable(
  'qms_inspection_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
      
    name: text('name').notNull(),
    description: text('description'),
    samplingRule: text('sampling_rule').default('AQL 1.0'),
    
    isActive: boolean('is_active').default(true),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('qms_plan_tenant_idx').on(t.tenantId),
    productIdx: index('qms_plan_product_idx').on(t.productId),
  })
);

export const qmsInspections = pgTable(
  'qms_inspections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    planId: uuid('plan_id').references(() => qmsInspectionPlans.id),
    
    referenceType: text('reference_type').notNull(), // 'production', 'purchase', 'supplier'
    referenceId: uuid('reference_id').notNull(),
    
    verdict: text('verdict', { enum: ['pass', 'fail', 'conditional'] }).notNull(),
    notes: text('notes'),
    
    inspectedBy: uuid('inspected_by').references(() => users.id),
    inspectionDate: timestamp('inspection_date').defaultNow().notNull(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('qms_insp_tenant_idx').on(t.tenantId),
    refIdx: index('qms_insp_ref_idx').on(t.referenceType, t.referenceId),
  })
);

export const qmsNcrs = pgTable(
  'qms_ncrs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    code: text('code').notNull().unique(),
    
    productId: uuid('product_id').references(() => products.id),
    defectCode: text('defect_code').notNull(),
    description: text('description').notNull(),
    rootCause: text('root_cause'),
    
    severity: text('severity', { enum: ['low', 'medium', 'high', 'critical'] }).default('medium'),
    status: text('status', { enum: ['open', 'investigating', 'closed'] }).default('open'),
    
    reportedBy: uuid('reported_by').references(() => users.id),
    reportedAt: timestamp('reported_at').defaultNow().notNull(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('qms_ncr_tenant_idx').on(t.tenantId),
    statusIdx: index('qms_ncr_status_idx').on(t.status),
  })
);

export type InspectionPlan = typeof qmsInspectionPlans.$inferSelect;
export type Inspection = typeof qmsInspections.$inferSelect;
export type NCR = typeof qmsNcrs.$inferSelect;
