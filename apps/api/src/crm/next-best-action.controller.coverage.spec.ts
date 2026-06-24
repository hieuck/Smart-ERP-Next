import { NextBestActionController } from './next-best-action.controller';

describe('NextBestActionController coverage', () => {
  const user = { tenantId: 't1', sub: 'u1' };
  const nbaService = { getNextBestAction: jest.fn() };
  const ctrl = new NextBestActionController(nbaService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getForLead delegates to service', async () => {
    nbaService.getNextBestAction.mockResolvedValue({ action: 'call' });
    const result = await ctrl.getForLead('lead-1', user);
    expect(nbaService.getNextBestAction).toHaveBeenCalledWith('lead-1', 't1');
    expect(result).toEqual({ action: 'call' });
  });
});
