import { redactPIIForAuditLog } from '../common/interceptors/audit-log.interceptor';

describe('AuditLog PII redaction (pure function redactPIIForAuditLog)', () => {
  it('redacts sensitive fields from request body', () => {
    const body = {
      username: 'john_doe',
      password: 'secret123',
      email: '[email protected]',
      oldPassword: 'oldsecret',
      newPassword: 'newsecret',
      creditCard: '4111-1111-1111-1111',
      cvv: '123',
      ssn: '123-45-6789',
      apiKey: 'sk_live_abc123',
      normalField: 'keep-this',
      nested: {
        token: 'Bearer xyz789',
        inner: {
          secretKey: 'sk_test_xyz'
        }
      },
      list: [
        { id: 1, password: 'pass1' },
        { id: 2, password: 'pass2' }
      ]
    };

    const redacted = redactPIIForAuditLog(body);

    // Top level PII fields should be redacted
    expect(redacted.username).toBe('john_doe'); // not PII
    expect(redacted.password).toBe('***REDACTED***');
    expect(redacted.email).toBe('***REDACTED***');
    expect(redacted.oldPassword).toBe('***REDACTED***');
    expect(redacted.newPassword).toBe('***REDACTED***');
    expect(redacted.creditCard).toBe('***REDACTED***');
    expect(redacted.cvv).toBe('***REDACTED***');
    expect(redacted.ssn).toBe('***REDACTED***');
    expect(redacted.apiKey).toBe('***REDACTED***');
    expect(redacted.normalField).toBe('keep-this');

    // Nested objects
    expect(redacted.nested.token).toBe('***REDACTED***');
    expect(redacted.nested.inner.secretKey).toBe('***REDACTED***');

    // Arrays of objects
    expect(redacted.list[0].password).toBe('***REDACTED***');
    expect(redacted.list[1].password).toBe('***REDACTED***');
    expect(redacted.list[0].id).toBe(1);
  });

  it('does not modify non-object values', () => {
    expect(redactPIIForAuditLog('string')).toBe('string');
    expect(redactPIIForAuditLog(123)).toBe(123);
    expect(redactPIIForAuditLog(null)).toBeNull();
    expect(redactPIIForAuditLog(undefined)).toBeUndefined();
    expect(redactPIIForAuditLog(true)).toBe(true);
  });

  it('returns new object without mutating original', () => {
    const original = { password: 'secret', data: { key: 'value' } };
    const redacted = redactPIIForAuditLog(original);

    expect(redacted).not.toBe(original);
    expect(redacted.password).toBe('***REDACTED***');
    expect(redacted.data.key).toBe('value');
    expect(original.password).toBe('secret');
    expect(original.data.key).toBe('value');
  });

  it('handles empty object', () => {
    const redacted = redactPIIForAuditLog({});
    expect(redacted).toEqual({});
  });
});
