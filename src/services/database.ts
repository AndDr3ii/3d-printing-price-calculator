import type {
  CalculatorState,
  FilamentSpool,
  JobHistoryRecord,
  WorkshopSettings,
} from '../types/calculator';

const DB_PATH = 'sqlite:printops.db';

// Fallback in-memory / localStorage storage when running in pure browser environment
const STORAGE_KEYS_SQL_FALLBACK = {
  SETTINGS: 'printops_settings_fallback_v1',
  SPOOLS: 'printops_spools_fallback_v1',
  HISTORY: 'printops_history_fallback_v1',
};

const INITIAL_SPOOLS_SEED: FilamentSpool[] = [
  {
    id: 'spool-1',
    code: 'FIL-001',
    brand: 'Bambu Lab',
    material: 'PETG Matte',
    color_name: 'White',
    color_hex: '#F4F4F5',
    initial_weight_g: 1000,
    remaining_weight_g: 1000,
    spool_price: 10.23,
    created_at: new Date().toISOString(),
  },
  {
    id: 'spool-2',
    code: 'FIL-002',
    brand: 'Bambu Lab',
    material: 'PETG Matte',
    color_name: 'Gray #1',
    color_hex: '#71717A',
    initial_weight_g: 1000,
    remaining_weight_g: 1000,
    spool_price: 10.23,
    created_at: new Date().toISOString(),
  },
  {
    id: 'spool-3',
    code: 'FIL-003',
    brand: 'Bambu Lab',
    material: 'PETG Matte',
    color_name: 'Gray #2',
    color_hex: '#71717A',
    initial_weight_g: 1000,
    remaining_weight_g: 1000,
    spool_price: 10.23,
    created_at: new Date().toISOString(),
  },
  {
    id: 'spool-4',
    code: 'FIL-004',
    brand: 'Bambu Lab',
    material: 'PETG Matte',
    color_name: 'Baby Blue #1',
    color_hex: '#7DD3FC',
    initial_weight_g: 1000,
    remaining_weight_g: 1000,
    spool_price: 10.23,
    created_at: new Date().toISOString(),
  },
  {
    id: 'spool-5',
    code: 'FIL-005',
    brand: 'Bambu Lab',
    material: 'PETG Matte',
    color_name: 'Baby Blue #2',
    color_hex: '#7DD3FC',
    initial_weight_g: 1000,
    remaining_weight_g: 1000,
    spool_price: 10.23,
    created_at: new Date().toISOString(),
  },
  {
    id: 'spool-6',
    code: 'FIL-006',
    brand: 'Bambu Lab',
    material: 'PETG Matte',
    color_name: 'Black',
    color_hex: '#18181B',
    initial_weight_g: 1000,
    remaining_weight_g: 1000,
    spool_price: 10.23,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_SETTINGS_SEED: WorkshopSettings = {
  id: 1,
  currency: 'EUR',
  electricity_rate: 0.15,
  labor_rate: 10.0,
  packaging_cost: 0.5,
  default_markup: 30,
  failure_buffer: 10,
  selected_printer_id: 'builtin-bambu-a1-combo',
  printer_price: 286.35,
  printer_power_w: 100,
  daily_usage_hours: 6,
  roi_years: 1,
  repair_pct: 10,
};

let tauriSqlModule: typeof import('@tauri-apps/plugin-sql') | null = null;
let isTauriEnv = false;

// Dynamic import with detection
async function getSql() {
  if (typeof window === 'undefined') return null;
  if (!isTauriEnv && !tauriSqlModule) {
    try {
      // Check if Tauri is present in window
      if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) {
        tauriSqlModule = await import('@tauri-apps/plugin-sql');
        isTauriEnv = true;
      }
    } catch {
      isTauriEnv = false;
    }
  }
  return isTauriEnv ? tauriSqlModule : null;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);

        // 1. Create settings table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            currency TEXT NOT NULL,
            electricity_rate REAL NOT NULL,
            labor_rate REAL NOT NULL,
            packaging_cost REAL NOT NULL,
            default_markup REAL NOT NULL,
            failure_buffer REAL NOT NULL,
            selected_printer_id TEXT,
            printer_price REAL NOT NULL,
            printer_power_w REAL NOT NULL,
            daily_usage_hours REAL NOT NULL,
            roi_years REAL NOT NULL,
            repair_pct REAL NOT NULL
          );
        `);

        // 2. Create spools table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS spools (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            brand TEXT NOT NULL,
            material TEXT NOT NULL,
            color_name TEXT NOT NULL,
            color_hex TEXT NOT NULL,
            initial_weight_g REAL NOT NULL,
            remaining_weight_g REAL NOT NULL,
            spool_price REAL NOT NULL,
            created_at TEXT NOT NULL
          );
        `);

        // 3. Create jobs_history table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS jobs_history (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            project_name TEXT NOT NULL,
            spool_id TEXT NOT NULL,
            grams_used REAL NOT NULL,
            print_minutes REAL NOT NULL,
            quantity INTEGER NOT NULL,
            production_cost REAL NOT NULL,
            selling_price REAL NOT NULL,
            net_profit REAL NOT NULL,
            record_type TEXT NOT NULL,
            sales_channel TEXT NOT NULL,
            notes TEXT
          );
        `);

        // Seed settings if empty
        const settingsCount = await db.select<Array<{ count: number }>>(
          'SELECT COUNT(*) as count FROM settings;'
        );
        if (!settingsCount || settingsCount[0].count === 0) {
          const s = DEFAULT_SETTINGS_SEED;
          await db.execute(
            `INSERT INTO settings (id, currency, electricity_rate, labor_rate, packaging_cost, default_markup, failure_buffer, selected_printer_id, printer_price, printer_power_w, daily_usage_hours, roi_years, repair_pct)
             VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
            [
              s.currency,
              s.electricity_rate,
              s.labor_rate,
              s.packaging_cost,
              s.default_markup,
              s.failure_buffer,
              s.selected_printer_id || '',
              s.printer_price,
              s.printer_power_w,
              s.daily_usage_hours,
              s.roi_years,
              s.repair_pct,
            ]
          );
        }

        // Seed spools if empty
        const spoolsCount = await db.select<Array<{ count: number }>>(
          'SELECT COUNT(*) as count FROM spools;'
        );
        if (!spoolsCount || spoolsCount[0].count === 0) {
          for (const sp of INITIAL_SPOOLS_SEED) {
            await db.execute(
              `INSERT INTO spools (id, code, brand, material, color_name, color_hex, initial_weight_g, remaining_weight_g, spool_price, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
              [
                sp.id,
                sp.code,
                sp.brand,
                sp.material,
                sp.color_name,
                sp.color_hex,
                sp.initial_weight_g,
                sp.remaining_weight_g,
                sp.spool_price,
                sp.created_at || new Date().toISOString(),
              ]
            );
          }
        }
      } catch (err) {
        console.warn('SQLite init error in Tauri, falling back to local storage:', err);
        this.initBrowserFallback();
      }
    } else {
      this.initBrowserFallback();
    }

    this.initialized = true;
  }

  private initBrowserFallback(): void {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS_SQL_FALLBACK.SETTINGS)) {
      localStorage.setItem(
        STORAGE_KEYS_SQL_FALLBACK.SETTINGS,
        JSON.stringify(DEFAULT_SETTINGS_SEED)
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS_SQL_FALLBACK.SPOOLS)) {
      localStorage.setItem(
        STORAGE_KEYS_SQL_FALLBACK.SPOOLS,
        JSON.stringify(INITIAL_SPOOLS_SEED)
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS_SQL_FALLBACK.HISTORY)) {
      localStorage.setItem(STORAGE_KEYS_SQL_FALLBACK.HISTORY, JSON.stringify([]));
    }
  }

  // --- SETTINGS ---
  public async getSettings(): Promise<WorkshopSettings> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        const rows = await db.select<WorkshopSettings[]>(
          'SELECT * FROM settings WHERE id = 1 LIMIT 1;'
        );
        if (rows && rows.length > 0) return rows[0];
      } catch {
        // fallback
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS_SQL_FALLBACK.SETTINGS);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS_SEED;
  }

  public async saveSettings(s: WorkshopSettings): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute(
          `INSERT OR REPLACE INTO settings (id, currency, electricity_rate, labor_rate, packaging_cost, default_markup, failure_buffer, selected_printer_id, printer_price, printer_power_w, daily_usage_hours, roi_years, repair_pct)
           VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
          [
            s.currency,
            s.electricity_rate,
            s.labor_rate,
            s.packaging_cost,
            s.default_markup,
            s.failure_buffer,
            s.selected_printer_id || '',
            s.printer_price,
            s.printer_power_w,
            s.daily_usage_hours,
            s.roi_years,
            s.repair_pct,
          ]
        );
      } catch (err) {
        console.warn('Failed to save settings to SQLite:', err);
      }
    }
    try {
      localStorage.setItem(
        STORAGE_KEYS_SQL_FALLBACK.SETTINGS,
        JSON.stringify(s)
      );
    } catch {
      // ignore
    }
  }

  // --- SPOOLS ---
  public async getSpools(): Promise<FilamentSpool[]> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        const rows = await db.select<FilamentSpool[]>(
          'SELECT * FROM spools ORDER BY code ASC;'
        );
        if (rows) return rows;
      } catch {
        // fallback
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS_SQL_FALLBACK.SPOOLS);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return INITIAL_SPOOLS_SEED;
  }

  public async addSpool(spool: FilamentSpool): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute(
          `INSERT INTO spools (id, code, brand, material, color_name, color_hex, initial_weight_g, remaining_weight_g, spool_price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
          [
            spool.id,
            spool.code,
            spool.brand,
            spool.material,
            spool.color_name,
            spool.color_hex,
            spool.initial_weight_g,
            spool.remaining_weight_g,
            spool.spool_price,
            spool.created_at || new Date().toISOString(),
          ]
        );
      } catch (err) {
        console.warn('Failed to add spool to SQLite:', err);
      }
    }

    try {
      const current = await this.getSpools();
      const updated = [...current, spool];
      localStorage.setItem(
        STORAGE_KEYS_SQL_FALLBACK.SPOOLS,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  public async updateSpool(spool: FilamentSpool): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute(
          `UPDATE spools SET code = $1, brand = $2, material = $3, color_name = $4, color_hex = $5, initial_weight_g = $6, remaining_weight_g = $7, spool_price = $8 WHERE id = $9;`,
          [
            spool.code,
            spool.brand,
            spool.material,
            spool.color_name,
            spool.color_hex,
            spool.initial_weight_g,
            spool.remaining_weight_g,
            spool.spool_price,
            spool.id,
          ]
        );
      } catch (err) {
        console.warn('Failed to update spool in SQLite:', err);
      }
    }

    try {
      const current = await this.getSpools();
      const updated = current.map((s) => (s.id === spool.id ? spool : s));
      localStorage.setItem(
        STORAGE_KEYS_SQL_FALLBACK.SPOOLS,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  public async deductSpoolWeight(spoolId: string, gramsToDeduct: number): Promise<void> {
    await this.init();
    const spools = await this.getSpools();
    const target = spools.find((s) => s.id === spoolId);
    if (!target) return;

    const newWeight = Math.max(0, Math.round((target.remaining_weight_g - gramsToDeduct) * 10) / 10);
    const updated = { ...target, remaining_weight_g: newWeight };
    await this.updateSpool(updated);
  }

  public async deleteSpool(id: string): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute('DELETE FROM spools WHERE id = $1;', [id]);
      } catch (err) {
        console.warn('Failed to delete spool in SQLite:', err);
      }
    }

    try {
      const current = await this.getSpools();
      const updated = current.filter((s) => s.id !== id);
      localStorage.setItem(
        STORAGE_KEYS_SQL_FALLBACK.SPOOLS,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  // --- JOBS & SALES HISTORY ---
  public async getHistory(): Promise<JobHistoryRecord[]> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        const rows = await db.select<JobHistoryRecord[]>(
          `SELECT h.*, s.code as spool_code, s.color_name as spool_color_name, s.color_hex as spool_color_hex
           FROM jobs_history h
           LEFT JOIN spools s ON h.spool_id = s.id
           ORDER BY h.date DESC;`
        );
        if (rows) return rows;
      } catch {
        // fallback
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS_SQL_FALLBACK.HISTORY);
      if (raw) {
        const list = JSON.parse(raw) as JobHistoryRecord[];
        const spools = await this.getSpools();
        return list.map((item) => {
          const sp = spools.find((s) => s.id === item.spool_id);
          return {
            ...item,
            spool_code: sp?.code,
            spool_color_name: sp?.color_name,
            spool_color_hex: sp?.color_hex,
          };
        });
      }
    } catch {
      // ignore
    }
    return [];
  }

  public async logJob(job: JobHistoryRecord): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute(
          `INSERT INTO jobs_history (id, date, project_name, spool_id, grams_used, print_minutes, quantity, production_cost, selling_price, net_profit, record_type, sales_channel, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
          [
            job.id,
            job.date,
            job.project_name,
            job.spool_id,
            job.grams_used,
            job.print_minutes,
            job.quantity,
            job.production_cost,
            job.selling_price,
            job.net_profit,
            job.record_type,
            job.sales_channel,
            job.notes || '',
          ]
        );
      } catch (err) {
        console.warn('Failed to log job to SQLite:', err);
      }
    }

    try {
      const current = await this.getHistory();
      const updated = [job, ...current];
      localStorage.setItem(
        STORAGE_KEYS_SQL_FALLBACK.HISTORY,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  public async deleteHistoryItem(id: string): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute('DELETE FROM jobs_history WHERE id = $1;', [id]);
      } catch (err) {
        console.warn('Failed to delete history item in SQLite:', err);
      }
    }

    try {
      const current = await this.getHistory();
      const updated = current.filter((h) => h.id !== id);
      localStorage.setItem(
        STORAGE_KEYS_SQL_FALLBACK.HISTORY,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }
}

