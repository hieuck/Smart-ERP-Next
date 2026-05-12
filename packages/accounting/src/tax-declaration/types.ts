export interface TaxDeclarationDTO {
  id?: string;
  type: 'income_tax' | 'vat' | 'special_consumption' | 'withholding';
  period: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  totalAmount?: number;
  paymentDueDate?: Date;
  isPaid?: boolean;
  notes?: string;
}

export interface TaxSummary {
  type: string;
  period: string;
  taxableAmount: number;
  taxAmount: number;
  penalty: number;
  totalPayable: number;
}

export const TAX_TYPES = {
  INCOME_TAX: 'income_tax',
  VAT: 'vat',
  SPECIAL_CONSUMPTION: 'special_consumption',
  WITHHOLDING: 'withholding',
} as const;

export const TAX_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;