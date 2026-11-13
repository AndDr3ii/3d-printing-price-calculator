import { CheckCircle2, DollarSign, PackageMinus, X } from 'lucide-react';
import { useState } from 'react';
import { CURRENCIES } from '../constants/defaults';
import type {
  CalculationResult,
  CalculatorState,
  FilamentSpool,
  JobHistoryRecord,
  RecordType,
  SalesChannel,
} from '../types/calculator';

interface LogPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CalculatorState;
  result: CalculationResult;
  spools: FilamentSpool[];
  onConfirm: (record: JobHistoryRecord, deductSpoolId: string, gramsToDeduct: number) => Promise<void>;
}

export function LogPrintModal({
  isOpen,
  onClose,
  state,
  result,
  spools,
  onConfirm,
}: LogPrintModalProps) {
  const qty = Math.max(1, Math.floor(state.quantity) || 1);
  const currencySymbol = CURRENCIES[state.currency]?.symbol || '€';

  // Total filament grams consumed = modelWeight * quantity * (1 + failedPrintsMarkup / 100)
  const failureMultiplier = 1 + (state.failedPrintsMarkup || 0) / 100;
  const totalGramsConsumed = Math.round(state.modelWeight * qty * failureMultiplier * 10) / 10;
  const printMinutes = Math.round(result.totalPrintHours * 60 * qty);

  const [recordType, setRecordType] = useState<RecordType>('sale');
  const [salesChannel, setSalesChannel] = useState<SalesChannel>('Vinted');
  const [soldPrice, setSoldPrice] = useState<string>(
    result.batchSellingPrice.toFixed(2)
  );
  const [selectedSpoolId, setSelectedSpoolId] = useState<string>(
    state.selectedSpoolId || (spools.length > 0 ? spools[0].id : '')
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedSpool = spools.find((s) => s.id === selectedSpoolId);
  const numericSoldPrice = parseFloat(soldPrice) || 0;
  const calculatedProfit =
    recordType === 'sale'
      ? numericSoldPrice - result.batchProductionCost
      : -result.batchProductionCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpoolId) return;

    setIsSubmitting(true);
    try {
      const record: JobHistoryRecord = {
        id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: new Date().toISOString(),
        project_name: state.jobName || 'Custom 3D Print Job',
        spool_id: selectedSpoolId,
        spool_code: selectedSpool?.code,
        spool_color_name: selectedSpool?.color_name,
        spool_color_hex: selectedSpool?.color_hex,
        grams_used: totalGramsConsumed,
        print_minutes: printMinutes,
        quantity: qty,
        production_cost: Math.round(result.batchProductionCost * 100) / 100,
        selling_price: recordType === 'sale' ? Math.round(numericSoldPrice * 100) / 100 : 0,
        net_profit: Math.round(calculatedProfit * 100) / 100,
        record_type: recordType,
        sales_channel: recordType === 'sale' ? salesChannel : 'Internal',
        notes: notes.trim(),
      };

      await onConfirm(record, selectedSpoolId, totalGramsConsumed);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-header-title-wrap">
            <span className="modal-icon-badge">
              <PackageMinus size={20} />
            </span>
            <div>
              <h3 className="modal-title">Log Print &amp; Deduct Stock</h3>
              <p className="modal-subtitle">
                Record this job into SQLite history and update your spool inventory
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Summary Banner */}
          <div className="modal-summary-banner">
            <div className="modal-banner-col">
              <span className="modal-banner-label">Job Name</span>
              <strong className="modal-banner-val">{state.jobName || '3D Print Job'}</strong>
            </div>
            <div className="modal-banner-col">
              <span className="modal-banner-label">Quantity</span>
              <strong className="modal-banner-val">{qty}x units</strong>
            </div>
            <div className="modal-banner-col">
              <span className="modal-banner-label">Grams to Deduct</span>
              <strong className="modal-banner-val font-mono text-accent">
                {totalGramsConsumed} g
              </strong>
            </div>
          </div>

          {/* Spool Selection for Deduction */}
          <div className="field-group">
            <label htmlFor="modal-spool-select" className="field-label">
              Filament Spool to Deduct
            </label>
            <select
              id="modal-spool-select"
              className="field-select"
              value={selectedSpoolId}
              onChange={(e) => setSelectedSpoolId(e.target.value)}
              required
            >
              {spools.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.code} · {sp.brand} {sp.material} {sp.color_name} ({sp.remaining_weight_g}g remaining)
                </option>
              ))}
            </select>
            {selectedSpool && (
              <span className="field-hint">
                Remaining after deduction:{' '}
                <strong>
                  {Math.max(0, Math.round((selectedSpool.remaining_weight_g - totalGramsConsumed) * 10) / 10)} g
                </strong>
              </span>
            )}
          </div>

          {/* Record Type Toggle */}
          <div className="field-group">
            <label className="field-label">Record Type</label>
            <div className="segmented-toggle-row">
              <button
                type="button"
                className={`segmented-btn ${recordType === 'sale' ? 'is-active' : ''}`}
                onClick={() => setRecordType('sale')}
              >
                <DollarSign size={14} /> Confirmed Sale
              </button>
              <button
                type="button"
                className={`segmented-btn ${recordType === 'print_only' ? 'is-active' : ''}`}
                onClick={() => setRecordType('print_only')}
              >
                <PackageMinus size={14} /> Internal / Prototype Print
              </button>
            </div>
          </div>

          {/* Confirmed Sale Details */}
          {recordType === 'sale' && (
            <div className="field-grid-2">
              <div className="field-group">
                <label htmlFor="modal-channel-select" className="field-label">
                  Sales Channel
                </label>
                <select
                  id="modal-channel-select"
                  className="field-select"
                  value={salesChannel}
                  onChange={(e) => setSalesChannel(e.target.value as SalesChannel)}
                >
                  <option value="Vinted">Vinted</option>
                  <option value="Wallapop">Wallapop</option>
                  <option value="Etsy">Etsy</option>
                  <option value="Direct">Direct / Local Customer</option>
                  <option value="Other">Other Marketplace</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="modal-price-input" className="field-label">
                  Final Sold Price ({currencySymbol})
                </label>
                <div className="input-shell">
                  <span className="input-affix input-prefix">{currencySymbol}</span>
                  <input
                    id="modal-price-input"
                    type="number"
                    step="0.01"
                    min="0"
                    className="field-input has-prefix"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Calculated Profit Indicator */}
          <div className="modal-profit-card">
            <span>
              {recordType === 'sale' ? 'Estimated Net Profit:' : 'Operational Cost Incurred:'}
            </span>
            <strong className={calculatedProfit >= 0 ? 'text-profit font-mono' : 'text-danger font-mono'}>
              {currencySymbol}
              {calculatedProfit.toFixed(2)}
            </strong>
          </div>

          {/* Notes */}
          <div className="field-group">
            <label htmlFor="modal-notes" className="field-label">
              Notes / Client Reference (Optional)
            </label>
            <input
              id="modal-notes"
              type="text"
              className="field-input"
              placeholder="e.g. Order #4829, shipped with bubble wrap"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={150}
            />
          </div>

          {/* Action Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !selectedSpoolId}
            >
              <CheckCircle2 size={16} />
              {isSubmitting ? 'Recording...' : 'Confirm & Deduct'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
