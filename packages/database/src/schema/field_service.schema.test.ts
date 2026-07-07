import { getTableConfig } from 'drizzle-orm/pg-core';
import { serviceTickets } from './field_service';

describe('serviceTickets schema unique constraints', () => {
  it('enforces ticketNumber uniqueness per tenant', () => {
    const config = getTableConfig(serviceTickets);

    const ticketNumberUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'service_tickets_tenant_ticket_number_unique'
    );

    expect(ticketNumberUnique).toBeDefined();
    expect(ticketNumberUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'ticket_number']);
  });
});
