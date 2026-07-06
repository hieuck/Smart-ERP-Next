import { BadRequestException } from '@nestjs/common';
import { LeadsController } from './leads.controller';

describe('LeadsController pagination validation', () => {
  const req = { user: { tenantId: 't1', sub: 'u1' } };
  const leadsService = {
    create: jest.fn(),
    findAll: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    getStats: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    convertToCustomer: jest.fn(),
  };
  const ctrl = new LeadsController(leadsService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes parsed positive page and limit to service', async () => {
    await ctrl.findAll(req, '3', '15', 'search', 'new', 'web', 'user-1');
    expect(leadsService.findAll).toHaveBeenCalledWith('t1', {
      page: 3,
      limit: 15,
      search: 'search',
      status: 'new',
      source: 'web',
      assignedToId: 'user-1',
    });
  });

  it('uses defaults when page and limit are omitted', async () => {
    await ctrl.findAll(req, undefined, undefined, undefined, undefined, undefined, undefined);
    expect(leadsService.findAll).toHaveBeenCalledWith('t1', {
      page: undefined,
      limit: undefined,
      search: undefined,
      status: undefined,
      source: undefined,
      assignedToId: undefined,
    });
  });

  it('throws BadRequestException when page is not a positive integer', async () => {
    expect(() => ctrl.findAll(req, 'abc')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when limit is not a positive integer', async () => {
    expect(() => ctrl.findAll(req, '1', '0')).toThrow(BadRequestException);
  });

  it('throws BadRequestException for negative limit', async () => {
    expect(() => ctrl.findAll(req, '1', '-5')).toThrow(BadRequestException);
  });
});
