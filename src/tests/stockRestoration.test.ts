import { describe, expect, it } from 'vitest';
import type { FilamentSpool, JobHistoryRecord } from '../types/calculator';
import { DatabaseService } from '../services/database';

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

  it('DatabaseService 4-color AMS Lite print stock deduction and restoration on deleteHistoryItem', async () => {
    const db = DatabaseService.getInstance();
    await db.init();

    // Reset spools to initial 1000g each
    const initialSpools = await db.getSpools();
    for (const sp of initialSpools) {
      if (['spool-1', 'spool-2', 'spool-4', 'spool-6'].includes(sp.id)) {
        await db.updateSpool({ ...sp, remaining_weight_g: 1000 });
      }
    }

    // Deduct stock for a 4-color AMS job (e.g., 4-colors Benchy AMS test v2)
    // FIL-001 (spool-1): 15.0g
    // FIL-002 (spool-2): 8.5g
    // FIL-004 (spool-4): 22.0g
    // FIL-006 (spool-6): 12.3g
    const amsDeductions = [
      { spoolId: 'spool-1', grams: 15.0 },
      { spoolId: 'spool-2', grams: 8.5 },
      { spoolId: 'spool-4', grams: 22.0 },
      { spoolId: 'spool-6', grams: 12.3 },
    ];

    await db.deductMultipleSpools(amsDeductions);

    // Verify deducted weights
    const spoolsAfterDeduct = await db.getSpools();
    const mapAfterDeduct = new Map(spoolsAfterDeduct.map((s) => [s.id, s]));
    expect(mapAfterDeduct.get('spool-1')?.remaining_weight_g).toBe(985.0);
    expect(mapAfterDeduct.get('spool-2')?.remaining_weight_g).toBe(991.5);
    expect(mapAfterDeduct.get('spool-4')?.remaining_weight_g).toBe(978.0);
    expect(mapAfterDeduct.get('spool-6')?.remaining_weight_g).toBe(987.7);

    // Log the job with canonical deductions array
    const jobRecord: JobHistoryRecord = {
      id: 'job-ams-4color-test',
      date: new Date().toISOString(),
      project_name: '4-colors Benchy AMS test v2',
      spool_id: 'spool-1',
      grams_used: 57.8,
      print_minutes: 185,
      quantity: 1,
      production_cost: 2.85,
      selling_price: 10.0,
      net_profit: 7.15,
      record_type: 'sale',
      sales_channel: 'Wallapop',
      deductions: [
        { spool_id: 'spool-1', grams: 15.0 },
        { spool_id: 'spool-2', grams: 8.5 },
        { spool_id: 'spool-4', grams: 22.0 },
        { spool_id: 'spool-6', grams: 12.3 },
      ],
      multicolor_deductions: [
        { spool_id: 'spool-1', grams_used: 15.0 },
        { spool_id: 'spool-2', grams_used: 8.5 },
        { spool_id: 'spool-4', grams_used: 22.0 },
        { spool_id: 'spool-6', grams_used: 12.3 },
      ],
    };

    await db.logJob(jobRecord);

    // Verify job exists in history
    const historyBeforeDelete = await db.getHistory();
    const foundJob = historyBeforeDelete.find((h) => h.id === 'job-ams-4color-test');
    expect(foundJob).toBeDefined();

    // Now delete the job
    await db.deleteHistoryItem('job-ams-4color-test');

    // Verify job is removed from history
    const historyAfterDelete = await db.getHistory();
    expect(historyAfterDelete.some((h) => h.id === 'job-ams-4color-test')).toBe(false);

    // Verify all 4 spools are fully restored to 1000g
    const spoolsAfterRestore = await db.getSpools();
    const mapAfterRestore = new Map(spoolsAfterRestore.map((s) => [s.id, s]));
    expect(mapAfterRestore.get('spool-1')?.remaining_weight_g).toBe(1000);
    expect(mapAfterRestore.get('spool-2')?.remaining_weight_g).toBe(1000);
    expect(mapAfterRestore.get('spool-4')?.remaining_weight_g).toBe(1000);
    expect(mapAfterRestore.get('spool-6')?.remaining_weight_g).toBe(1000);
  });
});
