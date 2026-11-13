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

  // Selected spool id from inventory (optional)
  selectedSpoolId?: string;

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
  percentage: number;
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

/* ==========================================================
   SQLITE INVENTORY & HISTORY DATA TYPES
   ========================================================== */

export interface WorkshopSettings {
  id: number;
  currency: CurrencyCode;
  electricity_rate: number;
  labor_rate: number;
  packaging_cost: number;
  default_markup: number;
  failure_buffer: number;
  selected_printer_id?: string;
  printer_price: number;
  printer_power_w: number;
  daily_usage_hours: number;
  roi_years: number;
  repair_pct: number;
}

export interface FilamentSpool {
  id: string;
  code: string;
  brand: string;
  material: string;
  color_name: string;
  color_hex: string;
  initial_weight_g: number;
  remaining_weight_g: number;
  spool_price: number;
  created_at?: string;
}

export type RecordType = 'sale' | 'print_only';
export type SalesChannel = 'Vinted' | 'Wallapop' | 'Etsy' | 'Direct' | 'Internal' | 'Other';

export interface JobHistoryRecord {
  id: string;
  date: string;
  project_name: string;
  spool_id: string;
  spool_code?: string;
  spool_color_name?: string;
  spool_color_hex?: string;
  grams_used: number;
  print_minutes: number;
  quantity: number;
  production_cost: number;
  selling_price: number;
  net_profit: number;
  record_type: RecordType;
  sales_channel: SalesChannel;
  notes?: string;
}
