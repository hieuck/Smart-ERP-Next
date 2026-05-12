export interface VoucherTypeDTO {
  id?: string;
  code: string;
  name: string;
  nameEn?: string;
  category: 'payment' | 'receipt' | 'journal' | 'invoice' | 'credit_note' | 'debit_note';
  description?: string;
  isActive?: boolean;
  autoNumber?: boolean;
  prefix?: string;
  numberSequence?: string;
  requiredFields?: string[];
  optionalFields?: string[];
}

export const VOUCHER_CATEGORIES = {
  PAYMENT: 'payment',
  RECEIPT: 'receipt',
  JOURNAL: 'journal',
  INVOICE: 'invoice',
  CREDIT_NOTE: 'credit_note',
  DEBIT_NOTE: 'debit_note',
} as const;

export const DEFAULT_VOUCHER_TYPES = [
  { code: 'PT', name: 'Phiếu thu', category: 'receipt' },
  { code: 'PC', name: 'Phiếu chi', category: 'payment' },
  { code: 'BC', name: 'Bút toán', category: 'journal' },
  { code: 'HD', name: 'Hóa đơn', category: 'invoice' },
];