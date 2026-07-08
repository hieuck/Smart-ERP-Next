import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FindFixedAssetsQueryDto } from './find-fixed-assets-query.dto';

describe('FindFixedAssetsQueryDto', () => {
  it('accepts valid numeric page and limit strings', async () => {
    const dto = plainToInstance(FindFixedAssetsQueryDto, { page: '2', limit: '10', category: 'electronics', status: 'active' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('rejects non-numeric page', async () => {
    const dto = plainToInstance(FindFixedAssetsQueryDto, { page: 'abc' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('rejects zero and negative page', async () => {
    const dto = plainToInstance(FindFixedAssetsQueryDto, { page: '0' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('rejects non-numeric limit', async () => {
    const dto = plainToInstance(FindFixedAssetsQueryDto, { limit: 'xyz' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('accepts empty query', async () => {
    const dto = plainToInstance(FindFixedAssetsQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
