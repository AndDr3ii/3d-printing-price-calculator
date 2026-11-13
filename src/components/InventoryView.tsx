import {
  Archive,
  ArrowDownToLine,
  ArrowUpToLine,
  Award,
  DollarSign,
  Download,
  Edit2,
  Package,
  Plus,
  Scale,
  Trash2,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { CURRENCIES } from '../constants/defaults';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import type {
  CurrencyCode,
  ExpenseItem,
  ExpenseType,
  FilamentSpool,
  JobHistoryRecord,
} from '../types/calculator';

interface InventoryViewProps {
  spools: FilamentSpool[];
  history: JobHistoryRecord[];
  expenses: ExpenseItem[];
  currency: CurrencyCode;
  onAddSpool: (spool: FilamentSpool) => Promise<void>;
  onUpdateSpool: (spool: FilamentSpool) => Promise<void>;
  onDeleteSpool: (id: string) => Promise<void>;
  onDeleteHistoryItem: (id: string) => Promise<void>;
  onAddExpense: (expense: ExpenseItem) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onExportBackup: () => void;
  onRestoreBackup: (file: File) => Promise<void>;
}

export function InventoryView({
  spools,
  history,
  expenses,
  currency,
  onAddSpool,
  onUpdateSpool,
  onDeleteSpool,
  onDeleteHistoryItem,
  onAddExpense,
  onDeleteExpense,
  onExportBackup,
  onRestoreBackup,
}: InventoryViewProps) {
  const currencySymbol = CURRENCIES[currency]?.symbol || '€';
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // KPI Calculations
  const totalGramsRemaining = useMemo(() => {
    return spools.reduce((acc, s) => acc + (s.remaining_weight_g || 0), 0);
  }, [spools]);

  const totalStockValue = useMemo(() => {
    return spools.reduce((acc, s) => {
      const pricePerGram = (s.spool_price || 0) / (s.initial_weight_g || 1000);
      return acc + (s.remaining_weight_g || 0) * pricePerGram;
    }, 0);
  }, [spools]);

  const totalRevenue = useMemo(() => {
    return history
      .filter((h) => h.record_type === 'sale')
      .reduce((acc, h) => acc + (h.selling_price || 0), 0);
  }, [history]);

  const totalProfit = useMemo(() => {
    return history.reduce((acc, h) => acc + (h.net_profit || 0), 0);
  }, [history]);

  // CapEx & OpEx ROI Calculations
  const totalCapEx = useMemo(() => {
    return expenses
      .filter((e) => e.expense_type === 'CapEx')
      .reduce((acc, e) => acc + (e.amount_eur || 0), 0);
  }, [expenses]);

  const totalOpEx = useMemo(() => {
    return expenses
      .filter((e) => e.expense_type === 'OpEx')
      .reduce((acc, e) => acc + (e.amount_eur || 0), 0);
  }, [expenses]);

  const remainingBreakEven = useMemo(() => {
    return Math.max(0, totalCapEx - totalProfit);
  }, [totalCapEx, totalProfit]);

  const amortizationPct = useMemo(() => {
    if (totalCapEx <= 0) return 100;
    return Math.min(100, Math.max(0, (totalProfit / totalCapEx) * 100));
  }, [totalCapEx, totalProfit]);

  // Modal State for Spools
  const [isSpoolModalOpen, setIsSpoolModalOpen] = useState(false);
  const [editingSpool, setEditingSpool] = useState<FilamentSpool | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formBrand, setFormBrand] = useState('Bambu Lab');
  const [formMaterial, setFormMaterial] = useState('PETG Matte');
  const [formColorName, setFormColorName] = useState('');
  const [formColorHex, setFormColorHex] = useState('#71717A');
  const [formInitialWeight, setFormInitialWeight] = useState(1000);
  const [formRemainingWeight, setFormRemainingWeight] = useState(1000);
  const [formPrice, setFormPrice] = useState(10.23);

  // Modal State for Expenses
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expSupplier, setExpSupplier] = useState('');
  const [expConcept, setExpConcept] = useState('');
  const [expCategory, setExpCategory] = useState('Machinery');
  const [expType, setExpType] = useState<ExpenseType>('CapEx');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expNotes, setExpNotes] = useState('');

  // Confirm Delete Modal States
  const [spoolToDelete, setSpoolToDelete] = useState<FilamentSpool | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);
  const [historyItemToDelete, setHistoryItemToDelete] = useState<JobHistoryRecord | null>(null);

  const openAddSpoolModal = () => {
    const nextIndex = spools.length + 1;
    const padded = String(nextIndex).padStart(3, '0');
    setEditingSpool(null);
    setFormCode(`FIL-${padded}`);
    setFormBrand('Bambu Lab');
    setFormMaterial('PETG Matte');
    setFormColorName('');
    setFormColorHex('#71717A');
    setFormInitialWeight(1000);
    setFormRemainingWeight(1000);
    setFormPrice(10.23);
    setIsSpoolModalOpen(true);
  };

  const openEditSpoolModal = (sp: FilamentSpool) => {
    setEditingSpool(sp);
    setFormCode(sp.code);
    setFormBrand(sp.brand);
    setFormMaterial(sp.material);
    setFormColorName(sp.color_name);
    setFormColorHex(sp.color_hex);
    setFormInitialWeight(sp.initial_weight_g);
    setFormRemainingWeight(sp.remaining_weight_g);
    setFormPrice(sp.spool_price);
    setIsSpoolModalOpen(true);
  };

  const handleSaveSpool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSpool) {
      await onUpdateSpool({
        ...editingSpool,
        code: formCode.trim() || editingSpool.code,
        brand: formBrand.trim(),
        material: formMaterial.trim(),
        color_name: formColorName.trim() || 'Color',
        color_hex: formColorHex,
        initial_weight_g: Number(formInitialWeight) || 1000,
        remaining_weight_g: Math.max(0, Number(formRemainingWeight) || 0),
        spool_price: Number(formPrice) || 0,
      });
    } else {
      await onAddSpool({
        id: `spool-${Date.now()}`,
        code: formCode.trim() || `FIL-${spools.length + 1}`,
        brand: formBrand.trim() || 'Generic',
        material: formMaterial.trim() || 'PLA',
        color_name: formColorName.trim() || 'Color',
        color_hex: formColorHex,
        initial_weight_g: Number(formInitialWeight) || 1000,
        remaining_weight_g: Number(formRemainingWeight) || 1000,
        spool_price: Number(formPrice) || 0,
        created_at: new Date().toISOString(),
      });
    }
    setIsSpoolModalOpen(false);
  };

  const openAddExpenseModal = () => {
    setExpDate(new Date().toISOString().slice(0, 10));
    setExpSupplier('');
    setExpConcept('');
    setExpCategory('Machinery');
    setExpType('CapEx');
    setExpAmount(0);
    setExpNotes('');
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expConcept || expAmount <= 0) return;
    await onAddExpense({
      id: `exp-${Date.now()}`,
      date: expDate,
      supplier: expSupplier.trim() || 'Direct',
      concept: expConcept.trim(),
      category: expCategory,
      expense_type: expType,
      amount_eur: Number(expAmount),
      notes: expNotes.trim(),
    });
    setIsExpenseModalOpen(false);
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onRestoreBackup(file);
    if (restoreFileInputRef.current) {
      restoreFileInputRef.current.value = '';
    }
  };

  // Export History as CSV
  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      'ID',
      'Date',
      'Project Name',
      'Type',
      'Channel',
      'Spool Code',
      'Color',
      'Grams Used',
      'Print Minutes',
      'Quantity',
      'Cost',
      'Revenue',
      'Profit',
      'Notes',
    ];
    const rows = history.map((h) => [
      h.id,
      h.date,
      `"${(h.project_name || '').replace(/"/g, '""')}"`,
      h.record_type,
      h.sales_channel,
      h.spool_code || h.spool_id,
      `"${h.spool_color_name || ''}"`,
      h.grams_used,
      h.print_minutes,
      h.quantity,
      h.production_cost,
      h.selling_price,
      h.net_profit,
      `"${(h.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `printops_history_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="inventory-view-shell">
      {/* Hidden File Input for Restoring Master Backup */}
      <input
        ref={restoreFileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleRestoreFileSelected}
      />

      {/* View Header with Master Backup Controls */}
      <div className="inventory-header-bar">
        <div>
          <h2 className="inventory-header-title">Workshop Management &amp; Analytics</h2>
          <p className="inventory-header-sub">
            Track physical spools, CapEx amortization, print history, and automated backups
          </p>
        </div>
        <div className="inventory-header-actions">
          <button
            type="button"
            className="btn-backup-secondary"
            onClick={() => restoreFileInputRef.current?.click()}
            title="Restore a previously exported PrintOps JSON backup file"
          >
            <ArrowUpToLine size={15} />
            <span>Restore Backup</span>
          </button>
          <button
            type="button"
            className="btn-backup-primary"
            onClick={onExportBackup}
            title="Download a complete JSON master backup of all settings, spools, expenses, and history"
          >
            <ArrowDownToLine size={15} />
            <span>Export Backup (.json)</span>
          </button>
        </div>
      </div>

      {/* Top Workshop KPIs */}
      <div className="inventory-kpi-grid">
        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-title">Filament Stock</span>
            <Scale size={18} className="text-accent" />
          </div>
          <div className="inv-kpi-value">
            {(totalGramsRemaining / 1000).toFixed(2)} kg
          </div>
          <span className="inv-kpi-sub">
            {totalGramsRemaining.toLocaleString()} grams across {spools.length} spools
          </span>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-title">Stock Asset Value</span>
            <Package size={18} className="text-secondary" />
          </div>
          <div className="inv-kpi-value">
            {currencySymbol}
            {totalStockValue.toFixed(2)}
          </div>
          <span className="inv-kpi-sub">Current unprinted inventory</span>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-title">Logged Revenue</span>
            <TrendingUp size={18} className="text-profit" />
          </div>
          <div className="inv-kpi-value text-profit">
            {currencySymbol}
            {totalRevenue.toFixed(2)}
          </div>
          <span className="inv-kpi-sub">From recorded sales</span>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-title">Cumulative Profit</span>
            <TrendingUp size={18} className="text-profit" />
          </div>
          <div className="inv-kpi-value text-profit">
            {currencySymbol}
            {totalProfit.toFixed(2)}
          </div>
          <span className="inv-kpi-sub">Net revenue minus costs</span>
        </div>
      </div>

      {/* Workshop Amortization / Break-Even Progress Card */}
      <div className="calc-card break-even-card">
        <div className="break-even-header">
          <div className="calc-card-title-wrap">
            <span className="step-icon-badge break-even-badge">
              <Award size={18} />
            </span>
            <div className="calc-card-headings">
              <h2 className="calc-card-title">Workshop Amortization &amp; ROI Tracker</h2>
              <p className="calc-card-subtitle">
                Tracks cumulative net profit against your initial CapEx machinery and equipment investments
              </p>
            </div>
          </div>
          <div className="break-even-pill">
            {amortizationPct >= 100 ? (
              <span className="pill-success">Fully Amortized &middot; Profitable</span>
            ) : (
              <span className="pill-active">
                {currencySymbol}{remainingBreakEven.toFixed(2)} to Break-Even
              </span>
            )}
          </div>
        </div>

        <div className="break-even-stats-row">
          <div className="be-stat">
            <span className="be-stat-label">Total CapEx Investment</span>
            <strong className="be-stat-val font-mono">
              {currencySymbol}{totalCapEx.toFixed(2)}
            </strong>
          </div>
          <div className="be-stat">
            <span className="be-stat-label">Total OpEx Expenses</span>
            <strong className="be-stat-val font-mono">
              {currencySymbol}{totalOpEx.toFixed(2)}
            </strong>
          </div>
          <div className="be-stat">
            <span className="be-stat-label">Net Profit Recovered</span>
            <strong className="be-stat-val text-profit font-mono">
              {currencySymbol}{totalProfit.toFixed(2)}
            </strong>
          </div>
          <div className="be-stat">
            <span className="be-stat-label">Remaining to Break-Even</span>
            <strong className="be-stat-val font-mono">
              {currencySymbol}{remainingBreakEven.toFixed(2)}
            </strong>
          </div>
          <div className="be-stat">
            <span className="be-stat-label">Amortization Progress</span>
            <strong className="be-stat-val text-profit font-mono">
              {amortizationPct.toFixed(1)}%
            </strong>
          </div>
        </div>

        <div className="break-even-progress-shell">
          <div className="break-even-progress-track">
            <div
              className="break-even-progress-bar"
              style={{ width: `${amortizationPct}%` }}
            />
          </div>
          <div className="break-even-progress-labels">
            <span>€0.00 Initial</span>
            <span className="font-semibold text-profit">
              {amortizationPct.toFixed(1)}% Amortized
            </span>
            <span>{currencySymbol}{totalCapEx.toFixed(2)} Target</span>
          </div>
        </div>
      </div>

      {/* Spool Inventory Section */}
      <div className="calc-card inventory-section-card">
        <div className="calc-card-header">
          <div className="calc-card-title-wrap">
            <span className="step-icon-badge">
              <Package size={18} />
            </span>
            <div className="calc-card-headings">
              <h2 className="calc-card-title">Filament Spool Inventory</h2>
              <p className="calc-card-subtitle">
                Physical spools in your workshop with real-time stock levels
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={openAddSpoolModal}
          >
            <Plus size={16} /> Add Spool
          </button>
        </div>

        <div className="inventory-spool-grid">
          {spools.map((sp) => {
            const initialWeight = sp.initial_weight_g || 1000;
            const remainingWeight = sp.remaining_weight_g ?? 0;
            const pct = Math.min(
              100,
              Math.max(0, (remainingWeight / initialWeight) * 100)
            );
            const roundPct = Math.round(pct);
            const pricePerGram = (sp.spool_price / initialWeight).toFixed(4);

            // Dynamic progress bar color: vibrant emerald >= 30%, amber < 30%, red < 15%
            const progressColor =
              pct < 15 ? '#ef4444' : pct < 30 ? '#f59e0b' : '#10b981';

            return (
              <div key={sp.id} className="spool-card">
                {/* Top Row: Swatch, Code, Subtitle, and Actions */}
                <div className="spool-card-top">
                  <div className="spool-ident">
                    <span
                      className="spool-swatch"
                      style={{ backgroundColor: sp.color_hex }}
                    />
                    <div className="spool-title-block">
                      <span className="spool-code">{sp.code}</span>
                      <span className="spool-name">
                        {sp.brand} · {sp.material}
                      </span>
                    </div>
                  </div>
                  <div className="spool-actions">
                    <button
                      type="button"
                      className="btn-icon-subtle"
                      title="Edit spool / adjust grams"
                      onClick={() => openEditSpoolModal(sp)}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-subtle btn-delete"
                      title="Delete spool"
                      onClick={() => setSpoolToDelete(sp)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Color Name & Unit Cost Badge */}
                <div className="spool-card-mid">
                  <span className="spool-color-badge">{sp.color_name}</span>
                  <span className="spool-rate-badge">
                    {currencySymbol}{pricePerGram}/g
                  </span>
                </div>

                {/* Bottom Row: Weight Stats & Visible Progress Bar */}
                <div className="spool-card-bottom">
                  <div className="spool-weight-row">
                    <span className="spool-weight-label">
                      <strong>{remainingWeight}</strong> / {initialWeight} g
                    </span>
                    <span className="spool-weight-pct font-mono">
                      {roundPct}%
                    </span>
                  </div>
                  <div className="spool-progress-track">
                    <div
                      className="spool-progress-bar"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: progressColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Business Expenses (CapEx & OpEx) Section */}
      <div className="calc-card inventory-section-card">
        <div className="calc-card-header">
          <div className="calc-card-title-wrap">
            <span className="step-icon-badge">
              <Wrench size={18} />
            </span>
            <div className="calc-card-headings">
              <h2 className="calc-card-title">Business Expenses &amp; Investments</h2>
              <p className="calc-card-subtitle">
                Machinery, storage boxes, filament dryers, consumables, and upkeep costs
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={openAddExpenseModal}
          >
            <Plus size={16} /> Log Expense
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="history-empty-state">
            <DollarSign size={36} className="text-muted" />
            <p className="history-empty-title">No expenses logged yet.</p>
            <span className="field-hint">
              Log machine purchases, filament dryers, or parts to calculate your exact workshop ROI.
            </span>
          </div>
        ) : (
          <div className="history-table-container">
            <table className="history-table expenses-table">
              <colgroup>
                <col style={{ width: '125px' }} />
                <col />
                <col style={{ width: '140px' }} />
                <col style={{ width: '145px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '50px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '125px' }} className="table-cell-nowrap">Date</th>
                  <th>Concept</th>
                  <th style={{ width: '140px' }}>Supplier</th>
                  <th style={{ width: '145px' }} className="table-cell-nowrap">Category</th>
                  <th className="col-center">Type</th>
                  <th className="num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="text-muted font-mono table-cell-nowrap">{exp.date}</td>
                    <td>
                      <div className="history-project-name">{exp.concept}</div>
                      {exp.notes && (
                        <div className="table-subnote">{exp.notes}</div>
                      )}
                    </td>
                    <td>{exp.supplier}</td>
                    <td className="text-muted table-cell-nowrap">{exp.category}</td>
                    <td className="col-center">
                      <span
                        className={`expense-type-badge badge-${exp.expense_type.toLowerCase()}`}
                      >
                        {exp.expense_type}
                      </span>
                    </td>
                    <td className="num font-mono font-semibold table-cell-nowrap">
                      {currencySymbol}{exp.amount_eur.toFixed(2)}
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        className="btn-icon-subtle btn-delete"
                        title="Delete expense"
                        onClick={() => setExpenseToDelete(exp)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print & Sales History Section */}
      <div className="calc-card inventory-section-card">
        <div className="calc-card-header">
          <div className="calc-card-title-wrap">
            <span className="step-icon-badge">
              <Archive size={18} />
            </span>
            <div className="calc-card-headings">
              <h2 className="calc-card-title">Print &amp; Sales History</h2>
              <p className="calc-card-subtitle">
                Logged print runs, stock deductions, and sales performance
              </p>
            </div>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleExportCSV}
            >
              <Download size={15} /> Export CSV
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="history-empty-state">
            <Archive size={36} className="text-muted" />
            <p className="history-empty-title">No print jobs or sales logged yet.</p>
            <span className="field-hint">
              Calculate a print in the Calculator tab and click &ldquo;Log Print / Sale&rdquo; to record it.
            </span>
          </div>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <colgroup>
                <col style={{ width: '125px' }} />
                <col />
                <col style={{ width: '130px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '50px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '125px' }} className="table-cell-nowrap">Date</th>
                  <th>Project Name</th>
                  <th style={{ width: '130px' }}>Spool</th>
                  <th className="num">Grams</th>
                  <th className="col-center">Channel</th>
                  <th className="num">Cost</th>
                  <th className="num">Revenue</th>
                  <th className="num">Profit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const dateStr = new Date(h.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={h.id}>
                      <td className="text-muted table-cell-nowrap">{dateStr}</td>
                      <td>
                        <div className="history-project-name">{h.project_name}</div>
                        {h.notes && (
                          <div className="table-subnote">{h.notes}</div>
                        )}
                        {h.multicolor_deductions && h.multicolor_deductions.length > 0 && (
                          <div className="table-multicolor-row">
                            {h.multicolor_deductions.map((d, idx) => (
                              <span
                                key={idx}
                                className="table-multicolor-chip"
                                title={`${d.spool_code || d.spool_id}: ${d.grams_used}g`}
                              >
                                <span
                                  className="table-dot"
                                  style={{ backgroundColor: d.color_hex || '#888' }}
                                />
                                {d.grams_used}g
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="table-spool-pill">
                          <span
                            className="table-dot"
                            style={{ backgroundColor: h.spool_color_hex || '#888' }}
                          />
                          <span>{h.spool_code || h.spool_id}</span>
                        </span>
                      </td>
                      <td className="num font-mono">{h.grams_used}g</td>
                      <td className="col-center">
                        <span className={`channel-pill channel-${(h.sales_channel || 'direct').toLowerCase()}`}>
                          {h.sales_channel}
                        </span>
                      </td>
                      <td className="num font-mono text-muted">
                        {currencySymbol}
                        {h.production_cost.toFixed(2)}
                      </td>
                      <td className="num font-mono">
                        {h.record_type === 'sale' ? (
                          `${currencySymbol}${h.selling_price.toFixed(2)}`
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className={`num font-mono ${h.net_profit >= 0 ? 'text-profit font-semibold' : 'text-danger'}`}>
                        {currencySymbol}
                        {h.net_profit.toFixed(2)}
                      </td>
                      <td className="num">
                        <button
                          type="button"
                          className="btn-icon-subtle btn-delete"
                          title="Delete history record & restore stock"
                          onClick={() => setHistoryItemToDelete(h)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Spool Modal */}
      {isSpoolModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSpoolModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSpool ? 'Edit Spool' : 'Add New Filament Spool'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsSpoolModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSpool} className="modal-body">
              <div className="field-grid-2">
                <div className="field-group">
                  <label className="field-label">Spool Code</label>
                  <input
                    type="text"
                    className="field-input"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Brand</label>
                  <input
                    type="text"
                    className="field-input"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field-grid-2">
                <div className="field-group">
                  <label className="field-label">Material Type</label>
                  <input
                    type="text"
                    className="field-input"
                    value={formMaterial}
                    onChange={(e) => setFormMaterial(e.target.value)}
                    placeholder="e.g. PETG Matte, PLA Basic"
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Color Name</label>
                  <input
                    type="text"
                    className="field-input"
                    value={formColorName}
                    onChange={(e) => setFormColorName(e.target.value)}
                    placeholder="e.g. Baby Blue #1"
                    required
                  />
                </div>
              </div>

              <div className="field-grid-2">
                <div className="field-group">
                  <label className="field-label">Color Hex Swatch</label>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      className="color-picker-input"
                      value={formColorHex}
                      onChange={(e) => setFormColorHex(e.target.value)}
                    />
                    <input
                      type="text"
                      className="field-input"
                      value={formColorHex}
                      onChange={(e) => setFormColorHex(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Spool Price ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="field-input"
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="field-grid-2">
                <div className="field-group">
                  <label className="field-label">Initial Weight (g)</label>
                  <input
                    type="number"
                    step="10"
                    min="1"
                    className="field-input"
                    value={formInitialWeight}
                    onChange={(e) => setFormInitialWeight(parseFloat(e.target.value) || 1000)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Remaining Weight (g)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="field-input"
                    value={formRemainingWeight}
                    onChange={(e) => setFormRemainingWeight(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsSpoolModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Spool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsExpenseModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3 className="modal-title">Log Workshop Expense / Investment</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsExpenseModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="modal-body">
              <div className="field-grid-2">
                <div className="field-group">
                  <label className="field-label">Date</label>
                  <input
                    type="date"
                    className="field-input"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Supplier / Platform</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Bambu Lab EU, Amazon, AliExpress"
                    value={expSupplier}
                    onChange={(e) => setExpSupplier(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Concept / Item Description</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Creality Space Pi Plus Filament Dryer"
                  value={expConcept}
                  onChange={(e) => setExpConcept(e.target.value)}
                  required
                />
              </div>

              <div className="field-grid-2">
                <div className="field-group">
                  <label className="field-label">Category</label>
                  <select
                    className="field-select"
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                  >
                    <option value="Machinery">Machinery (Printers, Dryers)</option>
                    <option value="Materials">Materials &amp; Spools</option>
                    <option value="Storage & Parts">Storage &amp; Parts (Boxes, PTFE, Bearings)</option>
                    <option value="Furniture">Furniture &amp; Workshop Setup</option>
                    <option value="Consumables">Consumables (Nozzles, Glue, IPA)</option>
                    <option value="Maintenance">Maintenance &amp; Repairs</option>
                    <option value="Other">Other Business Expense</option>
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">Expense Classification</label>
                  <div className="segmented-toggle-row">
                    <button
                      type="button"
                      className={`segmented-btn ${expType === 'CapEx' ? 'is-active' : ''}`}
                      onClick={() => setExpType('CapEx')}
                    >
                      CapEx (Capital)
                    </button>
                    <button
                      type="button"
                      className={`segmented-btn ${expType === 'OpEx' ? 'is-active' : ''}`}
                      onClick={() => setExpType('OpEx')}
                    >
                      OpEx (Operational)
                    </button>
                  </div>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Amount Incurred ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="field-input font-mono"
                  placeholder="0.00"
                  value={expAmount || ''}
                  onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-label">Notes (Optional)</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. 2-year warranty included, order #1928"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsExpenseModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Spool Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(spoolToDelete)}
        title="Delete Filament Spool"
        message={
          spoolToDelete
            ? `Are you sure you want to delete spool ${spoolToDelete.code} (${spoolToDelete.brand} ${spoolToDelete.material} ${spoolToDelete.color_name})? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Spool"
        onConfirm={async () => {
          if (spoolToDelete) {
            await onDeleteSpool(spoolToDelete.id);
            setSpoolToDelete(null);
          }
        }}
        onClose={() => setSpoolToDelete(null)}
      />

      {/* Confirm Delete Expense Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense"
        message={
          expenseToDelete
            ? `Are you sure you want to delete "${expenseToDelete.concept}" (${currencySymbol}${expenseToDelete.amount_eur.toFixed(2)})? This will remove it from your workshop CapEx/OpEx and amortization calculations.`
            : ''
        }
        confirmLabel="Delete Expense"
        onConfirm={async () => {
          if (expenseToDelete) {
            await onDeleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onClose={() => setExpenseToDelete(null)}
      />

      {/* Confirm Delete History Record Modal with Stock Restoration */}
      <ConfirmDeleteModal
        isOpen={Boolean(historyItemToDelete)}
        title="Delete Print & Sales History Record"
        message={
          historyItemToDelete
            ? (historyItemToDelete.deductions && historyItemToDelete.deductions.length > 1) ||
              (historyItemToDelete.multicolor_deductions &&
                historyItemToDelete.multicolor_deductions.length > 1)
              ? `Deleting this record will also restore ${historyItemToDelete.grams_used}g back across ${
                  historyItemToDelete.deductions?.length ||
                  historyItemToDelete.multicolor_deductions?.length
                } spools in your workshop inventory.`
              : `Deleting this record will also restore ${historyItemToDelete.grams_used}g back to ${
                  historyItemToDelete.spool_color_name ||
                  historyItemToDelete.spool_code ||
                  'spool'
                }.`
            : ''
        }
        confirmLabel="Delete & Restore Stock"
        onConfirm={async () => {
          if (historyItemToDelete) {
            await onDeleteHistoryItem(historyItemToDelete.id);
            setHistoryItemToDelete(null);
          }
        }}
        onClose={() => setHistoryItemToDelete(null)}
      />
    </div>
  );
}
