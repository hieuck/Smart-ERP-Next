export interface FixedAssetDTO {
  id?: string;
  assetCode: string;
  assetName: string;
  assetType: 'vehicle' | 'equipment' | 'building' | 'land' | 'furniture' | 'other';
  purchaseDate: Date;
  purchaseCost: number;
  usefulLifeMonths: number;
  residualValue?: number;
  depreciationMethod?: 'straight_line' | 'declining';
  notes?: string;
}

export interface DepreciationSchedule {
  assetId: string;
  assetCode: string;
  assetName: string;
  monthlyDepreciation: number;
  totalDepreciation: number;
  currentValue: number;
  schedules: DepreciationEntry[];
}

export interface DepreciationEntry {
  period: string; // YYYY-MM
  openingValue: number;
  depreciation: number;
  accumulatedDepreciation: number;
  closingValue: number;
}

export interface DisposalResult {
  assetId: string;
  disposalDate: Date;
  disposalValue: number;
  gainLoss: number;
  journalEntryId?: string;
}

export const ASSET_TYPES = {
  VEHICLE: 'vehicle',
  EQUIPMENT: 'equipment',
  BUILDING: 'building',
  LAND: 'land',
  FURNITURE: 'furniture',
  OTHER: 'other',
} as const;

export const DEPRECIATION_METHODS = {
  STRAIGHT_LINE: 'straight_line',
  DECLINING: 'declining',
} as const;