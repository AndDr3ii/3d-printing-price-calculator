import { describe, expect, it } from 'vitest';
import type { ExpenseItem } from '../types/calculator';

describe('CapEx / OpEx & Workshop ROI Amortization Math', () => {
  const initialExpenses: ExpenseItem[] = [
    {
      id: 'exp-1',
      date: '2026-10-31',
      supplier: 'Bambu Lab EU',
      concept: 'Bambu Lab A1 Combo (con AMS Lite)',
      category: 'Machinery',
      expense_type: 'CapEx',
      amount_eur: 344.7,
    },
    {
      id: 'exp-2',
      date: '2026-10-31',
      supplier: 'Bambu Lab EU',
      concept: '6x Bambu PETG Matte 1kg Spools',
      category: 'Materials',
      expense_type: 'CapEx',
      amount_eur: 61.4,
    },
    {
      id: 'exp-3',
      date: '2026-11-03',
      supplier: 'AliExpress',
      concept: 'Creality Space Pi Plus Filament Dryer',
      category: 'Machinery',
      expense_type: 'CapEx',
      amount_eur: 67.99,
    },
    {
      id: 'exp-4',
      date: '2026-11-10',
      supplier: 'Amazon EU',
      concept: 'ISOLATECH Silica Gel 900g + PTFE + PC4',
      category: 'Storage & Parts',
      expense_type: 'CapEx',
      amount_eur: 21.48,
    },
    {
      id: 'exp-5',
      date: '2026-11-10',
      supplier: 'Amazon EU',
      concept: 'Dry-Box System (6x 3.7L containers + hygrometers + 608ZZ)',
      category: 'Storage & Parts',
      expense_type: 'CapEx',
      amount_eur: 53.97,
    },
    {
      id: 'exp-6',
      date: '2026-11-11',
      supplier: 'Wallapop',
      concept: 'IKEA STUVA MALAD Workshop Cabinet',
      category: 'Furniture',
      expense_type: 'CapEx',
      amount_eur: 15.15,
    },
    {
      id: 'exp-7',
      date: '2026-11-12',
      supplier: 'Amazon EU',
      concept: 'IPA Alcohol 99.9% 1L',
      category: 'Consumables',
      expense_type: 'OpEx',
      amount_eur: 9.99,
    },
  ];

  it('correctly sums initial CapEx startup costs to €564.69', () => {
    const totalCapEx = initialExpenses
      .filter((e) => e.expense_type === 'CapEx')
      .reduce((sum, e) => sum + e.amount_eur, 0);

    expect(Number(totalCapEx.toFixed(2))).toBe(564.69);
  });

  it('calculates remaining capital to break-even and amortization progress %', () => {
    const totalCapEx = 564.69;
    const netProfitRecovered = 141.17; // 25% recovered

    const remainingBreakEven = Math.max(0, totalCapEx - netProfitRecovered);
    const amortizationPct = Math.min(100, Math.max(0, (netProfitRecovered / totalCapEx) * 100));

    expect(Number(remainingBreakEven.toFixed(2))).toBe(423.52);
    expect(Number(amortizationPct.toFixed(1))).toBe(25.0);
  });

  it('caps amortization progress at 100% when profits exceed CapEx', () => {
    const totalCapEx = 564.69;
    const netProfitRecovered = 800.0; // Break-even reached and exceeded

    const remainingBreakEven = Math.max(0, totalCapEx - netProfitRecovered);
    const amortizationPct = Math.min(100, Math.max(0, (netProfitRecovered / totalCapEx) * 100));

    expect(remainingBreakEven).toBe(0);
    expect(amortizationPct).toBe(100);
  });
});
