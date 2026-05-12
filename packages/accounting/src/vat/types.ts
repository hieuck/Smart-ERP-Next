export interface VatRateDTO {
  id?: string;
  code: string;
  name: string;
  rate: number;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  applicableFrom?: Date;
  applicableTo?: Date;
}

export interface VatDeclarationDTO {
  id?: string;
  period: string;
  declarationType: 'monthly' | 'quarterly';
  lines?: VatDeclarationLineDTO[];
  notes?: string;
}

export interface VatDeclarationLineDTO {
  id?: string;
  vatDeclarationId?: string;
  vatRateId: string;
  taxableAmount: number;
  vatAmount: number;
  invoiceNumber?: string;
  invoiceDate?: Date;
  partnerName?: string;
  taxAuthorityNumber?: string;
}

export interface VatReport {
  period: string;
  outputVat: {
    totalSales: number;
    taxableAmount: number;
    vatAmount: number;
  };
  inputVat: {
    totalPurchases: number;
    taxableAmount: number;
    vatAmount: number;
  };
  payableVat: number;
}

export const DEFAULT_VAT_RATES = [
  { code: 'KCT', name: 'Không chịu thuế', rate: 0 },
  { code: '0', name: 'Thuế suất 0%', rate: 0 },
  { code: '5', name: 'Thuế suất 5%', rate: 5 },
  { code: '10', name: 'Thuế suất 10%', rate: 10 },
];