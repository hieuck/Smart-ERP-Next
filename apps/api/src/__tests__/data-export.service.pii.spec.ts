import { redactPII, PII_REDACTION_MASK } from '../exports/data-export.service';

interface RedactableRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  taxCode: string;
  nonSensitive: string;
}

describe('DataExportService PII redaction (pure function redactPII)', () => {
  it('redacts phone, email, and taxCode fields from customer rows', () => {
    const rows: RedactableRow[] = [
      {
        id: 'c1',
        name: 'Alice',
        phone: '+84-901-234-567',
        email: '[email protected]',
        taxCode: '123456789',
        nonSensitive: 'keep-me',
      },
    ];
    const redacted = redactPII('customers', rows);
    expect(redacted[0].id).toBe('c1');
    expect(redacted[0].name).toBe('Alice');
    expect(redacted[0].phone).toBe(PII_REDACTION_MASK);
    expect(redacted[0].email).toBe(PII_REDACTION_MASK);
    expect(redacted[0].taxCode).toBe(PII_REDACTION_MASK);
    expect(redacted[0].nonSensitive).toBe('keep-me');
  });

  it('redacts sensitive fields for suppliers as well', () => {
    const rows = [
      {
        id: 's1',
        name: 'Acme',
        phone: '0901',
        email: '[email protected]',
        taxCode: 'TAX-1',
      },
    ];
    const redacted = redactPII('suppliers', rows);
    expect(redacted[0].phone).toBe(PII_REDACTION_MASK);
    expect(redacted[0].email).toBe(PII_REDACTION_MASK);
    expect(redacted[0].taxCode).toBe(PII_REDACTION_MASK);
  });

  it('does not redact fields when entity is unknown', () => {
    const rows = [{ id: 'x', phone: '123', email: '[email protected]' }];
    const redacted = redactPII('unknownEntity', rows);
    expect(redacted[0].phone).toBe('123');
    expect(redacted[0].email).toBe('[email protected]');
  });

  it('handles empty array gracefully', () => {
    const redacted = redactPII('customers', []);
    expect(redacted).toEqual([]);
  });

  it('skips null/undefined values in rows', () => {
    const rows = [{ id: 'c2', name: 'Bob', phone: null, email: undefined, taxCode: '9' }];
    const redacted = redactPII('customers', rows);
    expect(redacted[0].phone).toBeNull();
    expect(redacted[0].email).toBeUndefined();
    expect(redacted[0].taxCode).toBe(PII_REDACTION_MASK);
  });
});
