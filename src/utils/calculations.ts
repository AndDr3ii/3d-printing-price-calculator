import { BREAKDOWN_COLORS, CURRENCIES } from '../constants/defaults';
import type {
  BreakdownItem,
  CalculationResult,
  CalculatorState,
  CurrencyCode,
} from '../types/calculator';

/**
 * Ensures any numeric input is finite and strictly non-negative.
 * If undefined, null, NaN, or Infinity, returns 0 instead of crashing.
 */
function safeNonNegative(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    const parsed = typeof value === 'string' ? parseFloat(value) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return value > 0 ? value : 0;
}

export function calculatePrintPrice(state: CalculatorState): CalculationResult {
  const printHours = safeNonNegative(state.printHours);
  const printMinutes = safeNonNegative(state.printMinutes);
  const prepMinutes = safeNonNegative(state.preparationMinutes);
  const postMinutes = safeNonNegative(state.postProcessingMinutes);
  const laborRate = safeNonNegative(state.laborHourlyRate);

  const spoolPrice = safeNonNegative(state.spoolPrice);
  const spoolWeight = safeNonNegative(state.spoolWeight);
  const modelWeight = safeNonNegative(state.modelWeight);
  const failedMarkup = safeNonNegative(state.failedPrintsMarkup);

  const printerWatts = safeNonNegative(state.printerWatts);
  const electricityCostPerKwh = safeNonNegative(state.electricityCostPerKwh);

  const printerPrice = safeNonNegative(state.printerPurchasePrice);
  const investmentReturnYears = safeNonNegative(state.investmentReturnYears);
  const dailyCommercialUsage = safeNonNegative(state.dailyCommercialUsageHours);
  const repairCostPercent = safeNonNegative(state.repairCostPercent);

  // Sum of dynamic otherCosts list with safe parsing
  const extraConsumables = Array.isArray(state.otherCosts)
    ? state.otherCosts.reduce(
        (acc, item) => acc + (item ? safeNonNegative(item.cost) : 0),
        0
      )
    : 0;

  const profitMarkup = safeNonNegative(state.profitMarkup);
  // Cap transaction fee at 99.0% to strictly avoid divide-by-zero or negative gross-up
  const transactionFee = Math.min(safeNonNegative(state.transactionFee), 99.0);
  const vatPercent = safeNonNegative(state.vatPercent);
  const quantity = Math.max(1, Math.floor(safeNonNegative(state.quantity)) || 1);

  // 1. Time metrics
  const totalPrintHours = printHours + printMinutes / 60;
  const totalLaborHours = (prepMinutes + postMinutes) / 60;

  // 2. Material Cost (supports single-material and AMS Lite multicolor)
  let baseMaterialCost = 0;
  if (state.multiColorSlots && state.multiColorSlots.length > 1) {
    baseMaterialCost = state.multiColorSlots.reduce((acc, slot) => {
      const price = slot.customSpoolPrice ?? spoolPrice;
      const weight = slot.customSpoolWeight ?? spoolWeight;
      const rate = weight > 0 ? price / weight : 0;
      return acc + slot.usedGrams * rate;
    }, 0);
  } else {
    baseMaterialCost =
      spoolWeight > 0 ? (spoolPrice / spoolWeight) * modelWeight : 0;
  }
  const materialCost = baseMaterialCost * (1 + failedMarkup / 100);

  // 3. Labor Cost (toggled via laborEnabled)
  const laborCost = state.laborEnabled ? totalLaborHours * laborRate : 0;

  // 4. Electricity Cost (toggled via electricityEnabled)
  const electricityCost = state.electricityEnabled
    ? (printerWatts / 1000) * totalPrintHours * electricityCostPerKwh
    : 0;

  // 5. Machine & Upkeep / Depreciation (toggled via depreciationEnabled)
  // Prusa formula:
  // Total Lifetime Operating Hours = Investment_Years * 365 * Daily_Commercial_Usage
  // Total Lifetime Cost = Printer_Price * (1 + Repair_Cost_% / 100)
  // Hourly Machine Rate = Total Lifetime Cost / Total Lifetime Operating Hours
  let depreciationAndMaintenanceCost = 0;
  if (state.depreciationEnabled) {
    const totalOperatingHours =
      investmentReturnYears * 365 * dailyCommercialUsage;
    const totalLifetimeCost = printerPrice * (1 + repairCostPercent / 100);
    // Explicit divide-by-zero guard: if operating hours is 0, machine cost is 0
    const hourlyMachineRate =
      totalOperatingHours > 0 ? totalLifetimeCost / totalOperatingHours : 0;
    depreciationAndMaintenanceCost = hourlyMachineRate * totalPrintHours;
  }

  // 6. Total Production Cost
  const totalProductionCost =
    materialCost +
    laborCost +
    electricityCost +
    depreciationAndMaintenanceCost +
    extraConsumables;

  // 7. Subtotal with Profit Margin
  const subtotalWithProfit = totalProductionCost * (1 + profitMarkup / 100);
  const netProfitPerUnit = subtotalWithProfit - totalProductionCost;

  // 8. Selling Price before VAT (protected against fee = 100% via Math.min cap)
  const feeDenominator = 1 - transactionFee / 100;
  const sellingPricePreVat =
    feeDenominator > 0 ? subtotalWithProfit / feeDenominator : subtotalWithProfit;
  const transactionFeePerUnit = sellingPricePreVat - subtotalWithProfit;

  // 9. VAT / Tax application
  const vatPerUnit = sellingPricePreVat * (vatPercent / 100);
  const finalUnitSellingPrice = sellingPricePreVat + vatPerUnit;

  // 10. Batch totals (multiplied by quantity)
  const batchProductionCost = totalProductionCost * quantity;
  const batchSellingPrice = finalUnitSellingPrice * quantity;
  const batchNetProfit = netProfitPerUnit * quantity;

  // Percentages relative to finalUnitSellingPrice
  const pct = (amount: number): number =>
    finalUnitSellingPrice > 0 ? (amount / finalUnitSellingPrice) * 100 : 0;

  const breakdown: BreakdownItem[] = [
    {
      id: 'material',
      label: 'Material (incl. fail buffer)',
      unitAmount: materialCost,
      batchAmount: materialCost * quantity,
      percentage: pct(materialCost),
      color: BREAKDOWN_COLORS.material,
    },
    {
      id: 'labor',
      label: state.laborEnabled ? 'Labor (Prep & Post)' : 'Labor (Excluded)',
      unitAmount: laborCost,
      batchAmount: laborCost * quantity,
      percentage: pct(laborCost),
      color: BREAKDOWN_COLORS.labor,
    },
    {
      id: 'electricity',
      label: state.electricityEnabled ? 'Electricity' : 'Electricity (Excluded)',
      unitAmount: electricityCost,
      batchAmount: electricityCost * quantity,
      percentage: pct(electricityCost),
      color: BREAKDOWN_COLORS.electricity,
    },
    {
      id: 'depreciation',
      label: state.depreciationEnabled
        ? 'Machine & Upkeep'
        : 'Machine & Upkeep (Excluded)',
      unitAmount: depreciationAndMaintenanceCost,
      batchAmount: depreciationAndMaintenanceCost * quantity,
      percentage: pct(depreciationAndMaintenanceCost),
      color: BREAKDOWN_COLORS.depreciation,
    },
    {
      id: 'extra',
      label: 'Other Costs & Hardware',
      unitAmount: extraConsumables,
      batchAmount: extraConsumables * quantity,
      percentage: pct(extraConsumables),
      color: BREAKDOWN_COLORS.extra,
    },
    {
      id: 'profit',
      label: 'Net Profit',
      unitAmount: netProfitPerUnit,
      batchAmount: batchNetProfit,
      percentage: pct(netProfitPerUnit),
      color: BREAKDOWN_COLORS.profit,
    },
    {
      id: 'fee',
      label: 'Platform / Transaction Fee',
      unitAmount: transactionFeePerUnit,
      batchAmount: transactionFeePerUnit * quantity,
      percentage: pct(transactionFeePerUnit),
      color: BREAKDOWN_COLORS.fee,
    },
    {
      id: 'vat',
      label: `VAT / Tax (${vatPercent}%)`,
      unitAmount: vatPerUnit,
      batchAmount: vatPerUnit * quantity,
      percentage: pct(vatPerUnit),
      color: BREAKDOWN_COLORS.vat,
    },
  ];

  return {
    totalPrintHours,
    totalLaborHours,
    materialCost,
    laborCost,
    electricityCost,
    depreciationAndMaintenanceCost,
    extraConsumablesCost: extraConsumables,
    totalProductionCost,
    subtotalWithProfit,
    sellingPricePreFee: subtotalWithProfit,
    transactionFeePerUnit,
    sellingPricePreVat,
    vatPerUnit,
    finalUnitSellingPrice,
    netProfitPerUnit,
    batchProductionCost,
    batchSellingPrice,
    batchNetProfit,
    breakdown,
  };
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const { symbol } = CURRENCIES[currency] || { symbol: '$' };
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDuration(hoursDecimal: number): string {
  const safeHours = Number.isFinite(hoursDecimal) && hoursDecimal > 0 ? hoursDecimal : 0;
  const totalMinutes = Math.round(safeHours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function generateCustomerQuote(
  state: CalculatorState,
  result: CalculationResult
): string {
  const qty = Math.max(1, Math.floor(safeNonNegative(state.quantity)) || 1);
  const unitPrice = formatCurrency(result.finalUnitSellingPrice, state.currency);
  const totalPrice = formatCurrency(result.batchSellingPrice, state.currency);
  const materialName =
    state.filamentType === 'Custom' ? 'Custom Filament' : state.filamentType;

  const lines = [
    '3D PRINTING QUOTE',
    '──────────────────────────────',
    `Job: ${state.jobName || 'Custom Print Job'}`,
    `Material: ${materialName}`,
    `Part Weight: ${state.modelWeight} g (incl. supports)`,
    `Estimated Print Time: ${formatDuration(result.totalPrintHours)} per unit`,
    `Quantity: ${qty} ${qty === 1 ? 'unit' : 'units'}`,
    ...(state.vatPercent > 0 ? [`VAT / Tax: ${state.vatPercent}% included`] : []),
    '──────────────────────────────',
    `Unit Price: ${unitPrice}`,
    ...(qty > 1 ? [`Total Order Price: ${totalPrice}`] : [`Total Price: ${totalPrice}`]),
  ];

  return lines.join('\n');
}
