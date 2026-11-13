import { useState } from 'react';
import type { CalculationResult, CalculatorState } from '../types/calculator';
import { formatCurrency, formatDuration } from '../utils/calculations';

interface PrintInvoiceProps {
  state: CalculatorState;
  result: CalculationResult;
}

function getInitialDateInfo() {
  if (typeof window === 'undefined') {
    return { year: '2026', todayStr: 'November 12, 2026' };
  }
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    todayStr: now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}

export function PrintInvoice({ state, result }: PrintInvoiceProps) {
  const qty = Math.max(1, Math.floor(state.quantity) || 1);
  const isBatch = qty > 1;

  const [dateInfo] = useState(getInitialDateInfo);

  const hash = Math.abs(
    (state.jobName || 'JOB')
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 1000)
  );
  const quoteRef = `3D-${hash}-${dateInfo.year}`;

  return (
    <div className="print-quote-document" aria-hidden="true">
      <div className="print-quote-header">
        <div className="print-quote-brand">
          <h1 className="print-quote-title">3D Printing Price Quote</h1>
          <p className="print-quote-subtitle">
            Professional Additive Manufacturing Service
          </p>
        </div>
        <div className="print-quote-meta">
          <div className="print-meta-line">
            <span className="print-meta-label">Quote Ref:</span>
            <strong>{quoteRef}</strong>
          </div>
          <div className="print-meta-line">
            <span className="print-meta-label">Date:</span>
            <span>{dateInfo.todayStr}</span>
          </div>
        </div>
      </div>

      <div className="print-quote-divider" />

      <div className="print-job-card">
        <div className="print-job-title-row">
          <span className="print-section-eyebrow">Project / Job</span>
          <h2 className="print-job-name">{state.jobName || 'Custom 3D Print Job'}</h2>
        </div>

        <div className="print-spec-grid">
          <div className="print-spec-item">
            <span className="print-spec-label">Material</span>
            <span className="print-spec-val">
              {state.filamentType === 'Custom' ? 'Custom Filament' : state.filamentType}
            </span>
          </div>
          <div className="print-spec-item">
            <span className="print-spec-label">Part Weight</span>
            <span className="print-spec-val">{state.modelWeight} g</span>
          </div>
          <div className="print-spec-item">
            <span className="print-spec-label">Print Duration</span>
            <span className="print-spec-val">
              {formatDuration(result.totalPrintHours)}
            </span>
          </div>
          <div className="print-spec-item">
            <span className="print-spec-label">Quantity</span>
            <span className="print-spec-val">
              {qty} {qty === 1 ? 'unit' : 'units'}
            </span>
          </div>
        </div>
      </div>

      {state.otherCosts && state.otherCosts.length > 0 && (
        <div className="print-included-hardware">
          <span className="print-spec-label">Included Hardware &amp; Consumables:</span>
          <ul className="print-hardware-list">
            {state.otherCosts.map((it) => (
              <li key={it.id}>{it.name || 'Component'}</li>
            ))}
          </ul>
        </div>
      )}

      <table className="print-price-table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Quantity</th>
            <th className="num">Unit Price</th>
            <th className="num">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>{state.jobName || '3D Printed Component'}</strong>
              <div className="print-subdesc">
                High precision FDM 3D printing in {state.filamentType}
              </div>
            </td>
            <td className="num">{qty}</td>
            <td className="num">
              {formatCurrency(result.sellingPricePreVat, state.currency)}
            </td>
            <td className="num">
              {formatCurrency(result.sellingPricePreVat * qty, state.currency)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} />
            <td className="num print-tfoot-label">Subtotal:</td>
            <td className="num print-tfoot-val">
              {formatCurrency(result.sellingPricePreVat * qty, state.currency)}
            </td>
          </tr>
          {state.vatPercent > 0 && (
            <tr>
              <td colSpan={2} />
              <td className="num print-tfoot-label">
                VAT / Tax ({state.vatPercent}%):
              </td>
              <td className="num print-tfoot-val">
                {formatCurrency(result.vatPerUnit * qty, state.currency)}
              </td>
            </tr>
          )}
          <tr className="print-grand-total-row">
            <td colSpan={2} />
            <td className="num print-grand-label">
              {isBatch ? 'Total Order Price:' : 'Total Price:'}
            </td>
            <td className="num print-grand-val">
              {formatCurrency(result.batchSellingPrice, state.currency)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="print-footer-note">
        <p>
          This quote is generated for customer presentation. All operational,
          machine upkeep, and internal rates are kept strictly confidential.
        </p>
      </div>
    </div>
  );
}
