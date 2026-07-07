import { getTableConfig } from 'drizzle-orm/pg-core';
import { tmsTrips } from './tms';

describe('tms schema unique constraints', () => {
  it('enforces tripNumber uniqueness per tenant', () => {
    const config = getTableConfig(tmsTrips);

    const tripNumberUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'tms_trips_tenant_trip_number_unique'
    );

    expect(tripNumberUnique).toBeDefined();
    expect(tripNumberUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'trip_number']);
  });
});
