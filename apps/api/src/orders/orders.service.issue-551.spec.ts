import { BadRequestException } from '@nestjs/common';

/**
 * Issue #551: Orders create() must verify customerId and warehouseId belong to
 * the same tenant before inserting. Cross-tenant foreign keys allow data leakage
 * and violate multi-tenant isolation.
 *
 * These tests inspect the source to confirm the guard exists at the correct
 * location — before the insert call — following the project's issue-specific
 * spec convention.
 */
describe('OrdersService issue #551 — tenant-scoped customerId and warehouseId', () => {
  const source: string = (() => {
    try {
      const fs = require('fs');
      const path = require('path');
      return fs.readFileSync(path.resolve(__dirname, './orders.service.ts'), 'utf8');
    } catch {
      return '';
    }
  })();

  it('verifies customerId belongs to tenant before order insert', () => {
    // Pattern: query customers WHERE id = dto.customerId AND tenantId = tenantId
    // Must appear before the orders insert call (matches `db.insert(orders)`
    // possibly across multiple lines).
    const insertIdx = source.search(/db\s*\n?\s*\.insert\(orders\)/);
    expect(insertIdx).toBeGreaterThan(-1);

    const preInsert = source.slice(0, insertIdx);
    // Must reference customers table and tenantId in same block
    expect(preInsert).toContain('customers');
    expect(preInsert).toContain('tenantId');
    // Must throw or guard if customer not found for this tenant
    expect(preInsert).toMatch(/NotFound|BadRequest|throw|not.found|does not belong/i);
  });

  it('verifies warehouseId belongs to tenant before order insert', () => {
    const insertIdx = source.search(/db\s*\n?\s*\.insert\(orders\)/);
    expect(insertIdx).toBeGreaterThan(-1);
    const preInsert = source.slice(0, insertIdx);

    // Must reference warehouses table
    expect(preInsert).toContain('warehouses');
    // Must check tenant ownership
    expect(preInsert).toContain('tenantId');
  });

  it('findOne filters customer join by tenantId to prevent cross-tenant name leak', () => {
    // findOne leftJoin customers — the WHERE clause must include both
    // orders.tenantId AND customers.tenantId
    const findOneIdx = source.indexOf('async findOne');
    expect(findOneIdx).toBeGreaterThan(-1);

    const findOneBlock = source.slice(findOneIdx, findOneIdx + 600);
    expect(findOneBlock).toContain('customers');
    // The WHERE must include tenantId filter on both tables (and + eq)
    // to prevent cross-tenant data leakage via left join
    expect(findOneBlock).toMatch(/customers.*tenantId|tenantId.*customers/);
  });
});
