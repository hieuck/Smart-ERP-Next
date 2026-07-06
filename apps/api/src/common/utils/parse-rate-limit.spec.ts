import { parsePositiveRateLimit } from './parse-rate-limit';

describe('parsePositiveRateLimit', () => {
  it('returns the default when the value is undefined', () => {
    expect(parsePositiveRateLimit(undefined, 200)).toBe(200);
  });

  it('returns the default when the value is empty', () => {
    expect(parsePositiveRateLimit('', 200)).toBe(200);
  });

  it('returns the default for whitespace-only values', () => {
    expect(parsePositiveRateLimit('   ', 200)).toBe(200);
  });

  it('parses a valid positive integer', () => {
    expect(parsePositiveRateLimit('500', 200)).toBe(500);
  });

  it('returns the default for non-numeric values', () => {
    expect(parsePositiveRateLimit('abc', 200)).toBe(200);
  });

  it('returns the default for NaN literal', () => {
    expect(parsePositiveRateLimit('NaN', 200)).toBe(200);
  });

  it('returns the default for zero', () => {
    expect(parsePositiveRateLimit('0', 200)).toBe(200);
  });

  it('returns the default for negative numbers', () => {
    expect(parsePositiveRateLimit('-10', 200)).toBe(200);
  });

  it('returns the default for decimal numbers', () => {
    expect(parsePositiveRateLimit('10.5', 200)).toBe(200);
  });

  it('returns the default for values exceeding safe integer range', () => {
    expect(parsePositiveRateLimit('9007199254740992', 200)).toBe(200);
  });

  it('returns the default for values with surrounding whitespace and non-digits', () => {
    expect(parsePositiveRateLimit(' 123abc', 200)).toBe(200);
  });
});
