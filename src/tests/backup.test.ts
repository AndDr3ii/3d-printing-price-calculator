import { describe, expect, it } from 'vitest';
import type { PrintOpsBackup } from '../types/calculator';

describe('PrintOps Master Backup Schema & Integrity', () => {
  it('validates a complete PrintOpsBackup data structure', () => {
    const backup: PrintOpsBackup = {
      version: '2.0',
      app_name: 'PrintOps 3D Calculator',
      export_date: new Date().toISOString(),
      settings: {
        id: 1,
        currency: 'EUR',
        electricity_rate: 0.15,
        labor_rate: 10,
        packaging_cost: 0.5,
        default_markup: 30,
        failure_buffer: 10,
        printer_price: 286.35,
        printer_power_w: 100,
        daily_usage_hours: 8,
        roi_years: 1,
        repair_pct: 10,
      },
      spools: [
        {
          id: 'spool-1',
          code: 'FIL-001',
          brand: 'Bambu Lab',
          material: 'PETG Matte',
          color_name: 'White',
          color_hex: '#F4F4F5',
          initial_weight_g: 1000,
          remaining_weight_g: 920,
          spool_price: 10.23,
        },
      ],
      expenses: [
        {
          id: 'exp-1',
          date: '2026-10-31',
          supplier: 'Bambu Lab EU',
          concept: 'Bambu Lab A1 Combo',
          category: 'Machinery',
          expense_type: 'CapEx',
          amount_eur: 344.7,
        },
      ],
      product_templates: [
        {
          id: 'tmpl-1',
          name: 'Spiral Vase',
          filament_type: 'PETG',
          weight_g: 120,
          print_hours: 2,
          print_minutes: 30,
          prep_minutes: 5,
          post_minutes: 5,
          batch_quantity: 1,
          profit_markup: 35,
          created_at: new Date().toISOString(),
        },
      ],
      jobs_history: [
        {
          id: 'job-1',
          date: '2026-11-12',
          project_name: 'Custom Vase',
          spool_id: 'spool-1',
          spool_code: 'FIL-001',
          grams_used: 120,
          print_minutes: 150,
          quantity: 1,
          production_cost: 3.5,
          selling_price: 12.0,
          net_profit: 8.5,
          record_type: 'sale',
          sales_channel: 'Vinted',
        },
      ],
    };

    // Serialize and parse
    const serialized = JSON.stringify(backup);
    const deserialized = JSON.parse(serialized) as PrintOpsBackup;

    expect(deserialized.version).toBe('2.0');
    expect(deserialized.spools).toHaveLength(1);
    expect(deserialized.expenses).toHaveLength(1);
    expect(deserialized.product_templates).toHaveLength(1);
    expect(deserialized.jobs_history).toHaveLength(1);
    expect(deserialized.settings.printer_price).toBe(286.35);
  });
});
