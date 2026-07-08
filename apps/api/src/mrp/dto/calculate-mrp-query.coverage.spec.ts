import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CalculateMRPQueryDto } from './calculate-mrp-query.dto';

describe('CalculateMRPQueryDto', () => {
  it('accepts a numeric daysAhead within 1-365', async () => {
    const dto = plainToInstance(CalculateMRPQueryDto, { daysAhead: '30' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.daysAhead).toBe(30);
  });

  it('accepts an empty query', async () => {
    const dto = plainToInstance(CalculateMRPQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.daysAhead).toBeUndefined();
  });

  it('rejects non-numeric daysAhead', async () => {
    const dto = plainToInstance(CalculateMRPQueryDto, { daysAhead: 'abc' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'daysAhead')).toBe(true);
  });

  it('rejects daysAhead below 1', async () => {
    const dto = plainToInstance(CalculateMRPQueryDto, { daysAhead: '-1' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'daysAhead')).toBe(true);
  });

  it('rejects daysAhead above 365', async () => {
    const dto = plainToInstance(CalculateMRPQueryDto, { daysAhead: '366' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'daysAhead')).toBe(true);
  });

  it('rejects zero daysAhead', async () => {
    const dto = plainToInstance(CalculateMRPQueryDto, { daysAhead: '0' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'daysAhead')).toBe(true);
  });
});
