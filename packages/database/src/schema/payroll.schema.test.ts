import { salaryBoards } from './payroll';
import { getTableConfig } from 'drizzle-orm/pg-core';

describe('payroll schema', () => {
  it('salaryBoards.year and salaryBoards.month are integer columns', () => {
    const config = getTableConfig(salaryBoards);
    const columns = Object.fromEntries(config.columns.map((c) => [c.name, c]));

    expect(columns.year.columnType).toBe('PgInteger');
    expect(columns.month.columnType).toBe('PgInteger');
  });
});
