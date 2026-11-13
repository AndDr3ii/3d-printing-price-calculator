import {
  Clock,
  Cpu,
  FileText,
  Layers,
  Moon,
  PackagePlus,
  Printer,
  Sun,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CollapsibleSection } from './components/CollapsibleSection';
import { DynamicOtherCosts } from './components/DynamicOtherCosts';
import { GCodeUpload } from './components/GCodeUpload';
import { NumberField } from './components/NumberField';
import { PrintInvoice } from './components/PrintInvoice';
import { ProfileManager } from './components/ProfileManager';
import { SummaryDashboard } from './components/SummaryDashboard';
import { Tooltip } from './components/Tooltip';
import {
  BUILTIN_PRINTER_PRESETS,
  CURRENCIES,
  DEFAULT_STATE,
  FILAMENT_PRESETS,
  STORAGE_KEYS,
} from './constants/defaults';
import type {
  CalculatorState,
  CurrencyCode,
  FilamentType,
  MaterialProfile,
  PrinterProfile,
} from './types/calculator';
import {
  calculatePrintPrice,
  formatCurrency,
  formatDuration,
} from './utils/calculations';
import {
  clearUrlState,
  deserializeStateFromUrl,
  sanitizeLoadedState,
} from './utils/urlSharing';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = loadFromStorage<'light' | 'dark' | null>(
      STORAGE_KEYS.THEME,
      null
    );
    if (saved === 'light' || saved === 'dark') return saved;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  });

  const [state, setState] = useState<CalculatorState>(() => {
    // 1. Check if URL contains serialized state `?s=...`
    const urlState = deserializeStateFromUrl();
    if (urlState) {
      return sanitizeLoadedState(urlState);
    }
    // 2. Check localStorage
    const saved = loadFromStorage<Partial<CalculatorState> | null>(
      STORAGE_KEYS.STATE,
      null
    );
    return sanitizeLoadedState(saved);
  });

  const [materialProfiles, setMaterialProfiles] = useState<MaterialProfile[]>(
    () =>
      loadFromStorage<MaterialProfile[]>(STORAGE_KEYS.MATERIAL_PROFILES, [])
  );

  const [printerProfiles, setPrinterProfiles] = useState<PrinterProfile[]>(() =>
    loadFromStorage<PrinterProfile[]>(STORAGE_KEYS.PRINTER_PROFILES, [])
  );

  const [activeMaterialProfileId, setActiveMaterialProfileId] = useState<
    string | undefined
  >(undefined);
  const [activePrinterProfileId, setActivePrinterProfileId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.MATERIAL_PROFILES,
        JSON.stringify(materialProfiles)
      );
    } catch {
      // ignore
    }
  }, [materialProfiles]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.PRINTER_PROFILES,
        JSON.stringify(printerProfiles)
      );
    } catch {
      // ignore
    }
  }, [printerProfiles]);

  const result = useMemo(() => calculatePrintPrice(state), [state]);
  const currencySymbol = CURRENCIES[state.currency].symbol;

  const updateField = <K extends keyof CalculatorState>(
    key: K,
    value: CalculatorState[K]
  ) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilamentPresetChange = (nextType: FilamentType) => {
    setActiveMaterialProfileId(undefined);
    if (nextType === 'Custom') {
      updateField('filamentType', 'Custom');
      return;
    }
    const preset = FILAMENT_PRESETS[nextType];
    setState((prev) => ({
      ...prev,
      filamentType: nextType,
      spoolPrice: preset.spoolPrice,
      spoolWeight: preset.spoolWeight,
      failedPrintsMarkup: preset.failedPrintsMarkup,
    }));
  };

  const handleSaveMaterialProfile = (name: string) => {
    const newProfile: MaterialProfile = {
      id: `mat-${Date.now()}`,
      name,
      filamentType: state.filamentType,
      spoolPrice: state.spoolPrice,
      spoolWeight: state.spoolWeight,
      failedPrintsMarkup: state.failedPrintsMarkup,
    };
    setMaterialProfiles((prev) => [...prev, newProfile]);
    setActiveMaterialProfileId(newProfile.id);
  };

  const handleSelectMaterialProfile = (profile: MaterialProfile) => {
    setActiveMaterialProfileId(profile.id);
    setState((prev) => ({
      ...prev,
      filamentType: profile.filamentType,
      spoolPrice: profile.spoolPrice,
      spoolWeight: profile.spoolWeight,
      failedPrintsMarkup: profile.failedPrintsMarkup,
    }));
  };

  const handleDeleteMaterialProfile = (id: string) => {
    setMaterialProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activeMaterialProfileId === id) {
      setActiveMaterialProfileId(undefined);
    }
  };

  const handleSavePrinterProfile = (name: string) => {
    const newProfile: PrinterProfile = {
      id: `prt-${Date.now()}`,
      name,
      printerWatts: state.printerWatts,
      printerPurchasePrice: state.printerPurchasePrice,
      investmentReturnYears: state.investmentReturnYears,
      dailyCommercialUsageHours: state.dailyCommercialUsageHours,
      repairCostPercent: state.repairCostPercent,
    };
    setPrinterProfiles((prev) => [...prev, newProfile]);
    setActivePrinterProfileId(newProfile.id);
  };

  const handleSelectPrinterProfile = (profile: PrinterProfile) => {
    setActivePrinterProfileId(profile.id);
    setState((prev) => ({
      ...prev,
      printerWatts: profile.printerWatts,
      printerPurchasePrice: profile.printerPurchasePrice,
      investmentReturnYears: profile.investmentReturnYears,
      dailyCommercialUsageHours: profile.dailyCommercialUsageHours,
      repairCostPercent: profile.repairCostPercent,
    }));
  };

  const handleDeletePrinterProfile = (id: string) => {
    setPrinterProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activePrinterProfileId === id) {
      setActivePrinterProfileId(undefined);
    }
  };

  const handleReset = () => {
    clearUrlState();
    setState(DEFAULT_STATE);
    setActiveMaterialProfileId(undefined);
    setActivePrinterProfileId(undefined);
  };

  const handleGCodeAutofill = (data: {
    hours: number;
    minutes: number;
    weight: number;
    slicer?: string;
    projectName?: string;
  }) => {
    setState((prev) => ({
      ...prev,
      printHours: data.hours,
      printMinutes: data.minutes,
      ...(data.weight > 0 ? { modelWeight: data.weight } : {}),
      ...(data.projectName ? { jobName: data.projectName } : {}),
    }));
  };

  return (
    <div className="app-shell">
      {/* Hidden during normal view, rendered when printing / exporting PDF */}
      <PrintInvoice state={state} result={result} />

      <header className="app-header">
        <div className="header-inner">
          <div className="brand-block">
            <div className="brand-logo" aria-hidden="true">
              <Printer size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="brand-title">3D Printing Price Calculator</h1>
              <p className="brand-subtitle">
                True-cost 3D printing pricing &amp; margin calculator
              </p>
            </div>
          </div>

          <div className="header-controls">
            <div
              className="currency-segmented"
              role="group"
              aria-label="Select currency"
            >
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`currency-btn ${
                    state.currency === code ? 'is-active' : ''
                  }`}
                  onClick={() => updateField('currency', code)}
                >
                  {CURRENCIES[code].label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() =>
                setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
              }
              aria-label={`Switch to ${
                theme === 'light' ? 'dark' : 'light'
              } mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-grid">
        {/* Left Column: Organized Collapsible Input Sections */}
        <div className="inputs-column">
          {/* Top Section: Job Name & G-Code File Autofill */}
          <section className="calc-card job-info-card">
            <div className="job-info-header">
              <div className="calc-card-title-wrap">
                <span className="step-icon-badge" aria-hidden="true">
                  <FileText size={18} />
                </span>
                <div className="calc-card-headings">
                  <h2 className="calc-card-title">Project &amp; Print Information</h2>
                  <p className="calc-card-subtitle">
                    Job name, client reference, and G-Code auto-parsing
                  </p>
                </div>
              </div>
            </div>

            <div className="job-info-body">
              <div className="field-group">
                <div className="field-label-row">
                  <label htmlFor="job-name-input" className="field-label">
                    Project / Job Name
                  </label>
                  <Tooltip
                    text="Title of this print project or client reference name (appears on customer quotes and exported PDFs)."
                    label="Info about Job Name"
                  />
                </div>
                <input
                  id="job-name-input"
                  type="text"
                  className="field-input"
                  placeholder="e.g., Drone Frame V2 — Client ACME Corp"
                  value={state.jobName}
                  onChange={(e) => updateField('jobName', e.target.value)}
                />
              </div>

              <GCodeUpload onAutofill={handleGCodeAutofill} />
            </div>
          </section>

          {/* Section 1: Filament / Material */}
          <CollapsibleSection
            stepNumber={1}
            title="Filament / Material"
            subtitle="Spool cost, part weight, and failure buffer"
            badgeText={formatCurrency(result.materialCost, state.currency)}
            icon={<Layers size={18} />}
          >
            <div className="field-grid-2">
              <div className="field-group">
                <div className="field-label-row">
                  <label htmlFor="currency-select" className="field-label">
                    Currency
                  </label>
                  <Tooltip
                    text="Choose the currency used for all cost inputs and price quotes."
                    label="Info about Currency"
                  />
                </div>
                <select
                  id="currency-select"
                  className="field-select"
                  value={state.currency}
                  onChange={(e) =>
                    updateField('currency', e.target.value as CurrencyCode)
                  }
                >
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <option key={code} value={code}>
                      {CURRENCIES[code].label} — {CURRENCIES[code].name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <div className="field-label-row">
                  <label htmlFor="filament-type" className="field-label">
                    Filament Type / Preset
                  </label>
                  <Tooltip
                    text="Select a material to auto-fill typical spool price, weight, and failure rate buffer, or choose Custom."
                    label="Info about Filament Type"
                  />
                </div>
                <select
                  id="filament-type"
                  className="field-select"
                  value={state.filamentType}
                  onChange={(e) =>
                    handleFilamentPresetChange(e.target.value as FilamentType)
                  }
                >
                  {(
                    Object.keys(FILAMENT_PRESETS) as Array<
                      Exclude<FilamentType, 'Custom'>
                    >
                  ).map((key) => (
                    <option key={key} value={key}>
                      {FILAMENT_PRESETS[key].label}
                    </option>
                  ))}
                  <option value="Custom">Custom Material</option>
                </select>
              </div>
            </div>

            <div className="field-grid-2">
              <NumberField
                id="spool-price"
                label="Spool Price"
                value={state.spoolPrice}
                onChange={(val) => {
                  setActiveMaterialProfileId(undefined);
                  updateField('spoolPrice', val);
                }}
                prefix={currencySymbol}
                step={0.5}
                tooltip="Total purchase price of one filament spool (before shipping or after shipping—be consistent)."
              />

              <NumberField
                id="spool-weight"
                label="Spool Weight"
                value={state.spoolWeight}
                onChange={(val) => {
                  setActiveMaterialProfileId(undefined);
                  updateField('spoolWeight', val);
                }}
                suffix="g"
                min={1}
                step={50}
                tooltip="Net filament weight on a full spool in grams (most standard spools are 1000 g or 750 g)."
              />

              <NumberField
                id="model-weight"
                label="Model Weight (incl. supports)"
                value={state.modelWeight}
                onChange={(val) => updateField('modelWeight', val)}
                suffix="g"
                step={1}
                tooltip="Exact filament weight reported by your slicer (e.g., PrusaSlicer, Cura, Bambu), including supports, brims, and purge towers."
              />

              <NumberField
                id="failed-prints-markup"
                label="Failed Prints Markup"
                value={state.failedPrintsMarkup}
                onChange={(val) => {
                  setActiveMaterialProfileId(undefined);
                  updateField('failedPrintsMarkup', val);
                }}
                suffix="%"
                step={1}
                tooltip="Buffer to cover inevitable print failures—clogged nozzles, bed adhesion blobs, power outages, or spaghetti monsters (typically 10% for PLA, 15–20% for ABS/PC)."
              />
            </div>

            <ProfileManager
              label="Custom Material Profiles (LocalStorage)"
              placeholder="e.g., Prusament PETG Jet Black"
              profiles={materialProfiles}
              activeId={activeMaterialProfileId}
              onSelect={handleSelectMaterialProfile}
              onSave={handleSaveMaterialProfile}
              onDelete={handleDeleteMaterialProfile}
            />
          </CollapsibleSection>

          {/* Section 2: Print Time & Labor (Optional Toggle) */}
          <CollapsibleSection
            stepNumber={2}
            title="Print Time & Labor"
            subtitle="Machine duration and hands-on operator time"
            badgeText={
              state.laborEnabled
                ? formatCurrency(result.laborCost, state.currency)
                : 'Excluded'
            }
            icon={<Clock size={18} />}
            optionalToggle={{
              enabled: state.laborEnabled,
              onToggle: (enabled) => updateField('laborEnabled', enabled),
            }}
          >
            <div className="field-grid-2">
              <NumberField
                id="print-hours"
                label="Print Time (Hours)"
                value={state.printHours}
                onChange={(val) => updateField('printHours', val)}
                suffix="hrs"
                isInteger
                step={1}
                tooltip="Whole hours from your slicer's estimated print duration. Used to calculate electricity and printer wear."
              />

              <NumberField
                id="print-minutes"
                label="Print Time (Minutes)"
                value={state.printMinutes}
                onChange={(val) => updateField('printMinutes', val)}
                suffix="min"
                min={0}
                max={59}
                isInteger
                step={1}
                tooltip="Remaining minutes (0–59) from your slicer's estimated print duration."
              />

              <NumberField
                id="prep-minutes"
                label="Preparation Time"
                value={state.preparationMinutes}
                onChange={(val) => updateField('preparationMinutes', val)}
                suffix="min"
                step={5}
                tooltip="Active time spent slicing, cleaning the print sheet, loading filament, starting the print, and removing the finished part."
              />

              <NumberField
                id="post-minutes"
                label="Post-Processing Time"
                value={state.postProcessingMinutes}
                onChange={(val) => updateField('postProcessingMinutes', val)}
                suffix="min"
                step={5}
                tooltip="Active time spent removing supports, deburring, sanding, heat-set inserts, gluing, or painting."
              />
            </div>

            <div className="field-grid-2">
              <NumberField
                id="labor-rate"
                label="Labor Hourly Rate"
                value={state.laborHourlyRate}
                onChange={(val) => updateField('laborHourlyRate', val)}
                prefix={currencySymbol}
                suffix="/hr"
                step={1}
                tooltip="Your hourly wage for active hands-on work (Preparation + Post-Processing). Prusa emphasizes not undervaluing your own time!"
              />
              <div className="info-stat-card">
                <span className="info-stat-label">Calculated Durations</span>
                <div className="info-stat-row">
                  <span>Total Print Time:</span>
                  <strong>{formatDuration(result.totalPrintHours)}</strong>
                </div>
                <div className="info-stat-row">
                  <span>Active Labor Time:</span>
                  <strong>
                    {state.laborEnabled
                      ? formatDuration(result.totalLaborHours)
                      : '0m (Optional Off)'}
                  </strong>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 3: Electricity (Optional Toggle) */}
          <CollapsibleSection
            stepNumber={3}
            title="Electricity"
            subtitle="Average power draw and local kWh utility rate"
            badgeText={
              state.electricityEnabled
                ? formatCurrency(result.electricityCost, state.currency)
                : 'Excluded'
            }
            icon={<Zap size={18} />}
            optionalToggle={{
              enabled: state.electricityEnabled,
              onToggle: (enabled) => updateField('electricityEnabled', enabled),
            }}
          >
            <div className="field-grid-2">
              <NumberField
                id="printer-watts"
                label="Printer Power Consumption"
                value={state.printerWatts}
                onChange={(val) => {
                  setActivePrinterProfileId(undefined);
                  updateField('printerWatts', val);
                }}
                suffix="W"
                step={10}
                tooltip="Average power draw during printing (not peak heat-up wattage). A typical desktop FDM printer like a Prusa MK4S averages ~120–150 W."
              />

              <NumberField
                id="electricity-kwh"
                label="Electricity Cost per kWh"
                value={state.electricityCostPerKwh}
                onChange={(val) => updateField('electricityCostPerKwh', val)}
                prefix={currencySymbol}
                suffix="/kWh"
                step={0.01}
                tooltip="Your utility rate per kilowatt-hour. Check your electricity bill (typically $0.12–$0.35/kWh depending on region)."
              />
            </div>
          </CollapsibleSection>

          {/* Section 4: Machine & Upkeep / Depreciation (Optional Toggle & Sliders) */}
          <CollapsibleSection
            stepNumber={4}
            title="Machine & Upkeep Cost"
            subtitle="Hardware depreciation, daily usage hours, and repair reserve"
            badgeText={
              state.depreciationEnabled
                ? formatCurrency(
                    result.depreciationAndMaintenanceCost,
                    state.currency
                  )
                : 'Excluded'
            }
            icon={<Cpu size={18} />}
            optionalToggle={{
              enabled: state.depreciationEnabled,
              onToggle: (enabled) =>
                updateField('depreciationEnabled', enabled),
            }}
          >
            <div className="field-grid-2">
              <NumberField
                id="printer-price"
                label="Printer Purchase Price"
                value={state.printerPurchasePrice}
                onChange={(val) => {
                  setActivePrinterProfileId(undefined);
                  updateField('printerPurchasePrice', val);
                }}
                prefix={currencySymbol}
                step={50}
                tooltip="Total purchase cost of the 3D printer (including shipping/taxes or enclosure) to amortize."
              />

              <NumberField
                id="investment-return-years"
                label="Investment Return (Years)"
                value={state.investmentReturnYears}
                onChange={(val) => {
                  setActivePrinterProfileId(undefined);
                  updateField(
                    'investmentReturnYears',
                    Math.max(0.25, val)
                  );
                }}
                suffix="yr"
                step={0.5}
                tooltip="Timeframe (in years) over which you plan to amortize or replace the printer (Prusa default: 1 to 2 years)."
              />
            </div>

            {/* Daily Commercial Usage Slider (1h - 24h) */}
            <div className="apple-slider-card">
              <div className="field-label-row">
                <label
                  htmlFor="daily-usage-slider"
                  className="field-label"
                >
                  Daily Commercial Usage: <strong>{state.dailyCommercialUsageHours}h / day</strong>
                </label>
                <Tooltip
                  text="Average number of hours per day your printer runs active commercial jobs (1h to 24h/day)."
                  label="Info about daily commercial usage"
                />
              </div>
              <input
                id="daily-usage-slider"
                type="range"
                className="field-slider"
                min={1}
                max={24}
                step={1}
                value={state.dailyCommercialUsageHours}
                onChange={(e) =>
                  updateField(
                    'dailyCommercialUsageHours',
                    parseInt(e.target.value, 10)
                  )
                }
              />
              <div className="slider-ticks">
                <span>1 hr/day</span>
                <span>12 hrs/day</span>
                <span>24 hrs/day (24/7 Farm)</span>
              </div>
            </div>

            {/* Repair Cost % Slider */}
            <div className="apple-slider-card">
              <div className="field-label-row">
                <label
                  htmlFor="repair-cost-slider"
                  className="field-label"
                >
                  Repair Cost (% of printer price): <strong>{state.repairCostPercent}%</strong>
                </label>
                <Tooltip
                  text="Estimated percentage of printer's purchase price spent on repairs, nozzles, PEI sheets, belts, and grease over its lifetime (Prusa standard: 5%–15%)."
                  label="Info about repair cost percentage"
                />
              </div>
              <input
                id="repair-cost-slider"
                type="range"
                className="field-slider"
                min={0}
                max={50}
                step={1}
                value={state.repairCostPercent}
                onChange={(e) =>
                  updateField(
                    'repairCostPercent',
                    parseFloat(e.target.value)
                  )
                }
              />
              <div className="slider-ticks">
                <span>0%</span>
                <span>10% (Typical)</span>
                <span>50% (High wear)</span>
              </div>
            </div>

            <ProfileManager
              label="Printer Profiles (Built-in & Custom LocalStorage)"
              placeholder="e.g., My Prusa MK4 Farm Unit"
              builtinProfiles={BUILTIN_PRINTER_PRESETS}
              profiles={printerProfiles}
              activeId={activePrinterProfileId}
              onSelect={handleSelectPrinterProfile}
              onSave={handleSavePrinterProfile}
              onDelete={handleDeletePrinterProfile}
            />
          </CollapsibleSection>

          {/* Section 5: Additional Costs & Profit Markup */}
          <CollapsibleSection
            stepNumber={5}
            title="Additional Costs & Profit Markup"
            subtitle="Hardware line items, profit margin, platform fees, and batch size"
            badgeText={`+${state.profitMarkup}%`}
            icon={<PackagePlus size={18} />}
          >
            {/* Dynamic Other Costs */}
            <DynamicOtherCosts
              items={state.otherCosts}
              currency={state.currency}
              onChange={(items) => updateField('otherCosts', items)}
            />

            <div className="field-grid-2">
              <NumberField
                id="quantity"
                label="Quantity (Batch Size)"
                value={state.quantity}
                onChange={(val) =>
                  updateField('quantity', Math.max(1, Math.floor(val) || 1))
                }
                suffix="units"
                min={1}
                isInteger
                step={1}
                tooltip="Number of identical parts in this order. Displays both per-unit price and total batch order price."
              />

              <NumberField
                id="transaction-fee"
                label="Transaction / Platform Fee"
                value={state.transactionFee}
                onChange={(val) => updateField('transactionFee', val)}
                suffix="%"
                max={99}
                step={0.5}
                tooltip="Optional payment gateway or marketplace fee (e.g., Stripe ~2.9%, PayPal ~3.5%, Etsy ~6.5–10%). Grossed up via Price / (1 - Fee%) so fees never eat into your net profit."
              />
            </div>

            <div className="field-grid-2">
              <NumberField
                id="profit-markup"
                label="Profit Markup"
                value={state.profitMarkup}
                onChange={(val) => updateField('profitMarkup', val)}
                suffix="%"
                step={1}
                showSlider
                sliderMax={150}
                tooltip="Desired profit percentage added on top of Total Production Cost. Rewards business risk and funds future upgrades."
              />

              <NumberField
                id="vat-percent-field"
                label="VAT / Tax"
                value={state.vatPercent}
                onChange={(val) => updateField('vatPercent', val)}
                suffix="%"
                step={1}
                tooltip="Value Added Tax (IVA) or Sales Tax rate applied to final selling price (e.g. 21% in Spain, 20% in UK)."
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* Right Column: Sticky Live Cost Breakdown & Summary */}
        <SummaryDashboard
          state={state}
          result={result}
          onReset={handleReset}
          onVatChange={(vat) => updateField('vatPercent', vat)}
        />
      </main>
    </div>
  );
}

export default App;
