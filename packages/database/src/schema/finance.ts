import { pgTable, uuid, text, timestamp, decimal, integer, index, boolean, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const financeBudgets = pgTable(
  'finance_budgets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    name: text('name').notNull(),
    fiscalYear: integer('fiscal_year').notNull(),
    
    totalAmount: decimal('total_amount', { precision: 20, scale: 2 }).notNull(),
    currency: text('currency').default('VND'),
    
    status: text('status', { enum: ['draft', 'approved', 'closed'] }).default('draft'),
    
    managerId: uuid('manager_id').references(() => users.id),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('fin_bud_tenant_idx').on(t.tenantId),
    nameFiscalYearUnique: unique('fin_bud_name_fiscal_year_unique').on(t.tenantId, t.name, t.fiscalYear),
  })
);

export const financeBudgetLines = pgTable(
  'finance_budget_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => financeBudgets.id, { onDelete: 'cascade' }),
      
    category: text('category').notNull(), // e.g., 'marketing', 'it_infrastructure'
    plannedAmount: decimal('planned_amount', { precision: 20, scale: 2 }).notNull(),
    actualAmount: decimal('actual_amount', { precision: 20, scale: 2 }).default('0'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    budgetIdx: index('fin_bud_line_budget_idx').on(t.budgetId),
  })
);

export const financeCashflowForecasts = pgTable(
  'finance_cashflow_forecasts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    period: text('period').notNull(), // e.g., '2026-Q3'
    
    openingBalance: decimal('opening_balance', { precision: 20, scale: 2 }).notNull(),
    expectedInflow: decimal('expected_inflow', { precision: 20, scale: 2 }).notNull(),
    expectedOutflow: decimal('expected_outflow', { precision: 20, scale: 2 }).notNull(),
    
    netCashflow: decimal('net_cashflow', { precision: 20, scale: 2 }).notNull(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  }
);

export type FinanceBudget = typeof financeBudgets.$inferSelect;
export type FinanceBudgetLine = typeof financeBudgetLines.$inferSelect;
export type FinanceCashflowForecast = typeof financeCashflowForecasts.$inferSelect;
