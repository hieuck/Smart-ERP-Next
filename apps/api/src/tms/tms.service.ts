import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { tmsVehicles, tmsTrips, tmsTripStops, orders } from '@smart-erp/database/schema';
import { eq, and, sql, desc, asc } from '@smart-erp/database/drizzle';

@Injectable()
export class TmsService {
  async createTrip(tenantId: string, data: { tripNumber?: string; driverId?: string; vehicleId?: string; orderIds?: string[] }) {
    const tripNumber = data.tripNumber || `TRIP-${Date.now().toString(36).toUpperCase()}`;
    const [trip] = await db.insert(tmsTrips).values({
      tenantId,
      tripNumber,
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      status: 'planned',
    }).returning();

    if (data.orderIds && data.orderIds.length > 0) {
      for (let i = 0; i < data.orderIds.length; i++) {
        await db.insert(tmsTripStops).values({
          tenantId,
          tripId: trip.id,
          orderId: data.orderIds[i],
          sequence: i + 1,
          status: 'pending',
        });
      }
    }

    return trip;
  }

  async listTrips(tenantId: string, driverId?: string) {
    const conditions = [eq(tmsTrips.tenantId, tenantId)];
    if (driverId) conditions.push(eq(tmsTrips.driverId, driverId));

    return db
      .select()
      .from(tmsTrips)
      .where(and(...conditions))
      .orderBy(desc(tmsTrips.createdAt));
  }

  async getTripDetails(tenantId: string, tripId: string) {
    const [trip] = await db
      .select()
      .from(tmsTrips)
      .where(and(eq(tmsTrips.id, tripId), eq(tmsTrips.tenantId, tenantId)))
      .limit(1);

    if (!trip) throw new NotFoundException('Trip not found');

    const stops = await db
      .select()
      .from(tmsTripStops)
      .where(eq(tmsTripStops.tripId, tripId))
      .orderBy(asc(tmsTripStops.sequence));

    return { ...trip, stops };
  }

  async confirmDelivery(tenantId: string, stopId: string, podData: { podUrl?: string; signature?: string }) {
    const [stop] = await db
      .update(tmsTripStops)
      .set({ 
        status: 'delivered', 
        deliveryTime: new Date(),
        proofOfDeliveryUrl: podData.podUrl,
        customerSignature: podData.signature
      })
      .where(eq(tmsTripStops.id, stopId))
      .returning();
      
    // Update linked order status
    if (stop.orderId) {
      await db.update(orders)
        .set({ status: 'delivered', updatedAt: new Date() })
        .where(eq(orders.id, stop.orderId));
    }

    return stop;
  }

  async listVehicles(tenantId: string) {
    return db
      .select()
      .from(tmsVehicles)
      .where(eq(tmsVehicles.tenantId, tenantId));
  }
}
