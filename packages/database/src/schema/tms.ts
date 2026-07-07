import { pgTable, uuid, text, timestamp, decimal, integer, index, boolean, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { orders } from './orders';

export const tmsVehicles = pgTable(
  'tms_vehicles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    plateNumber: text('plate_number').notNull(),
    model: text('model'),
    type: text('type'), // e.g., 'truck_5t', 'van'
    capacity: decimal('capacity', { precision: 10, scale: 2 }), // Weight or volume
    
    isActive: boolean('is_active').default(true),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('tms_veh_tenant_idx').on(t.tenantId),
    plateIdx: index('tms_veh_plate_idx').on(t.plateNumber),
  })
);

export const tmsTrips = pgTable(
  'tms_trips',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    tripNumber: text('trip_number').notNull(),
    status: text('status', { enum: ['planned', 'in_transit', 'completed', 'cancelled'] }).default('planned'),
    
    vehicleId: uuid('vehicle_id').references(() => tmsVehicles.id),
    driverId: uuid('driver_id').references(() => users.id),
    
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('tms_trip_tenant_idx').on(t.tenantId),
    statusIdx: index('tms_trip_status_idx').on(t.status),
    tripNumberUnique: unique('tms_trips_tenant_trip_number_unique').on(t.tenantId, t.tripNumber),
  })
);

export const tmsTripStops = pgTable(
  'tms_trip_stops',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    tripId: uuid('trip_id')
      .notNull()
      .references(() => tmsTrips.id, { onDelete: 'cascade' }),
      
    orderId: uuid('order_id').references(() => orders.id),
    
    sequence: integer('sequence').notNull(), // Order of stops
    status: text('status', { enum: ['pending', 'arrived', 'delivered', 'failed'] }).default('pending'),
    
    proofOfDeliveryUrl: text('pod_url'), // Image of signature/package
    customerSignature: text('signature_name'),
    
    arrivalTime: timestamp('arrival_time'),
    deliveryTime: timestamp('delivery_time'),
  },
  (t) => ({
    tripIdx: index('tms_stop_trip_idx').on(t.tripId),
  })
);

export type TmsVehicle = typeof tmsVehicles.$inferSelect;
export type TmsTrip = typeof tmsTrips.$inferSelect;
export type TmsTripStop = typeof tmsTripStops.$inferSelect;
