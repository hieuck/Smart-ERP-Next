import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindOrdersQueryDto } from './find-orders-query.dto';

describe('FindOrdersQueryDto', () => {
  it('accepts valid pagination defaults', async () => {
    const dto = plainToInstance(FindOrdersQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it.each([
    ['abc', '20'],
    ['1', 'xyz'],
    ['abc', 'xyz'],
  ])('rejects non-numeric page=%s limit=%s', async (page, limit) => {
    const dto = plainToInstance(FindOrdersQueryDto, { page, limit });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts valid page and limit', async () => {
    const dto = plainToInstance(FindOrdersQueryDto, { page: '2', limit: '50' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
  });

  it('rejects page or limit below 1', async () => {
    const dto = plainToInstance(FindOrdersQueryDto, { page: '0', limit: '-1' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
