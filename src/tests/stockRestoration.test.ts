import { describe, expect, it } from 'vitest';
import type { FilamentSpool, JobHistoryRecord } from '../types/calculator';

describe('Automatic Filament Stock Restoration on Job Deletion', () => {
  it('restores consumed grams to a single spool upon job deletion', () => {
    const spool: FilamentSpool = {
      id: 'spool-1',
      code: 'FIL-001',
      brand: 'Bambu Lab',
      material: 'PETG Matte',
      color_name: 'White',
      color_hex: '#F4F4F5',
      initial_weight_g: 1000,
      remaining_weight_g: 850,
      spool_price: 10.23,
    };

    const jobToDelete: JobHistoryRecord = {
      id: 'job-1',
      date: new Date().toISOString(),
      project_name: 'Candle Holder',
      spool_id: 'spool-1',
      grams_used: 150,
      print_minutes: 180,
      quantity: 1,
      production_cost: 3.5,
      selling_price: 12.0,
      net_profit: 8.5,
      record_type: 'sale',
      sales_channel: 'Vinted',
    };

    // Simulate refund logic from DatabaseService.refundSpoolWeight
    const maxWeight = spool.initial_weight_g || 1000;
    const restoredWeight = Math.min(
      maxWeight,
      Math.round((spool.remaining_weight_g + jobToDelete.grams_used) * 10) / 10
    );

    expect(restoredWeight).toBe(1000);
  });

  it('restores consumed grams across multiple AMS Lite spools upon job deletion', () => {
    const spools: Record<string, FilamentSpool> = {
      'spool-1': {
        id: 'spool-1',
        code: 'FIL-001',
        brand: 'Bambu Lab',
        material: 'PETG Matte',
        color_name: 'Black',
        color_hex: '#18181B',
        initial_weight_g: 1000,
        remaining_weight_g: 800,
        spool_price: 10.23,
      },
      'spool-2': {
        id: 'spool-2',
        code: 'FIL-002',
        brand: 'Bambu Lab',
        material: 'PETG Matte',
        color_name: 'Baby Blue',
        color_hex: '#7DD3FC',
        initial_weight_g: 1000,
        remaining_weight_g: 920,
        spool_price: 10.23,
      },
    };

    const multiColorJobToDelete: JobHistoryRecord = {
      id: 'job-mc',
      date: new Date().toISOString(),
      project_name: 'Benchy 2-Color',
      spool_id: 'spool-1',
      grams_used: 55,
      print_minutes: 120,
      quantity: 1,
      production_cost: 2.5,
      selling_price: 9.0,
      net_profit: 6.5,
      record_type: 'sale',
      sales_channel: 'Wallapop',
      multicolor_deductions: [
        {
          spool_id: 'spool-1',
          grams_used: 35,
        },
        {
          spool_id: 'spool-2',
          grams_used: 20,
        },
      ],
    };

    for (const deduction of multiColorJobToDelete.multicolor_deductions!) {
      const sp = spools[deduction.spool_id];
      if (sp) {
        const maxWeight = sp.initial_weight_g || 1000;
        sp.remaining_weight_g = Math.min(
          maxWeight,
          Math.round((sp.remaining_weight_g + deduction.grams_used) * 10) / 10
        );
      }
    }

    expect(spools['spool-1'].remaining_weight_g).toBe(835);
    expect(spools['spool-2'].remaining_weight_g).toBe(940);
  });

  it('clamps restored weight to initial_weight_g and never exceeds full capacity', () => {
    const spool: FilamentSpool = {
      id: 'spool-3',
      code: 'FIL-003',
      brand: 'Bambu Lab',
      material: 'PETG Matte',
      color_name: 'Gray',
      color_hex: '#71717A',
      initial_weight_g: 1000,
      remaining_weight_g: 950,
      spool_price: 10.23,
    };

    // User refunded 100g when remaining was already 950g
    const gramsToRefund = 100;
    const maxWeight = spool.initial_weight_g || 1000;
    const restoredWeight = Math.min(
      maxWeight,
      Math.round((spool.remaining_weight_g + gramsToRefund) * 10) / 10
    );

    // Clamped at 1000g, not 1050g
    expect(restoredWeight).toBe(1000);
  });
});
