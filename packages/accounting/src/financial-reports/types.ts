export interface FinancialReportDTO {
  type: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'trial_balance';
  name: string;
  periodStart: Date;
  periodEnd: Date;
  currency?: string;
  unit?: string;
}

export interface BalanceSheet {
  assets: ReportSection;
  liabilities: ReportSection;
  equity: ReportSection;
  totalLiabilitiesAndEquity: number;
}

export interface IncomeStatement {
  revenues: ReportSection;
  expenses: ReportSection;
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
}

export interface CashFlowStatement {
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  netCashChange: number;
  openingBalance: number;
  closingBalance: number;
}

export interface ReportSection {
  items: ReportLine[];
  total: number;
}

export interface ReportLine {
  code: string;
  name: string;
  nameEn?: string;
  amount: number;
  level: number;
  isBold?: boolean;
  children?: ReportLine[];
}

export interface CashFlowSection {
  items: CashFlowItem[];
  total: number;
}

export interface CashFlowItem {
  code: string;
  name: string;
  amount: number;
  children?: CashFlowItem[];
}

export const REPORT_TYPES = {
  BALANCE_SHEET: 'balance_sheet',
  INCOME_STATEMENT: 'income_statement',
  CASH_FLOW: 'cash_flow',
  TRIAL_BALANCE: 'trial_balance',
} as const;