export function applyWorkshopSettingsToCalculatorState(
  state: CalculatorState,
  settings: WorkshopSettings
): CalculatorState {
  return {
    ...state,
    currency: settings.currency,
    electricityCostPerKwh: settings.electricity_rate,
    laborHourlyRate: settings.labor_rate,
    failedPrintsMarkup: settings.failure_buffer,
    profitMarkup: settings.default_markup,
    printerPurchasePrice: settings.printer_price,
    printerWatts: settings.printer_power_w,
    dailyCommercialUsageHours: settings.daily_usage_hours,
    investmentReturnYears: settings.roi_years,
    repairCostPercent: settings.repair_pct,
    otherCosts: [
      { id: 'item-1', name: 'Packaging & Box', cost: settings.packaging_cost },
    ],
  };
}

export function extractWorkshopSettingsFromCalculatorState(
  state: CalculatorState
): WorkshopSettings {
  const packagingCost =
    Array.isArray(state.otherCosts) && state.otherCosts.length > 0
      ? state.otherCosts[0].cost
      : 0.5;

  return {
    id: 1,
    currency: state.currency,
    electricity_rate: state.electricityCostPerKwh,
    labor_rate: state.laborHourlyRate,
    packaging_cost: packagingCost,
    default_markup: state.profitMarkup,
    failure_buffer: state.failedPrintsMarkup,
    printer_price: state.printerPurchasePrice,
    printer_power_w: state.printerWatts,
    daily_usage_hours: state.dailyCommercialUsageHours,
    roi_years: state.investmentReturnYears,
    repair_pct: state.repairCostPercent,
  };
}
