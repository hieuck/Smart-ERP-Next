import { formatVND, formatNumber, formatDate } from '../src/utils/formatters';

describe('formatters', () => {
  it('formatVND formats number as Vietnamese currency', () => {
    expect(formatVND(1000000)).toContain('1.000.000');
  });

  it('formatVND returns 0 for zero', () => {
    expect(formatVND(0)).toContain('0');
  });

  it('formatNumber formats with Vietnamese locale', () => {
    expect(formatNumber(1234567)).toContain('1.234.567');
  });

  it('formatDate formats Date object', () => {
    const result = formatDate(new Date('2026-06-01'));
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formatDate formats string date', () => {
    const result = formatDate('2026-06-01');
    expect(result).toBeTruthy();
  });
});
