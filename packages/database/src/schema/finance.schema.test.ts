import { getTableConfig } from 'drizzle-orm/pg-core';
import { financeBudgetLines, financeBudgets } from './finance';

describe('finance schema unique constraints', () => {
  it('enforces finance budget name + fiscal year uniqueness per tenant', () => {
    const config = getTableConfig(financeBudgets);

    const uniqueConstraint = config.uniqueConstraints.find(
      (uc) => uc.name === 'fin_bud_name_fiscal_year_unique'
    );

    expect(uniqueConstraint).toBeDefined();
    expect(uniqueConstraint?.columns.map((col) => col.name)).toEqual([
      'tenant_id',
      'name',
      'fiscal_year',
    ]);
  });

  it('enforces budget line category uniqueness per budget', () => {
    const config = getTableConfig(financeBudgetLines);

    const uniqueConstraint = config.uniqueConstraints.find(
      (uc) => uc.name === 'fin_bud_line_budget_category_unique'
    );

    expect(uniqueConstraint).toBeDefined();
    expect(uniqueConstraint?.columns.map((col) => col.name)).toEqual([
      'budget_id',
      'category',
    ]);
  });
});
