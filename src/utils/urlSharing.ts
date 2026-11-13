import { DEFAULT_STATE } from '../constants/defaults';
import type { CalculatorState } from '../types/calculator';

/**
 * Encodes the entire CalculatorState into a URL query parameter `?s=<base64>`
 */
export function serializeStateToUrl(state: CalculatorState): string {
  try {
    const jsonStr = JSON.stringify(state);
    // Use encodeURIComponent + btoa for safe utf-8 serialization
    const base64 = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.href);
    url.searchParams.set('s', base64);
    return url.toString();
  } catch {
    return typeof window !== 'undefined' ? window.location.href : '';
  }
}

/**
 * Attempts to decode a CalculatorState from the URL parameter `?s=<base64>`
 */
export function deserializeStateFromUrl(): Partial<CalculatorState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('s');
    if (!param) return null;
    const jsonStr = decodeURIComponent(atob(param));
    const parsed = JSON.parse(jsonStr) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Partial<CalculatorState>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clears the `?s=` state parameter from current browser URL without reloading
 */
export function clearUrlState(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('s')) {
      url.searchParams.delete('s');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  } catch {
    // ignore
  }
}

/**
 * Validates, repairs, and sanitizes any partial or corrupted state object.
 * Always guarantees all fields exist with valid types and numbers.
 */
export function sanitizeLoadedState(
  loaded: unknown
): CalculatorState {
  if (!loaded || typeof loaded !== 'object') {
    return { ...DEFAULT_STATE };
  }

  const obj = loaded as Partial<CalculatorState>;

  const safeNum = (val: unknown, fallback: number): number => {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };

  const safeBool = (val: unknown, fallback: boolean): boolean => {
    return typeof val === 'boolean' ? val : fallback;
  };

  const safeStr = (val: unknown, fallback: string): string => {
    return typeof val === 'string' ? val : fallback;
  };

  // Sanitize otherCosts array
  let safeOtherCosts = DEFAULT_STATE.otherCosts;
  if (Array.isArray(obj.otherCosts)) {
    safeOtherCosts = obj.otherCosts
      .filter((item) => item && typeof item === 'object')
      .map((item, idx) => ({
        id: typeof item.id === 'string' ? item.id : `item-${idx}-${Date.now()}`,
        name: typeof item.name === 'string' ? item.name : '',
        cost: safeNum(item.cost, 0),
      }));
  }

  return {
    jobName: safeStr(obj.jobName, DEFAULT_STATE.jobName),
    currency:
      obj.currency === 'USD' || obj.currency === 'EUR' || obj.currency === 'GBP'
        ? obj.currency
        : DEFAULT_STATE.currency,
    filamentType: typeof obj.filamentType === 'string' ? obj.filamentType : DEFAULT_STATE.filamentType,
    spoolPrice: safeNum(obj.spoolPrice, DEFAULT_STATE.spoolPrice),
    spoolWeight: Math.max(1, safeNum(obj.spoolWeight, DEFAULT_STATE.spoolWeight)),
    modelWeight: safeNum(obj.modelWeight, DEFAULT_STATE.modelWeight),
    failedPrintsMarkup: safeNum(obj.failedPrintsMarkup, DEFAULT_STATE.failedPrintsMarkup),

    laborEnabled: safeBool(obj.laborEnabled, DEFAULT_STATE.laborEnabled),
    printHours: safeNum(obj.printHours, DEFAULT_STATE.printHours),
    printMinutes: safeNum(obj.printMinutes, DEFAULT_STATE.printMinutes),
    preparationMinutes: safeNum(obj.preparationMinutes, DEFAULT_STATE.preparationMinutes),
    postProcessingMinutes: safeNum(obj.postProcessingMinutes, DEFAULT_STATE.postProcessingMinutes),
    laborHourlyRate: safeNum(obj.laborHourlyRate, DEFAULT_STATE.laborHourlyRate),

    electricityEnabled: safeBool(obj.electricityEnabled, DEFAULT_STATE.electricityEnabled),
    printerWatts: safeNum(obj.printerWatts, DEFAULT_STATE.printerWatts),
    electricityCostPerKwh: safeNum(obj.electricityCostPerKwh, DEFAULT_STATE.electricityCostPerKwh),

    depreciationEnabled: safeBool(obj.depreciationEnabled, DEFAULT_STATE.depreciationEnabled),
    printerPurchasePrice: safeNum(obj.printerPurchasePrice, DEFAULT_STATE.printerPurchasePrice),
    investmentReturnYears: Math.max(0.1, safeNum(obj.investmentReturnYears, DEFAULT_STATE.investmentReturnYears)),
    dailyCommercialUsageHours: Math.max(0.1, safeNum(obj.dailyCommercialUsageHours, DEFAULT_STATE.dailyCommercialUsageHours)),
    repairCostPercent: safeNum(obj.repairCostPercent, DEFAULT_STATE.repairCostPercent),

    otherCosts: safeOtherCosts,
    profitMarkup: safeNum(obj.profitMarkup, DEFAULT_STATE.profitMarkup),
    transactionFee: Math.min(99, safeNum(obj.transactionFee, DEFAULT_STATE.transactionFee)),
    vatPercent: safeNum(obj.vatPercent, DEFAULT_STATE.vatPercent),
    quantity: Math.max(1, Math.floor(safeNum(obj.quantity, DEFAULT_STATE.quantity)) || 1),
  };
}
