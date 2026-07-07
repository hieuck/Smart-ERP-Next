import { getTableConfig } from 'drizzle-orm/pg-core';
import { marketingCampaigns, marketingSegments, leadScoringRules } from './marketing';

describe('marketing schema unique constraints', () => {
  it('enforces campaign name uniqueness per tenant', () => {
    const config = getTableConfig(marketingCampaigns);

    const nameUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'mkt_camp_tenant_name_unique'
    );

    expect(nameUnique).toBeDefined();
    expect(nameUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'name']);
  });

  it('enforces segment name uniqueness per tenant', () => {
    const config = getTableConfig(marketingSegments);

    const nameUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'mkt_seg_tenant_name_unique'
    );

    expect(nameUnique).toBeDefined();
    expect(nameUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'name']);
  });

  it('enforces lead scoring rule event uniqueness per tenant', () => {
    const config = getTableConfig(leadScoringRules);

    const eventUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'mkt_score_tenant_event_unique'
    );

    expect(eventUnique).toBeDefined();
    expect(eventUnique!.columns.map((col) => col.name)).toEqual(['tenant_id', 'event']);
  });
});
