export interface ChartOfAccountDTO {
  id?: string;
  accountCode: string;
  accountName: string;
  accountNameEn?: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentId?: string;
  isActive?: boolean;
  description?: string;
  currency?: string;
}

export interface AccountTreeNode extends ChartOfAccountDTO {
  children?: AccountTreeNode[];
  balance?: number;
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'debit' | 'credit';
}

export const ACCOUNT_TYPES = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  EQUITY: 'equity',
  REVENUE: 'revenue',
  EXPENSE: 'expense',
} as const;

export const DEFAULT_ACCOUNTS = {
  ASSET: [
    { code: '1111', name: 'Tiền mặt', nameEn: 'Cash' },
    { code: '1121', name: 'Ngân hàng', nameEn: 'Bank' },
    { code: '1311', name: 'Phải thu khách hàng', nameEn: 'Accounts Receivable' },
    { code: '1521', name: 'Nguyên vật liệu', nameEn: 'Raw Materials' },
    { code: '1531', name: 'Thành phẩm', nameEn: 'Finished Goods' },
    { code: '1561', name: 'Hàng hóa', nameEn: 'Merchandise' },
  ],
  LIABILITY: [
    { code: '3111', name: 'Vay ngắn hạn', nameEn: 'Short-term Loans' },
    { code: '3311', name: 'Phải trả người bán', nameEn: 'Accounts Payable' },
    { code: '3331', name: 'Thuế phải nộp', nameEn: 'Taxes Payable' },
  ],
  EQUITY: [
    { code: '4111', name: 'Vốn góp', nameEn: 'Owner Capital' },
    { code: '4211', name: 'Lợi nhuận chưa phân phối', nameEn: 'Retained Earnings' },
  ],
  REVENUE: [
    { code: '5111', name: 'Doanh thu bán hàng', nameEn: 'Sales Revenue' },
    { code: '5121', name: 'Doanh thu cung cấp dịch vụ', nameEn: 'Service Revenue' },
  ],
  EXPENSE: [
    { code: '6111', name: 'Giá vốn hàng bán', nameEn: 'Cost of Goods Sold' },
    { code: '6321', name: 'Chi phí quản lý', nameEn: 'Management Expense' },
  ],
};