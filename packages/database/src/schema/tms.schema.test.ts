import { getTableConfig } from 'drizzle-orm/pg-core';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { tmsTrips, tmsVehicles } from './tms';

describe('tms schema unique constraints', () => {
  it('enforces tripNumber uniqueness per tenant', () => {
    const config = getTableConfig(tmsTrips);

    const tripNumberUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'tms_trips_tenant_trip_number_unique'
    );

    expect(tripNumberUnique).toBeDefined();
    expect(tripNumberUnique?.columns.map((col) => col.name)).toEqual(['tenant_id', 'trip_number']);
  });

  it('enforces plateNumber uniqueness per tenant on tmsVehicles', () => {
    const config = getTableConfig(tmsVehicles);

    const plateNumberUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'tms_vehicles_tenant_plate_unique'
    );

    expect(plateNumberUnique).toBeDefined();
    expect(plateNumberUnique?.columns.map((col) => col.name)).toEqual(['tenant_id', 'plate_number']);
  });

  it('scopes the tmsVehicles plateNumber index by tenant in the migration', () => {
    const migrationPath = resolve(__dirname, '..', '..', 'drizzle', '0022_careful_umar.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('DROP INDEX "tms_veh_plate_idx"');
    expect(sql).toContain('CREATE INDEX "tms_veh_plate_idx" ON "tms_vehicles" USING btree ("tenant_id","plate_number")');
  });
});
