import {
  Check,
  Copy,
  Printer as PrintIcon,
  RotateCcw,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import type { CalculationResult, CalculatorState } from '../types/calculator';
import {
  formatCurrency,
  formatDuration,
  generateCustomerQuote,
} from '../utils/calculations';
import { serializeStateToUrl } from '../utils/urlSharing';
import { DonutChart } from './DonutChart';

interface SummaryDashboardProps {
  state: CalculatorState;
  result: CalculationResult;
  onReset: () => void;
  onVatChange: (vat: number) => void;
}

export function SummaryDashboard({
  state,
  result,
  onReset,
  onVatChange,
}: SummaryDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const qty = Math.max(1, Math.floor(state.quantity) || 1);
  const isBatch = qty > 1;

  const handleCopyQuote = async () => {
    const quoteText = generateCustomerQuote(state, result);
    try {
      await navigator.clipboard.writeText(quoteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = quoteText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleShareUrl = async () => {
    const shareUrl = serializeStateToUrl(state);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2200);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShared(true);
      setTimeout(() => setShared(false), 2200);
    }
  };

  const handlePrintQuote = () => {
    window.print();
  };

  return (
    <aside className="summary-panel" aria-label="Live cost and price summary">
      {/* Hero Price Card */}
      <div className="hero-card">
        <div className="hero-top-row">
          <span className="hero-eyebrow">Recommended Selling Price</span>
          <span className="hero-meta-pill">
            {formatDuration(result.totalPrintHours)} print • {state.modelWeight}g
          </span>
        </div>

        <div className="hero-price-row">
          <div className="hero-main-price">
            {formatCurrency(result.finalUnitSellingPrice, state.currency)}
            <span className="hero-unit-label">/ unit</span>
          </div>
          {isBatch && (
            <div className="hero-batch-box">
              <span className="hero-batch-label">
                Total Batch ({qty} units)
              </span>
              <span className="hero-batch-value">
                {formatCurrency(result.batchSellingPrice, state.currency)}
              </span>
            </div>
          )}
        </div>

        <div className="hero-kpi-grid">
          <div className="kpi-box">
            <span className="kpi-label">Total Production Cost</span>
            <span className="kpi-value">
              {formatCurrency(result.totalProductionCost, state.currency)}
            </span>
            {isBatch && (
              <span className="kpi-sub">
                Batch: {formatCurrency(result.batchProductionCost, state.currency)}
              </span>
            )}
          </div>

          <div className="kpi-box kpi-profit">
            <span className="kpi-label">
              <TrendingUp size={13} /> Net Profit
            </span>
            <span className="kpi-value">
              {formatCurrency(result.netProfitPerUnit, state.currency)}
            </span>
            {isBatch && (
              <span className="kpi-sub">
                Batch: {formatCurrency(result.batchNetProfit, state.currency)}
              </span>
            )}
          </div>
        </div>

        {/* VAT / Tax In-Dashboard Control */}
        <div className="dashboard-vat-row">
          <label htmlFor="dashboard-vat" className="vat-label">
            VAT / Tax Rate (%):
          </label>
          <div className="vat-input-shell">
            <input
              id="dashboard-vat"
              type="number"
              inputMode="decimal"
              className="field-input vat-input"
              min="0"
              max="100"
              step="1"
              value={state.vatPercent}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onVatChange(Number.isFinite(val) && val >= 0 ? val : 0);
              }}
            />
            <span className="vat-suffix">%</span>
          </div>
        </div>
      </div>

      {/* Interactive Donut Chart Card */}
      <div className="summary-card">
        <div className="summary-card-header">
          <h3 className="summary-card-title">Cost &amp; Profit Distribution</h3>
          <span className="summary-card-sub">Per unit share</span>
        </div>
        <DonutChart
          items={result.breakdown}
          totalAmount={result.finalUnitSellingPrice}
          currency={state.currency}
        />
      </div>

      {/* Itemized Breakdown Table */}
      <div className="summary-card">
        <div className="summary-card-header">
          <h3 className="summary-card-title">Itemized Breakdown</h3>
          <span className="summary-card-sub">
            {isBatch ? `Unit & ${qty}x Batch` : 'Per unit'}
          </span>
        </div>

        <div className="breakdown-table-wrap">
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Component</th>
                <th className="num">Unit</th>
                {isBatch && <th className="num">Batch ({qty}×)</th>}
                <th className="num">Share</th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map((item) => (
                <tr
                  key={item.id}
                  className={item.id === 'profit' ? 'row-profit' : ''}
                >
                  <td>
                    <span className="table-dot-label">
                      <span
                        className="table-dot"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </span>
                  </td>
                  <td className="num mono">
                    {formatCurrency(item.unitAmount, state.currency)}
                  </td>
                  {isBatch && (
                    <td className="num mono">
                      {formatCurrency(item.batchAmount, state.currency)}
                    </td>
                  )}
                  <td className="num mono pct-col">
                    {item.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="subtotal-row">
                <td>Total Production Cost</td>
                <td className="num mono">
                  {formatCurrency(result.totalProductionCost, state.currency)}
                </td>
                {isBatch && (
                  <td className="num mono">
                    {formatCurrency(result.batchProductionCost, state.currency)}
                  </td>
                )}
                <td className="num mono">
                  {result.finalUnitSellingPrice > 0
                    ? (
                        (result.totalProductionCost /
                          result.finalUnitSellingPrice) *
                        100
                      ).toFixed(1)
                    : '0.0'}
                  %
                </td>
              </tr>
              <tr className="total-row">
                <td>Recommended Selling Price</td>
                <td className="num mono">
                  {formatCurrency(result.finalUnitSellingPrice, state.currency)}
                </td>
                {isBatch && (
                  <td className="num mono">
                    {formatCurrency(result.batchSellingPrice, state.currency)}
                  </td>
                )}
                <td className="num mono">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Buttons: Customer Quote, Print/PDF, Share URL, Reset */}
      <div className="action-button-stack">
        <div className="action-row-main">
          <button
            type="button"
            className={`btn-primary ${copied ? 'is-copied' : ''}`}
            onClick={handleCopyQuote}
          >
            {copied ? (
              <>
                <Check size={17} /> Quote Copied!
              </>
            ) : (
              <>
                <Copy size={17} /> Copy Customer Quote
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrintQuote}
            title="Export or print customer-ready PDF quote"
          >
            <PrintIcon size={17} /> Export PDF
          </button>
        </div>

        <div className="action-row-aux">
          <button
            type="button"
            className={`btn-secondary ${shared ? 'is-copied' : ''}`}
            onClick={handleShareUrl}
            title="Copy URL with current inputs to share"
          >
            {shared ? (
              <>
                <Check size={15} /> Link Copied!
              </>
            ) : (
              <>
                <Share2 size={15} /> Share Calculator
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={onReset}
            title="Reset all fields to standard baseline defaults"
          >
            <RotateCcw size={15} /> Reset Defaults
          </button>
        </div>
      </div>
    </aside>
  );
}
