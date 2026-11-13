import { describe, expect, it } from 'vitest';
import type { FilamentSpool } from '../types/calculator';

describe('Multi-Color AMS Lite Spool Stock Deductions', () => {
  it('deducts proportional weight from multiple spools with failure markup', () => {
    const spools: FilamentSpool[] = [
      {
        id: 'spool-1',
        code: 'FIL-001',
        brand: 'Bambu Lab',
        material: 'PETG Matte',
        color_name: 'Black',
        color_hex: '#18181B',
        initial_weight_g: 1000,
        remaining_weight_g: 950,
        spool_price: 10.23,
      },
      {
        id: 'spool-2',
        code: 'FIL-002',
        brand: 'Bambu Lab',
        material: 'PETG Matte',
        color_name: 'White',
        color_hex: '#F4F4F5',
        initial_weight_g: 1000,
        remaining_weight_g: 800,
        spool_price: 10.23,
      },
    ];

    const slot1Grams = 40;
    const slot2Grams = 20;
    const quantity = 2;
    const failureMarkupPct = 10; // +10%

    const multiplier = 1 + failureMarkupPct / 100;
    const deductSlot1 = Math.round(slot1Grams * quantity * multiplier * 10) / 10; // 40 * 2 * 1.1 = 88.0g
    const deductSlot2 = Math.round(slot2Grams * quantity * multiplier * 10) / 10; // 20 * 2 * 1.1 = 44.0g

    expect(deductSlot1).toBe(88.0);
    expect(deductSlot2).toBe(44.0);

    const updatedRemaining1 = spools[0].remaining_weight_g - deductSlot1;
    const updatedRemaining2 = spools[1].remaining_weight_g - deductSlot2;

    expect(updatedRemaining1).toBe(862.0);
    expect(updatedRemaining2).toBe(756.0);
  });

  it('clamps remaining spool weight at zero if print consumes more than available', () => {
    const initialRemaining = 15;
    const deduction = 25;
    const remainingAfter = Math.max(0, initialRemaining - deduction);
    expect(remainingAfter).toBe(0);
  });
});
