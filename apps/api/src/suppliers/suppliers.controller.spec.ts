import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SuppliersController } from './suppliers.controller';
import { PaginationParamsDto } from '../common/dto/pagination-params.dto';

describe('SuppliersController pagination validation', () => {
  let svc: { findAll: jest.Mock };
  let ctrl: SuppliersController;

  beforeEach(() => {
    svc = { findAll: jest.fn() };
    ctrl = new SuppliersController(svc as any);
  });

  it('rejects invalid page and limit via PaginationParamsDto', async () => {
    const dto = plainToInstance(PaginationParamsDto, { page: 'abc', limit: 'xyz' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const propertyNames = errors.map((e) => e.property);
    expect(propertyNames).toContain('page');
    expect(propertyNames).toContain('limit');
  });

  it('accepts valid page and limit via PaginationParamsDto', async () => {
    const dto = plainToInstance(PaginationParamsDto, { page: '1', limit: '10' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('delegates validated pagination to the service', async () => {
    svc.findAll.mockResolvedValue({ items: [], total: 0 });
    const req = { user: { tenantId: 't1' } };
    const pagination: PaginationParamsDto = { page: 1, limit: 10 };

    await ctrl.findAll(req as any, pagination, undefined, undefined);

    expect(svc.findAll).toHaveBeenCalledWith('t1', {
      page: 1,
      limit: 10,
      search: undefined,
      isActive: undefined,
    });
  });
});
