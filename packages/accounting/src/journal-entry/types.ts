export interface JournalEntryDTO {
  id?: string;
  voucherTypeId?: string;
  voucherNumber?: string;
  voucherDate: Date | string;
  description?: string;
  reference?: string;
  lines: JournalEntryLineDTO[];
  attachments?: string[];
}

export interface JournalEntryLineDTO {
  id?: string;
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  costCenterId?: string;
  projectId?: string;
  partnerId?: string;
  taxRate?: number;
  taxAmount?: number;
  lineNumber?: string;
}

export interface JournalEntryWithLines extends JournalEntryDTO {
  lines: JournalEntryLineDTO[];
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
}

export interface PostingResult {
  success: boolean;
  entryId?: string;
  error?: string;
}

export const ACCOUNT_NATURES = {
  DEBIT: ['asset', 'expense'],
  CREDIT: ['liability', 'equity', 'revenue'],
} as const;