export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

export type FilamentType =
  | 'PLA'
  | 'PETG'
  | 'ASA'
  | 'ABS'
  | 'TPU'
  | 'PC'
  | 'Custom';

export interface ExtraCostItem {
  id: string;
  name: string;
  cost: number;
}

export interface CalculatorState {
  // Job Info & Metadata
  jobName: string;

  // Section 1: Filament / Material
  currency: CurrencyCode;
  filamentType: FilamentType;
  spoolPrice: number;
  spoolWeight: number; // grams
  modelWeight: number; // grams (including supports)
  failedPrintsMarkup: number; // %

  // Section 2: Print Time & Labor (Optional toggle)
  laborEnabled: boolean;
  printHours: number;
  printMinutes: number;
  preparationMinutes: number;
  postProcessingMinutes: number;
  laborHourlyRate: number;

  // Section 3: Electricity (Optional toggle)
  electricityEnabled: boolean;
  printerWatts: number;
  electricityCostPerKwh: number;

  // Section 4: Machine & Upkeep / Depreciation (Optional toggle)
  depreciationEnabled: boolean;
  printerPurchasePrice: number;
  investmentReturnYears: number; // years (e.g. 1, 2, 3)
  dailyCommercialUsageHours: number; // 1 to 24 hours
  repairCostPercent: number; // % of purchase price (e.g. 10%)

  // Section 5: Additional Costs & Profit Markup
  otherCosts: ExtraCostItem[];
  profitMarkup: number; // %
  transactionFee: number; // %
  vatPercent: number; // % tax/IVA
  quantity: number;
}

export interface BreakdownItem {
  id:
    | 'material'
    | 'labor'
    | 'electricity'
    | 'depreciation'
    | 'extra'
    | 'profit'
    | 'fee'
    | 'vat';
  label: string;
  unitAmount: number;
  batchAmount: number;
  percentage: number; // percentage of Final_Unit_Selling_Price
  color: string;
}

export interface CalculationResult {
  totalPrintHours: number;
  totalLaborHours: number;
  materialCost: number;
  laborCost: number;
  electricityCost: number;
  depreciationAndMaintenanceCost: number;
  extraConsumablesCost: number;
  totalProductionCost: number;
  subtotalWithProfit: number;
  sellingPricePreFee: number;
  transactionFeePerUnit: number;
  sellingPricePreVat: number;
  vatPerUnit: number;
  finalUnitSellingPrice: number;
  netProfitPerUnit: number;
  // Batch totals (multiplied by quantity)
  batchProductionCost: number;
  batchSellingPrice: number;
  batchNetProfit: number;
  breakdown: BreakdownItem[];
}

export interface MaterialProfile {
  id: string;
  name: string;
  filamentType: FilamentType;
  spoolPrice: number;
  spoolWeight: number;
  failedPrintsMarkup: number;
}

export interface PrinterProfile {
  id: string;
  name: string;
  printerWatts: number;
  printerPurchasePrice: number;
  investmentReturnYears: number;
  dailyCommercialUsageHours: number;
  repairCostPercent: number;
}
