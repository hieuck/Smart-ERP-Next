/**
 * Accounting types — shared across API, Web, Mobile, Desktop
 */

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense';

export interface ChartOfAccount {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: AccountType;
  parentAccountId?: string;
  isActive: boolean;
  isGroup: boolean;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  voucherNumber: string;
  voucherDate: string;
  description: string;
  totalDebit: string;
  totalCredit: string;
  isPosted: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items?: JournalEntryItem[];
}

export interface JournalEntryItem {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountName?: string;
  debit: string;
  credit: string;
  memo?: string;
}

export interface AccountingDashboardData {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
  cashBalance: number;
  bankBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  revenueBreakdown: { category: string; amount: number }[];
  expenseBreakdown: { category: string; amount: number }[];
  monthlyCashflow: { month: string; income: number; expense: number }[];
}
