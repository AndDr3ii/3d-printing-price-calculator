import {
  BookmarkCheck,
  Boxes,
  Calculator,
  Check,
  Clock,
  Cpu,
  FileText,
  Layers,
  Moon,
  PackagePlus,
  Printer,
  Save,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CollapsibleSection } from './components/CollapsibleSection';
import { DynamicOtherCosts } from './components/DynamicOtherCosts';
import { GCodeUpload } from './components/GCodeUpload';
import { InventoryView } from './components/InventoryView';
import { LogPrintModal } from './components/LogPrintModal';
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
import {
  downloadMasterBackupFile,
  performSilentRotatingBackup,
  restoreMasterBackupFromFile,
} from './services/backupService';
import {
  DatabaseService,
  applyWorkshopSettingsToCalculatorState,
  extractWorkshopSettingsFromCalculatorState,
} from './services/database';
import type {
  CalculatorState,
  CurrencyCode,
  ExpenseItem,
  FilamentSlotAssignment,
  FilamentSlotUsage,
  FilamentSpool,
  FilamentType,
  JobHistoryRecord,
  MaterialProfile,
  PrinterProfile,
  ProductTemplate,
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

  // Database & Inventory State
  const [activeTab, setActiveTab] = useState<'calculator' | 'inventory'>('calculator');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [spools, setSpools] = useState<FilamentSpool[]>([]);
  const [history, setHistory] = useState<JobHistoryRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Save Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateTargetPrice, setNewTemplateTargetPrice] = useState<number>(0);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const db = DatabaseService.getInstance();
    db.init().then(async () => {
      try {
        const [
          loadedSpools,
          loadedHistory,
          loadedExpenses,
          loadedTemplates,
          dbSettings,
        ] = await Promise.all([
          db.getSpools(),
          db.getHistory(),
          db.getExpenses(),
          db.getProductTemplates(),
          db.getSettings(),
        ]);
        setSpools(loadedSpools);
        setHistory(loadedHistory);
        setExpenses(loadedExpenses);
        setProductTemplates(loadedTemplates);

        // Perform silent daily rotating backup
        performSilentRotatingBackup();

        // If no URL serialized state and no local state saved, seed from workshop settings
        const urlHasState = Boolean(deserializeStateFromUrl());
        const localHasState = Boolean(localStorage.getItem(STORAGE_KEYS.STATE));
        if (!urlHasState && !localHasState && dbSettings) {
          setState((prev) =>
            applyWorkshopSettingsToCalculatorState(prev, dbSettings)
          );
        }
      } catch (err) {
        console.warn('Database initialization warning:', err);
      }
    });
  }, []);

  const lowStockCount = useMemo(() => {
    return spools.filter((s) => (s.remaining_weight_g || 0) < 200).length;
  }, [spools]);

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

  const handleSaveWorkshopDefaults = async () => {
    try {
      const settings = extractWorkshopSettingsFromCalculatorState(state);
      await DatabaseService.getInstance().saveSettings(settings);
      showToast('Workshop defaults saved!');
    } catch (err) {
      console.error('Failed to save defaults:', err);
      showToast('Error saving workshop defaults');
    }
  };

  const handleReset = async () => {
    clearUrlState();
    try {
      const dbSettings = await DatabaseService.getInstance().getSettings();
      if (dbSettings) {
        setState(applyWorkshopSettingsToCalculatorState(DEFAULT_STATE, dbSettings));
      } else {
        setState(DEFAULT_STATE);
      }
    } catch {
      setState(DEFAULT_STATE);
    }
    setActiveMaterialProfileId(undefined);
    setActivePrinterProfileId(undefined);
    setSelectedTemplateId('');
    showToast('Reset to workshop defaults');
  };

  const handleSelectInventorySpool = (spoolId: string) => {
    if (!spoolId) {
      updateField('selectedSpoolId', undefined);
      return;
    }
    const spool = spools.find((s) => s.id === spoolId);
    if (!spool) return;

    setActiveMaterialProfileId(undefined);
    const matchedMaterial: FilamentType =
      spool.material in FILAMENT_PRESETS
        ? (spool.material as FilamentType)
        : spool.material.toLowerCase().includes('petg')
        ? 'PETG'
        : spool.material.toLowerCase().includes('pla')
        ? 'PLA'
        : spool.material.toLowerCase().includes('abs')
        ? 'ABS'
        : spool.material.toLowerCase().includes('tpu')
        ? 'TPU'
        : spool.material.toLowerCase().includes('asa')
        ? 'ASA'
        : spool.material.toLowerCase().includes('pc')
        ? 'PC'
        : 'Custom';

    setState((prev) => ({
      ...prev,
      selectedSpoolId: spool.id,
      spoolPrice: spool.spool_price,
      spoolWeight: spool.initial_weight_g,
      filamentType: matchedMaterial,
    }));
  };

  const handleGCodeAutofill = (data: {
    hours: number;
    minutes: number;
    weight: number;
    slicer?: string;
    projectName?: string;
    filamentSlots?: FilamentSlotUsage[];
  }) => {
    let multiSlots: FilamentSlotAssignment[] | undefined = undefined;
    let singleMatchedSpoolId: string | undefined = undefined;

    if (data.filamentSlots && data.filamentSlots.length > 1) {
      multiSlots = data.filamentSlots.map((slot) => {
        // Auto-match best spool from inventory by material and color
        const matched =
          spools.find(
            (s) =>
              s.material.toLowerCase().includes(slot.type.toLowerCase()) ||
              s.color_hex.toLowerCase() === slot.color.toLowerCase()
          ) || spools[0];

        return {
          slotId: slot.id,
          type: slot.type,
          color: slot.color,
          usedGrams: slot.usedGrams,
          assignedSpoolId: matched?.id,
          customSpoolPrice: matched?.spool_price || state.spoolPrice,
          customSpoolWeight: matched?.initial_weight_g || state.spoolWeight,
        };
      });
    } else if (data.filamentSlots && data.filamentSlots.length === 1) {
      const slot = data.filamentSlots[0];
      const matched = spools.find(
        (s) =>
          s.material.toLowerCase().includes(slot.type.toLowerCase()) ||
          s.color_hex.toLowerCase() === slot.color.toLowerCase()
      );
      if (matched) {
        singleMatchedSpoolId = matched.id;
      }
    }

    setState((prev) => ({
      ...prev,
      printHours: data.hours,
      printMinutes: data.minutes,
      ...(data.weight > 0 ? { modelWeight: data.weight } : {}),
      ...(data.projectName ? { jobName: data.projectName } : {}),
      multiColorSlots: multiSlots,
      ...(singleMatchedSpoolId ? { selectedSpoolId: singleMatchedSpoolId } : {}),
    }));

    if (multiSlots) {
      showToast(
        `Loaded ${multiSlots.length}-color AMS Lite print (${data.hours}h ${data.minutes}m, ${data.weight}g)`
      );
    }
  };

  // Product Templates Handlers
  const handleLoadProductTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tmpl = productTemplates.find((t) => t.id === templateId);
    if (!tmpl) return;

    let parsedExtraCosts = [];
    if (tmpl.extra_hardware_json) {
      try {
        parsedExtraCosts = JSON.parse(tmpl.extra_hardware_json);
      } catch {
        parsedExtraCosts = [];
      }
    }

    setState((prev) => ({
      ...prev,
      jobName: tmpl.name,
      filamentType: tmpl.filament_type,
      selectedSpoolId: tmpl.default_spool_id,
      modelWeight: tmpl.weight_g,
      printHours: tmpl.print_hours,
      printMinutes: tmpl.print_minutes,
      preparationMinutes: tmpl.prep_minutes,
      postProcessingMinutes: tmpl.post_minutes,
      quantity: tmpl.batch_quantity,
      profitMarkup: tmpl.profit_markup,
      otherCosts: parsedExtraCosts.length > 0 ? parsedExtraCosts : prev.otherCosts,
      multiColorSlots: undefined,
    }));

    showToast(`Loaded recipe "${tmpl.name}"`);
  };

  const openSaveTemplateModal = () => {
    setNewTemplateName(state.jobName || 'Product Template');
    setNewTemplateTargetPrice(
      Math.round(result.batchSellingPrice * 100) / 100
    );
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const newTemplate: ProductTemplate = {
      id: `tmpl-${Date.now()}`,
      name: newTemplateName.trim(),
      default_spool_id: state.selectedSpoolId,
      filament_type: state.filamentType,
      weight_g: state.modelWeight,
      print_hours: state.printHours,
      print_minutes: state.printMinutes,
      prep_minutes: state.preparationMinutes,
      post_minutes: state.postProcessingMinutes,
      batch_quantity: state.quantity,
      extra_hardware_json: JSON.stringify(state.otherCosts),
      profit_markup: state.profitMarkup,
      target_price_eur: newTemplateTargetPrice,
      created_at: new Date().toISOString(),
    };

    await DatabaseService.getInstance().saveProductTemplate(newTemplate);
    const updated = await DatabaseService.getInstance().getProductTemplates();
    setProductTemplates(updated);
    setSelectedTemplateId(newTemplate.id);
    setIsTemplateModalOpen(false);
    showToast(`Saved recipe "${newTemplate.name}"!`);
  };

  const handleDeleteProductTemplate = async (id: string) => {
    await DatabaseService.getInstance().deleteProductTemplate(id);
    const updated = await DatabaseService.getInstance().getProductTemplates();
    setProductTemplates(updated);
    if (selectedTemplateId === id) {
      setSelectedTemplateId('');
    }
    showToast('Recipe deleted');
  };

  // Full Master Backup & Restore Handlers
  const handleExportBackup = async () => {
    try {
      const fileName = await downloadMasterBackupFile();
      showToast(`Master backup exported (${fileName})`);
    } catch (err) {
      console.error(err);
      showToast('Error exporting backup file');
    }
  };

  const handleRestoreBackup = async (file: File) => {
    try {
      const res = await restoreMasterBackupFromFile(file);
      if (res.success) {
        const db = DatabaseService.getInstance();
        const [
          loadedSpools,
          loadedHistory,
          loadedExpenses,
          loadedTemplates,
          loadedSettings,
        ] = await Promise.all([
          db.getSpools(),
          db.getHistory(),
          db.getExpenses(),
          db.getProductTemplates(),
          db.getSettings(),
        ]);
        setSpools(loadedSpools);
        setHistory(loadedHistory);
        setExpenses(loadedExpenses);
        setProductTemplates(loadedTemplates);
        if (loadedSettings) {
          setState((prev) =>
            applyWorkshopSettingsToCalculatorState(prev, loadedSettings)
          );
        }
        showToast(res.message);
      } else {
        showToast(res.message);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to restore backup');
    }
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

          {/* Navigation Segmented Tabs */}
          <nav className="header-nav-tabs" aria-label="Main Navigation">
            <button
              type="button"
              className={`header-nav-tab ${
                activeTab === 'calculator' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('calculator')}
            >
              <Calculator size={16} />
              <span>Calculator</span>
            </button>
            <button
              type="button"
              className={`header-nav-tab ${
                activeTab === 'inventory' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('inventory')}
            >
              <Boxes size={16} />
              <span>Inventory &amp; History</span>
              {lowStockCount > 0 && (
                <span
                  className="tab-alert-badge"
                  title={`${lowStockCount} spool(s) below 200g remaining`}
                >
                  {lowStockCount}
                </span>
              )}
            </button>
          </nav>

          <div className="header-controls">
            <button
              type="button"
              className="btn-save-defaults"
              onClick={handleSaveWorkshopDefaults}
              title="Save current workshop rates &amp; printer specs as default profile"
            >
              <BookmarkCheck size={16} />
              <span className="save-defaults-text">Save Defaults</span>
            </button>

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

      {activeTab === 'calculator' ? (
        <main className="dashboard-grid">
          {/* Left Column: Organized Collapsible Input Sections */}
          <div className="inputs-column">
            {/* Top Section: Job Name, Product Templates & G-Code File Autofill */}
            <section className="calc-card job-info-card">
              <div className="job-info-header">
                <div className="calc-card-title-wrap">
                  <span className="step-icon-badge" aria-hidden="true">
                    <FileText size={18} />
                  </span>
                  <div className="calc-card-headings">
                    <h2 className="calc-card-title">Project &amp; Print Information</h2>
                    <p className="calc-card-subtitle">
                      Job name, saved product recipes, and Bambu / Orca G-Code auto-parsing
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary template-save-top-btn"
                  onClick={openSaveTemplateModal}
                  title="Save current weight, print time, hardware, and markup as a reusable recipe"
                >
                  <Save size={14} />
                  <span>Save as Recipe</span>
                </button>
              </div>

              <div className="job-info-body">
                {/* Product Templates Quick-Load Row */}
                {productTemplates.length > 0 && (
                  <div className="template-picker-row">
                    <div className="template-picker-field">
                      <label htmlFor="template-select" className="field-label-sm">
                        Load Saved Product Recipe (1-Click Quote)
                      </label>
                      <div className="template-select-wrap">
                        <select
                          id="template-select"
                          className="field-select font-mono"
                          value={selectedTemplateId}
                          onChange={(e) => handleLoadProductTemplate(e.target.value)}
                        >
                          <option value="">Choose a saved recipe...</option>
                          {productTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.weight_g}g &middot; {t.print_hours}h{t.print_minutes}m &middot; +{t.profit_markup}%)
                            </option>
                          ))}
                        </select>
                        {selectedTemplateId && (
                          <button
                            type="button"
                            className="btn-icon-subtle btn-delete"
                            title="Delete this saved recipe"
                            onClick={() => {
                              if (confirm('Delete this saved product recipe?')) {
                                handleDeleteProductTemplate(selectedTemplateId);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
              {/* Bambu AMS Lite Multi-Color Slot Mapper */}
              {state.multiColorSlots && state.multiColorSlots.length > 1 ? (
                <div className="ams-lite-panel">
                  <div className="ams-lite-header">
                    <div className="ams-lite-title-wrap">
                      <span className="ams-lite-badge">Bambu AMS Lite</span>
                      <span className="ams-lite-sub">
                        {state.multiColorSlots.length} Multi-Color Slots Detected
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-text-subtle"
                      onClick={() => updateField('multiColorSlots', undefined)}
                    >
                      Switch to Single Spool
                    </button>
                  </div>

                  <div className="ams-slots-grid">
                    {state.multiColorSlots.map((slot) => {
                      const assignedSpool = spools.find(
                        (s) => s.id === slot.assignedSpoolId
                      );

                      return (
                        <div key={slot.slotId} className="ams-slot-card">
                          <div className="ams-slot-top">
                            <span
                              className="spool-swatch"
                              style={{ backgroundColor: slot.color }}
                            />
                            <div className="ams-slot-headings">
                              <span className="ams-slot-name">
                                Slot {slot.slotId} &middot; {slot.type}
                              </span>
                              <span className="ams-slot-grams font-mono">
                                {slot.usedGrams} g
                              </span>
                            </div>
                          </div>

                          <select
                            className="field-select font-mono ams-slot-select"
                            value={slot.assignedSpoolId || ''}
                            onChange={(e) => {
                              const newSpoolId = e.target.value;
                              const matched = spools.find(
                                (s) => s.id === newSpoolId
                              );
                              const updatedSlots = state.multiColorSlots!.map(
                                (s) =>
                                  s.slotId === slot.slotId
                                    ? {
                                        ...s,
                                        assignedSpoolId: newSpoolId,
                                        customSpoolPrice: matched?.spool_price,
                                        customSpoolWeight:
                                          matched?.initial_weight_g,
                                      }
                                    : s
                              );
                              updateField('multiColorSlots', updatedSlots);
                            }}
                          >
                            <option value="">Custom Spool Rate</option>
                            {spools.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.code} · {sp.brand} {sp.material} ({Math.round(sp.remaining_weight_g)}g left)
                              </option>
                            ))}
                          </select>

                          {assignedSpool && (
                            <div className="ams-slot-footer">
                              {assignedSpool.color_name} &middot; {formatCurrency(assignedSpool.spool_price, state.currency)}/spool
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Active Inventory Spool Dropdown for Single Spool */
                <div className="field-group spool-inventory-selector-group">
                  <div className="field-label-row">
                    <label
                      htmlFor="inventory-spool-select"
                      className="field-label"
                    >
                      Select Inventory Spool
                    </label>
                    {spools.length > 0 && (
                      <span className="inventory-spools-count-tag">
                        {spools.length} physical spools in workshop
                      </span>
                    )}
                  </div>
                  <select
                    id="inventory-spool-select"
                    className="field-select font-mono"
                    value={state.selectedSpoolId || ''}
                    onChange={(e) => handleSelectInventorySpool(e.target.value)}
                  >
                    <option value="">Custom / Unlisted Spool</option>
                    {spools.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.code} · {sp.brand} {sp.material} {sp.color_name} ({Math.round(sp.remaining_weight_g)}g left — {formatCurrency(sp.spool_price, state.currency)}/spool)
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  tooltip="Exact filament weight reported by your slicer (e.g., Bambu Studio, OrcaSlicer, Cura), including supports, brims, and purge towers."
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
                  tooltip="Buffer to cover inevitable print failures—clogged nozzles, bed adhesion blobs, or warping (typically 10% for PLA/PETG, 15–20% for ABS/PC)."
                />
              </div>

              <ProfileManager
                label="Custom Material Profiles"
                placeholder="e.g., Bambu PETG Matte Black"
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
              title="Print Time &amp; Labor"
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
                  tooltip="Active time spent slicing, cleaning the build sheet, loading filament, and starting the print."
                />

                <NumberField
                  id="post-minutes"
                  label="Post-Processing Time"
                  value={state.postProcessingMinutes}
                  onChange={(val) => updateField('postProcessingMinutes', val)}
                  suffix="min"
                  step={5}
                  tooltip="Active time spent removing supports, deburring, heat-set inserts, gluing, or packing."
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
                  tooltip="Your hourly wage for active hands-on work (Preparation + Post-Processing). Always value your own time!"
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
                  tooltip="Average power draw during printing (not peak heat-up wattage). A typical bed-slinger like a Bambu A1 averages ~100–120 W."
                />

                <NumberField
                  id="electricity-kwh"
                  label="Electricity Cost per kWh"
                  value={state.electricityCostPerKwh}
                  onChange={(val) => updateField('electricityCostPerKwh', val)}
                  prefix={currencySymbol}
                  suffix="/kWh"
                  step={0.01}
                  tooltip="Your utility rate per kilowatt-hour. Check your electricity bill (typically €0.12–€0.30/kWh depending on region)."
                />
              </div>
            </CollapsibleSection>

            {/* Section 4: Machine & Upkeep / Depreciation (Optional Toggle & Sliders) */}
            <CollapsibleSection
              stepNumber={4}
              title="Machine &amp; Upkeep Cost"
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
                  tooltip="Total purchase cost of the 3D printer (including shipping/taxes) to amortize."
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
                  tooltip="Timeframe (in years) over which you plan to amortize or replace the printer (typically 1 to 2 years)."
                />
              </div>

              {/* Daily Commercial Usage Slider (1h - 24h) */}
              <div className="apple-slider-card">
                <div className="field-label-row">
                  <label htmlFor="daily-usage-slider" className="field-label">
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
                  <label htmlFor="repair-cost-slider" className="field-label">
                    Repair Cost (% of printer price): <strong>{state.repairCostPercent}%</strong>
                  </label>
                  <Tooltip
                    text="Estimated percentage of printer's purchase price spent on repairs, nozzles, PEI sheets, belts, and grease over its lifetime (typically 5%–15%)."
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
                label="Printer Profiles (Built-in &amp; Custom Profiles)"
                placeholder="e.g., My Bambu A1 Farm Unit"
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
              title="Additional Costs &amp; Profit Markup"
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
            onOpenLogModal={() => setIsLogModalOpen(true)}
          />
        </main>
      ) : (
        <main className="inventory-container">
          <InventoryView
            spools={spools}
            history={history}
            expenses={expenses}
            currency={state.currency}
            onAddSpool={async (newSpool) => {
              await DatabaseService.getInstance().addSpool(newSpool);
              const updated = await DatabaseService.getInstance().getSpools();
              setSpools(updated);
              showToast(`Added ${newSpool.code} (${newSpool.color_name})`);
            }}
            onUpdateSpool={async (updatedSpool) => {
              await DatabaseService.getInstance().updateSpool(updatedSpool);
              const updated = await DatabaseService.getInstance().getSpools();
              setSpools(updated);
              showToast(`Updated ${updatedSpool.code}`);
            }}
            onDeleteSpool={async (id) => {
              await DatabaseService.getInstance().deleteSpool(id);
              const updated = await DatabaseService.getInstance().getSpools();
              setSpools(updated);
              showToast('Spool deleted');
            }}
            onDeleteHistoryItem={async (id) => {
              await DatabaseService.getInstance().deleteHistoryItem(id);
              const updated = await DatabaseService.getInstance().getHistory();
              setHistory(updated);
              showToast('History record deleted');
            }}
            onAddExpense={async (newExpense) => {
              await DatabaseService.getInstance().addExpense(newExpense);
              const updated = await DatabaseService.getInstance().getExpenses();
              setExpenses(updated);
              showToast(`Logged expense: ${newExpense.concept}`);
            }}
            onDeleteExpense={async (id) => {
              await DatabaseService.getInstance().deleteExpense(id);
              const updated = await DatabaseService.getInstance().getExpenses();
              setExpenses(updated);
              showToast('Expense deleted');
            }}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
          />
        </main>
      )}

      {/* Log Print / Sale Modal */}
      <LogPrintModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        state={state}
        result={result}
        spools={spools}
        onConfirm={async (jobRecord, deductions) => {
          await DatabaseService.getInstance().logJob(jobRecord);

          // Deduct stock for each spool simultaneously
          const spoolDeductions = deductions
            .filter((d) => d.spool_id)
            .map((d) => ({
              spoolId: d.spool_id,
              grams: d.grams_used,
            }));

          if (spoolDeductions.length > 0) {
            await DatabaseService.getInstance().deductMultipleSpools(
              spoolDeductions
            );
          }

          const [updatedSpools, updatedHistory] = await Promise.all([
            DatabaseService.getInstance().getSpools(),
            DatabaseService.getInstance().getHistory(),
          ]);
          setSpools(updatedSpools);
          setHistory(updatedHistory);

          // Trigger automatic silent backup after logging
          performSilentRotatingBackup(true);

          showToast(
            `Logged job & deducted stock across ${deductions.length} spool(s)!`
          );
        }}
      />

      {/* Save Product Template / Recipe Modal */}
      {isTemplateModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsTemplateModalOpen(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3 className="modal-title">Save as Product Recipe</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsTemplateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="modal-body">
              <p className="modal-lead-text">
                Save current weight ({state.modelWeight}g), print time ({state.printHours}h{state.printMinutes}m), labor, hardware items, and markup (+{state.profitMarkup}%) as a reusable 1-click recipe.
              </p>

              <div className="field-group">
                <label className="field-label">Recipe / Product Name</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Modern Spiral Vase"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  Target / Benchmark Price ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="field-input font-mono"
                  value={newTemplateTargetPrice || ''}
                  onChange={(e) =>
                    setNewTemplateTargetPrice(parseFloat(e.target.value) || 0)
                  }
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsTemplateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={16} /> Save Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast-notification" role="status" aria-live="polite">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
