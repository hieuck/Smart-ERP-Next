import { pgTable, uuid, integer, date, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';

export const mrpForecasts = pgTable(
  'mrp_forecasts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    forecastDate: date('forecast_date').notNull(),
    forecastedDemand: integer('forecasted_demand').default(0),
    salesOrderDemand: integer('sales_order_demand').default(0),
    netRequirement: integer('net_requirement').default(0),
    suggestedProduction: integer('suggested_production').default(0),
    rawMaterialGap: integer('raw_material_gap').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('mrp_forecasts_tenant_idx').on(t.tenantId),
    productIdx: index('mrp_forecasts_product_idx').on(t.productId),
    tenantProductDateIdx: index('mrp_forecasts_tenant_product_date_idx').on(t.tenantId, t.productId, t.forecastDate),
    tenantProductDateUnique: unique('mrp_forecasts_tenant_product_date_unique').on(t.tenantId, t.productId, t.forecastDate),
  })
);

export type MrpForecast = typeof mrpForecasts.$inferSelect;
export type NewMrpForecast = typeof mrpForecasts.$inferInsert;
