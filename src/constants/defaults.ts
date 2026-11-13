import type {
  CalculatorState,
  CurrencyCode,
  FilamentType,
  PrinterProfile,
} from '../types/calculator';

export const CURRENCIES: Record<
  CurrencyCode,
  { symbol: string; label: string; name: string }
> = {
  USD: { symbol: '$', label: 'USD ($)', name: 'US Dollar' },
  EUR: { symbol: '€', label: 'EUR (€)', name: 'Euro' },
  GBP: { symbol: '£', label: 'GBP (£)', name: 'British Pound' },
};

export const FILAMENT_PRESETS: Record<
  Exclude<FilamentType, 'Custom'>,
  {
    label: string;
    spoolPrice: number;
    spoolWeight: number;
    failedPrintsMarkup: number;
    note: string;
  }
> = {
  PLA: {
    label: 'PLA (Standard)',
    spoolPrice: 25.0,
    spoolWeight: 1000,
    failedPrintsMarkup: 10,
    note: 'Easy to print, low failure rate',
  },
  PETG: {
    label: 'PETG (Durable)',
    spoolPrice: 28.0,
    spoolWeight: 1000,
    failedPrintsMarkup: 12,
    note: 'Functional parts, slight stringing risk',
  },
  ASA: {
    label: 'ASA (UV / Outdoor)',
    spoolPrice: 35.0,
    spoolWeight: 1000,
    failedPrintsMarkup: 15,
    note: 'Requires enclosure, higher warp risk',
  },
  ABS: {
    label: 'ABS (Heat Resistant)',
    spoolPrice: 30.0,
    spoolWeight: 1000,
    failedPrintsMarkup: 15,
    note: 'Higher warping / adhesion failure buffer',
  },
  TPU: {
    label: 'TPU (Flexible)',
    spoolPrice: 38.0,
    spoolWeight: 1000,
    failedPrintsMarkup: 15,
    note: 'Slower print speeds, extruder jam buffer',
  },
  PC: {
    label: 'PC (Polycarbonate)',
    spoolPrice: 55.0,
    spoolWeight: 1000,
    failedPrintsMarkup: 20,
    note: 'Engineering grade, high temp & warp risk',
  },
};

export const BUILTIN_PRINTER_PRESETS: PrinterProfile[] = [
  {
    id: 'builtin-bambu-a1-combo',
    name: 'Bambu Lab A1 Combo (Default)',
    printerWatts: 100,
    printerPurchasePrice: 286.35,
    investmentReturnYears: 1,
    dailyCommercialUsageHours: 6,
    repairCostPercent: 10,
  },
  {
    id: 'builtin-bambu-a1-mini',
    name: 'Bambu Lab A1 Mini',
    printerWatts: 80,
    printerPurchasePrice: 200,
    investmentReturnYears: 1,
    dailyCommercialUsageHours: 6,
    repairCostPercent: 8,
  },
  {
    id: 'builtin-bambu-p1s-combo',
    name: 'Bambu Lab P1S Combo',
    printerWatts: 120,
    printerPurchasePrice: 750,
    investmentReturnYears: 1,
    dailyCommercialUsageHours: 8,
    repairCostPercent: 10,
  },
  {
    id: 'builtin-bambu-x1c-combo',
    name: 'Bambu Lab X1C Combo',
    printerWatts: 150,
    printerPurchasePrice: 1150,
    investmentReturnYears: 1,
    dailyCommercialUsageHours: 10,
    repairCostPercent: 10,
  },
];

export const DEFAULT_STATE: CalculatorState = {
  jobName: 'Custom 3D Print Job',

  currency: 'EUR',
  filamentType: 'PETG',
  spoolPrice: 10.23,
  spoolWeight: 1000,
  modelWeight: 50,
  failedPrintsMarkup: 10,

  laborEnabled: true,
  printHours: 3,
  printMinutes: 30,
  preparationMinutes: 15,
  postProcessingMinutes: 15,
  laborHourlyRate: 10.0,

  electricityEnabled: true,
  printerWatts: 100,
  electricityCostPerKwh: 0.15,

  depreciationEnabled: true,
  printerPurchasePrice: 286.35,
  investmentReturnYears: 1,
  dailyCommercialUsageHours: 6,
  repairCostPercent: 10,

  otherCosts: [
    { id: 'item-1', name: 'Packaging & Box', cost: 0.5 },
  ],
  profitMarkup: 30,
  transactionFee: 0,
  vatPercent: 0,
  quantity: 1,
};

export const BREAKDOWN_COLORS = {
  material: '#0071E3', // Apple System Blue
  labor: '#5E5CE6', // Apple System Indigo
  electricity: '#FF9F0A', // Apple System Amber / Orange
  depreciation: '#AF52DE', // Apple System Purple
  extra: '#FF2D55', // Apple System Pink
  profit: '#34C759', // Apple System Green / Mint
  fee: '#8E8E93', // Apple System Gray
  vat: '#64D2FF', // Apple System Teal / Cyan
} as const;

export const STORAGE_KEYS = {
  STATE: 'price_calc_state_v3',
  THEME: 'price_calc_theme_v1',
  MATERIAL_PROFILES: 'price_calc_material_profiles_v3',
  PRINTER_PROFILES: 'price_calc_printer_profiles_v3',
} as const;
