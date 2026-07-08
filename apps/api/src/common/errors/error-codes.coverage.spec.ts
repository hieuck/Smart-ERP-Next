import { ErrorCode, ErrorMessages } from './error-codes';

describe('ErrorCode', () => {
  it('has a message for every error code', () => {
    const codes = Object.values(ErrorCode) as ErrorCode[];
    for (const code of codes) {
      expect(ErrorMessages[code]).toBeDefined();
      expect(ErrorMessages[code].length).toBeGreaterThan(0);
    }
  });

  it('includes domain-specific not-found codes from issue #355', () => {
    expect(ErrorCode.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
    expect(ErrorCode.EMPLOYEE_NOT_FOUND).toBe('EMPLOYEE_NOT_FOUND');
    expect(ErrorCode.WAREHOUSE_NOT_FOUND).toBe('WAREHOUSE_NOT_FOUND');
    expect(ErrorCode.PROJECT_NOT_FOUND).toBe('PROJECT_NOT_FOUND');
    expect(ErrorCode.INVOICE_NOT_FOUND).toBe('INVOICE_NOT_FOUND');
    expect(ErrorCode.E_INVOICE_NOT_FOUND).toBe('E_INVOICE_NOT_FOUND');
    expect(ErrorCode.PURCHASE_ORDER_NOT_FOUND).toBe('PURCHASE_ORDER_NOT_FOUND');
    expect(ErrorCode.TENANT_NOT_FOUND).toBe('TENANT_NOT_FOUND');
    expect(ErrorCode.FIXED_ASSET_NOT_FOUND).toBe('FIXED_ASSET_NOT_FOUND');
    expect(ErrorCode.LEAD_NOT_FOUND).toBe('LEAD_NOT_FOUND');
  });

  it('provides human-readable messages for new not-found codes', () => {
    expect(ErrorMessages[ErrorCode.USER_NOT_FOUND]).toBe('User not found');
    expect(ErrorMessages[ErrorCode.EMPLOYEE_NOT_FOUND]).toBe('Employee not found');
    expect(ErrorMessages[ErrorCode.WAREHOUSE_NOT_FOUND]).toBe('Warehouse not found');
    expect(ErrorMessages[ErrorCode.PROJECT_NOT_FOUND]).toBe('Project not found');
    expect(ErrorMessages[ErrorCode.INVOICE_NOT_FOUND]).toBe('Invoice not found');
    expect(ErrorMessages[ErrorCode.E_INVOICE_NOT_FOUND]).toBe('E-Invoice not found');
    expect(ErrorMessages[ErrorCode.PURCHASE_ORDER_NOT_FOUND]).toBe('Purchase order not found');
    expect(ErrorMessages[ErrorCode.TENANT_NOT_FOUND]).toBe('Tenant not found');
  });
});
