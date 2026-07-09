import { escapeCsvField, escapeCsvFormula } from './csv-escape';

describe('escapeCsvField', () => {
  it('does not change simple values', () => {
    expect(escapeCsvField('Product A')).toBe('Product A');
    expect(escapeCsvField('123')).toBe('123');
  });

  it('wraps values containing commas in quotes', () => {
    expect(escapeCsvField('Product, Inc.')).toBe('"Product, Inc."');
  });

  it('escapes double quotes by doubling them', () => {
    expect(escapeCsvField('5" Display')).toBe('"5"" Display"');
  });

  it('wraps values containing newlines in quotes', () => {
    expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
  });

  it('neutralizes formula-starting characters with a leading single quote', () => {
    expect(escapeCsvField('=CMD|\' /C calc\'!A0')).toBe("'" + "=CMD|' /C calc'!A0");
    expect(escapeCsvField('+1+1')).toBe("'+1+1");
    expect(escapeCsvField('-1-1')).toBe("'-1-1");
    expect(escapeCsvField('@SUM(A1)')).toBe("'@SUM(A1)");
  });
});

describe('escapeCsvFormula', () => {
  it('prefixes formula characters with a single quote', () => {
    expect(escapeCsvFormula('=1+1')).toBe("'=1+1");
    expect(escapeCsvFormula('+1')).toBe("'+1");
    expect(escapeCsvFormula('-1')).toBe("'-1");
    expect(escapeCsvFormula('@A1')).toBe("'@A1");
  });

  it('does not prefix safe values', () => {
    expect(escapeCsvFormula('Safe text')).toBe('Safe text');
    expect(escapeCsvFormula('100')).toBe('100');
  });
});
