import { SearchController } from './search.controller';

describe('SearchController coverage', () => {
  const req = { user: { tenantId: 't1', sub: 'u1' } };
  const service = {
    search: jest.fn(),
    autocomplete: jest.fn(),
  };
  const controller = new SearchController(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates search to service.search with default limit', () => {
    controller.search(req, 'invoices', undefined);
    expect(service.search).toHaveBeenCalledWith(req.user.tenantId, 'invoices', 20);
  });

  it('delegates search to service.search with custom limit', () => {
    controller.search(req, 'invoices', '5');
    expect(service.search).toHaveBeenCalledWith(req.user.tenantId, 'invoices', 5);
  });

  it('delegates autocomplete to service.autocomplete with default limit', () => {
    controller.autocomplete(req, 'inv', undefined);
    expect(service.autocomplete).toHaveBeenCalledWith(req.user.tenantId, 'inv', 10);
  });

  it('delegates autocomplete to service.autocomplete with custom limit', () => {
    controller.autocomplete(req, 'inv', '3');
    expect(service.autocomplete).toHaveBeenCalledWith(req.user.tenantId, 'inv', 3);
  });
});
