import {
  Archive,
  Download,
  Edit2,
  Package,
  Plus,
  Scale,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { CURRENCIES } from '../constants/defaults';
import type {
  CurrencyCode,
  FilamentSpool,
  JobHistoryRecord,
} from '../types/calculator';

interface InventoryViewProps {
  spools: FilamentSpool[];
  history: JobHistoryRecord[];
  currency: CurrencyCode;
  onAddSpool: (spool: FilamentSpool) => Promise<void>;
  onUpdateSpool: (spool: FilamentSpool) => Promise<void>;
  onDeleteSpool: (id: string) => Promise<void>;
  onDeleteHistoryItem: (id: string) => Promise<void>;
}

export function InventoryView({
  spools,
  history,
  currency,
  onAddSpool,
  onUpdateSpool,
  onDeleteSpool,
  onDeleteHistoryItem,
}: InventoryViewProps) {
  const currencySymbol = CURRENCIES[currency]?.symbol || '€';

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

  // Modal State for Adding/Editing a Spool
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

  const openAddModal = () => {
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

  const openEditModal = (sp: FilamentSpool) => {
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

      {/* Spool Inventory Section */}
      <div className="calc-card">
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
            onClick={openAddModal}
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
                      onClick={() => openEditModal(sp)}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-subtle btn-delete"
                      title="Delete spool"
                      onClick={() => {
                        if (confirm(`Delete spool ${sp.code} (${sp.color_name})?`)) {
                          onDeleteSpool(sp.id);
                        }
                      }}
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

      {/* Print & Sales History Section */}
      <div className="calc-card">
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
                <col style={{ width: '110px' }} />
                <col />
                <col style={{ width: '110px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '115px' }} />
                <col style={{ width: '95px' }} />
                <col style={{ width: '95px' }} />
                <col style={{ width: '95px' }} />
                <col style={{ width: '52px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project Name</th>
                  <th>Spool</th>
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
                      <td className="text-muted">{dateStr}</td>
                      <td>
                        <div className="history-project-name">{h.project_name}</div>
                        {h.notes && (
                          <div className="table-subnote">{h.notes}</div>
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
                          title="Delete history record"
                          onClick={() => {
                            if (confirm('Delete this history record? (Filament will not be returned automatically)')) {
                              onDeleteHistoryItem(h.id);
                            }
                          }}
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
    </div>
  );
}
