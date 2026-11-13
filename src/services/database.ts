import type {
  CalculatorState,
  ExpenseItem,
  FilamentSpool,
  JobHistoryRecord,
  MulticolorDeductionRecord,
  ProductTemplate,
  PrintOpsBackup,
  WorkshopSettings,
} from '../types/calculator';

const DB_PATH = 'sqlite:printops.db';

// Fallback in-memory / localStorage storage when running in pure browser environment
const STORAGE_KEYS_SQL_FALLBACK = {
  SETTINGS: 'printops_settings_fallback_v1',
  SPOOLS: 'printops_spools_fallback_v1',
  HISTORY: 'printops_history_fallback_v1',
  EXPENSES: 'printops_expenses_fallback_v1',
  TEMPLATES: 'printops_templates_fallback_v1',
};

const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // ignore
  }
  return memoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
  memoryStore.set(key, value);
}

const INITIAL_EXPENSES_SEED: ExpenseItem[] = [
  {
    id: 'exp-1',
    date: '2026-10-31',
    supplier: 'Bambu Lab EU',
    concept: 'Bambu Lab A1 Combo (con AMS Lite)',
    category: 'Machinery',
    expense_type: 'CapEx',
    amount_eur: 344.7,
    notes: 'Primary 3D printer with 4-color AMS Lite',
  },
  {
    id: 'exp-2',
    date: '2026-10-31',
    supplier: 'Bambu Lab EU',
    concept: '6x Bambu PETG Matte 1kg Spools',
    category: 'Materials',
    expense_type: 'CapEx',
    amount_eur: 61.4,
    notes: 'Initial material stock (6kg @ ~€10.23/kg)',
  },
  {
    id: 'exp-3',
    date: '2026-11-03',
    supplier: 'AliExpress',
    concept: 'Creality Space Pi Plus Filament Dryer',
    category: 'Machinery',
    expense_type: 'CapEx',
    amount_eur: 67.99,
    notes: 'Dual spool filament dryer & active heating',
  },
  {
    id: 'exp-4',
    date: '2026-11-10',
    supplier: 'Amazon EU',
    concept: 'ISOLATECH Silica Gel 900g + PTFE + PC4',
    category: 'Storage & Parts',
    expense_type: 'CapEx',
    amount_eur: 21.48,
    notes: 'Desiccant beads and pneumatic connectors',
  },
  {
    id: 'exp-5',
    date: '2026-11-10',
    supplier: 'Amazon EU',
    concept: 'Dry-Box System (6x 3.7L containers + hygrometers + 608ZZ)',
    category: 'Storage & Parts',
    expense_type: 'CapEx',
    amount_eur: 53.97,
    notes: 'Individual sealed airtight filament dry boxes with bearings',
  },
  {
    id: 'exp-6',
    date: '2026-11-11',
    supplier: 'Wallapop',
    concept: 'IKEA STUVA MALAD Workshop Cabinet',
    category: 'Furniture',
    expense_type: 'CapEx',
    amount_eur: 15.15,
    notes: 'Solid workshop stand / cabinet for A1 printer',
  },
];

const INITIAL_TEMPLATES_SEED: ProductTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Bubble Candle Holder (3-Pack)',
    default_spool_id: 'spool-1',
    filament_type: 'PETG',
    weight_g: 85.0,
    print_hours: 2,
    print_minutes: 45,
    prep_minutes: 10,
    post_minutes: 10,
    batch_quantity: 3,
    extra_hardware_json: JSON.stringify([
      { id: 'item-1', name: 'LED Tea Lights (3x)', cost: 1.2 },
      { id: 'item-2', name: 'Packaging Box & Ribbon', cost: 0.6 },
    ]),
    profit_markup: 35,
    target_price_eur: 14.5,
    created_at: new Date().toISOString(),
  },
];

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
            notes TEXT,
            multicolor_deductions_json TEXT,
            deductions_json TEXT
          );
        `);

        // Migration safety: ensure multicolor_deductions_json & deductions_json columns exist
        try {
          await db.execute(
            'ALTER TABLE jobs_history ADD COLUMN multicolor_deductions_json TEXT;'
          );
        } catch {
          // column already exists
        }
        try {
          await db.execute(
            'ALTER TABLE jobs_history ADD COLUMN deductions_json TEXT;'
          );
        } catch {
          // column already exists
        }

        // 4. Create expenses table (CapEx / OpEx ROI tracking)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            supplier TEXT NOT NULL,
            concept TEXT NOT NULL,
            category TEXT NOT NULL,
            expense_type TEXT NOT NULL,
            amount_eur REAL NOT NULL,
            notes TEXT
          );
        `);

        // 5. Create product_templates table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS product_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            default_spool_id TEXT,
            filament_type TEXT NOT NULL,
            weight_g REAL NOT NULL,
            print_hours REAL NOT NULL,
            print_minutes REAL NOT NULL,
            prep_minutes REAL NOT NULL,
            post_minutes REAL NOT NULL,
            batch_quantity INTEGER NOT NULL,
            extra_hardware_json TEXT,
            profit_markup REAL NOT NULL,
            target_price_eur REAL,
            created_at TEXT NOT NULL
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

        // Seed initial startup expenses if empty (Total CapEx = €564.69)
        const expensesCount = await db.select<Array<{ count: number }>>(
          'SELECT COUNT(*) as count FROM expenses;'
        );
        if (!expensesCount || expensesCount[0].count === 0) {
          for (const exp of INITIAL_EXPENSES_SEED) {
            await db.execute(
              `INSERT INTO expenses (id, date, supplier, concept, category, expense_type, amount_eur, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
              [
                exp.id,
                exp.date,
                exp.supplier,
                exp.concept,
                exp.category,
                exp.expense_type,
                exp.amount_eur,
                exp.notes || '',
              ]
            );
          }
        }

        // Seed product templates if empty
        const templatesCount = await db.select<Array<{ count: number }>>(
          'SELECT COUNT(*) as count FROM product_templates;'
        );
        if (!templatesCount || templatesCount[0].count === 0) {
          for (const tpl of INITIAL_TEMPLATES_SEED) {
            await db.execute(
              `INSERT INTO product_templates (id, name, default_spool_id, filament_type, weight_g, print_hours, print_minutes, prep_minutes, post_minutes, batch_quantity, extra_hardware_json, profit_markup, target_price_eur, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
              [
                tpl.id,
                tpl.name,
                tpl.default_spool_id || '',
                tpl.filament_type,
                tpl.weight_g,
                tpl.print_hours,
                tpl.print_minutes,
                tpl.prep_minutes,
                tpl.post_minutes,
                tpl.batch_quantity,
                tpl.extra_hardware_json || '[]',
                tpl.profit_markup,
                tpl.target_price_eur || 0,
                tpl.created_at,
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
    if (!getStorageItem(STORAGE_KEYS_SQL_FALLBACK.SETTINGS)) {
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.SETTINGS,
        JSON.stringify(DEFAULT_SETTINGS_SEED)
      );
    }
    if (!getStorageItem(STORAGE_KEYS_SQL_FALLBACK.SPOOLS)) {
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.SPOOLS,
        JSON.stringify(INITIAL_SPOOLS_SEED)
      );
    }
    if (!getStorageItem(STORAGE_KEYS_SQL_FALLBACK.HISTORY)) {
      setStorageItem(STORAGE_KEYS_SQL_FALLBACK.HISTORY, JSON.stringify([]));
    }
    if (!getStorageItem(STORAGE_KEYS_SQL_FALLBACK.EXPENSES)) {
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.EXPENSES,
        JSON.stringify(INITIAL_EXPENSES_SEED)
      );
    }
    if (!getStorageItem(STORAGE_KEYS_SQL_FALLBACK.TEMPLATES)) {
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.TEMPLATES,
        JSON.stringify(INITIAL_TEMPLATES_SEED)
      );
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
      const raw = getStorageItem(STORAGE_KEYS_SQL_FALLBACK.SETTINGS);
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
      setStorageItem(
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
      const raw = getStorageItem(STORAGE_KEYS_SQL_FALLBACK.SPOOLS);
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
      setStorageItem(
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
      setStorageItem(
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

  public async deductMultipleSpools(
    deductions: Array<{ spoolId: string; grams: number }>
  ): Promise<void> {
    await this.init();
    const spools = await this.getSpools();
    const spoolMap = new Map(spools.map((s) => [s.id, s]));

    for (const d of deductions) {
      const spool = spoolMap.get(d.spoolId);
      if (spool) {
        const newWeight = Math.max(
          0,
          Math.round((spool.remaining_weight_g - d.grams) * 10) / 10
        );
        const updated = { ...spool, remaining_weight_g: newWeight };
        await this.updateSpool(updated);
        spoolMap.set(spool.id, updated);
      }
    }
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
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.SPOOLS,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  // --- BUSINESS EXPENSES (CAPEX / OPEX) ---
  public async getExpenses(): Promise<ExpenseItem[]> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        const rows = await db.select<ExpenseItem[]>(
          'SELECT * FROM expenses ORDER BY date DESC;'
        );
        if (rows) return rows;
      } catch {
        // fallback
      }
    }

    try {
      const raw = getStorageItem(STORAGE_KEYS_SQL_FALLBACK.EXPENSES);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return INITIAL_EXPENSES_SEED;
  }

  public async addExpense(expense: ExpenseItem): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute(
          `INSERT INTO expenses (id, date, supplier, concept, category, expense_type, amount_eur, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [
            expense.id,
            expense.date,
            expense.supplier,
            expense.concept,
            expense.category,
            expense.expense_type,
            expense.amount_eur,
            expense.notes || '',
          ]
        );
      } catch (err) {
        console.warn('Failed to add expense in SQLite:', err);
      }
    }

    try {
      const current = await this.getExpenses();
      const updated = [expense, ...current];
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.EXPENSES,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  public async deleteExpense(id: string): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute('DELETE FROM expenses WHERE id = $1;', [id]);
      } catch (err) {
        console.warn('Failed to delete expense in SQLite:', err);
      }
    }

    try {
      const current = await this.getExpenses();
      const updated = current.filter((e) => e.id !== id);
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.EXPENSES,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  // --- PRODUCT TEMPLATES ("RECIPES") ---
  public async getProductTemplates(): Promise<ProductTemplate[]> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        const rows = await db.select<ProductTemplate[]>(
          'SELECT * FROM product_templates ORDER BY name ASC;'
        );
        if (rows) return rows;
      } catch {
        // fallback
      }
    }

    try {
      const raw = getStorageItem(STORAGE_KEYS_SQL_FALLBACK.TEMPLATES);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return INITIAL_TEMPLATES_SEED;
  }

  public async saveProductTemplate(template: ProductTemplate): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        // Replace or insert
        await db.execute('DELETE FROM product_templates WHERE id = $1;', [
          template.id,
        ]);
        await db.execute(
          `INSERT INTO product_templates (id, name, default_spool_id, filament_type, weight_g, print_hours, print_minutes, prep_minutes, post_minutes, batch_quantity, extra_hardware_json, profit_markup, target_price_eur, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
          [
            template.id,
            template.name,
            template.default_spool_id || '',
            template.filament_type,
            template.weight_g,
            template.print_hours,
            template.print_minutes,
            template.prep_minutes,
            template.post_minutes,
            template.batch_quantity,
            template.extra_hardware_json || '[]',
            template.profit_markup,
            template.target_price_eur || 0,
            template.created_at,
          ]
        );
      } catch (err) {
        console.warn('Failed to save product template in SQLite:', err);
      }
    }

    try {
      const current = await this.getProductTemplates();
      const updated = [
        template,
        ...current.filter((t) => t.id !== template.id),
      ];
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.TEMPLATES,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  public async deleteProductTemplate(id: string): Promise<void> {
    await this.init();
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute('DELETE FROM product_templates WHERE id = $1;', [id]);
      } catch (err) {
        console.warn('Failed to delete product template in SQLite:', err);
      }
    }

    try {
      const current = await this.getProductTemplates();
      const updated = current.filter((t) => t.id !== id);
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.TEMPLATES,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  // --- JOBS & SALES HISTORY ---
  public async getHistory(): Promise<JobHistoryRecord[]> {
    await this.init();
    const spools = await this.getSpools();
    const spoolMap = new Map(spools.map((s) => [s.id, s]));

    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        const rows = await db.select<
          Array<JobHistoryRecord & { multicolor_deductions_json?: string; deductions_json?: string }>
        >(
          `SELECT h.*, s.code as spool_code, s.color_name as spool_color_name, s.color_hex as spool_color_hex
           FROM jobs_history h
           LEFT JOIN spools s ON h.spool_id = s.id
           ORDER BY h.date DESC;`
        );
        if (rows) {
          return rows.map((r) => {
            let canonicalDeductions: Array<{ spool_id: string; grams: number }> = [];
            const rawJson = r.deductions_json || r.multicolor_deductions_json;
            if (rawJson) {
              try {
                const parsed = JSON.parse(rawJson);
                if (Array.isArray(parsed)) {
                  canonicalDeductions = parsed.map((it: any) => ({
                    spool_id: String(it.spool_id || it.spoolId || ''),
                    grams: Number(it.grams ?? it.grams_used ?? 0),
                  })).filter((d) => d.spool_id && d.grams > 0);
                }
              } catch {
                // ignore
              }
            }

            if (canonicalDeductions.length === 0 && r.spool_id && r.grams_used > 0) {
              canonicalDeductions = [
                { spool_id: r.spool_id, grams: Number(r.grams_used) },
              ];
            }

            const multicolor_deductions: MulticolorDeductionRecord[] = canonicalDeductions.map((d) => {
              const sp = spoolMap.get(d.spool_id);
              return {
                spool_id: d.spool_id,
                spool_code: sp?.code,
                color_name: sp?.color_name,
                color_hex: sp?.color_hex,
                grams_used: d.grams,
              };
            });

            return {
              ...r,
              deductions: canonicalDeductions,
              deductions_json: JSON.stringify(canonicalDeductions),
              multicolor_deductions: multicolor_deductions.length > 1 ? multicolor_deductions : undefined,
            };
          });
        }
      } catch {
        // fallback
      }
    }

    try {
      const raw = getStorageItem(STORAGE_KEYS_SQL_FALLBACK.HISTORY);
      if (raw) {
        const list = JSON.parse(raw) as JobHistoryRecord[];
        return list.map((item) => {
          const sp = spoolMap.get(item.spool_id);

          let canonicalDeductions: Array<{ spool_id: string; grams: number }> = [];
          const rawJson =
            item.deductions_json ||
            (item as any).multicolor_deductions_json;

          if (rawJson) {
            try {
              const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
              if (Array.isArray(parsed)) {
                canonicalDeductions = parsed.map((it: any) => ({
                  spool_id: String(it.spool_id || it.spoolId || ''),
                  grams: Number(it.grams ?? it.grams_used ?? 0),
                })).filter((d) => d.spool_id && d.grams > 0);
              }
            } catch {
              // ignore
            }
          } else if (item.deductions && item.deductions.length > 0) {
            canonicalDeductions = item.deductions.map((d) => ({
              spool_id: d.spool_id,
              grams: Number(d.grams),
            }));
          } else if (item.multicolor_deductions && item.multicolor_deductions.length > 0) {
            canonicalDeductions = item.multicolor_deductions.map((d) => ({
              spool_id: d.spool_id,
              grams: Number(d.grams_used),
            }));
          } else if (item.spool_id && item.grams_used > 0) {
            canonicalDeductions = [
              { spool_id: item.spool_id, grams: Number(item.grams_used) },
            ];
          }

          const multicolor_deductions: MulticolorDeductionRecord[] = canonicalDeductions.map((d) => {
            const s = spoolMap.get(d.spool_id);
            return {
              spool_id: d.spool_id,
              spool_code: s?.code,
              color_name: s?.color_name,
              color_hex: s?.color_hex,
              grams_used: d.grams,
            };
          });

          return {
            ...item,
            spool_code: sp?.code,
            spool_color_name: sp?.color_name,
            spool_color_hex: sp?.color_hex,
            deductions: canonicalDeductions,
            deductions_json: JSON.stringify(canonicalDeductions),
            multicolor_deductions: multicolor_deductions.length > 1 ? multicolor_deductions : undefined,
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

    // Canonical array of { spool_id: string, grams: number } for EVERY job
    let canonicalDeductions: Array<{ spool_id: string; grams: number }> = [];

    if (job.deductions && job.deductions.length > 0) {
      canonicalDeductions = job.deductions.map((d) => ({
        spool_id: d.spool_id,
        grams: Number(d.grams),
      }));
    } else if (job.multicolor_deductions && job.multicolor_deductions.length > 0) {
      canonicalDeductions = job.multicolor_deductions.map((d) => ({
        spool_id: d.spool_id,
        grams: Number((d as any).grams ?? d.grams_used ?? 0),
      }));
    } else if (job.spool_id && job.grams_used > 0) {
      canonicalDeductions = [
        {
          spool_id: job.spool_id,
          grams: Number(job.grams_used),
        },
      ];
    }

    const deductionsJson = JSON.stringify(canonicalDeductions);
    job.deductions = canonicalDeductions;
    job.deductions_json = deductionsJson;

    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute(
          `INSERT INTO jobs_history (id, date, project_name, spool_id, grams_used, print_minutes, quantity, production_cost, selling_price, net_profit, record_type, sales_channel, notes, deductions_json, multicolor_deductions_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`,
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
            deductionsJson,
            deductionsJson,
          ]
        );
      } catch (err) {
        console.warn('Failed to log job to SQLite:', err);
      }
    }

    try {
      const current = await this.getHistory();
      const updated = [job, ...current];
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.HISTORY,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  /**
   * Refunds consumed filament grams back to multiple physical spools in batch,
   * clamping each spool's remaining weight at initial_weight_g.
   */
  public async refundMultipleSpools(
    refunds: Array<{ spoolId: string; grams: number }>
  ): Promise<void> {
    await this.init();
    const spools = await this.getSpools();
    const spoolMap = new Map(spools.map((s) => [s.id, s]));

    for (const r of refunds) {
      const spool = spoolMap.get(r.spoolId);
      if (spool) {
        const maxWeight = spool.initial_weight_g || 1000;
        const newWeight = Math.min(
          maxWeight,
          Math.round(((spool.remaining_weight_g ?? 0) + r.grams) * 10) / 10
        );
        const updated = { ...spool, remaining_weight_g: newWeight };
        await this.updateSpool(updated);
        spoolMap.set(spool.id, updated);
      }
    }
  }

  /**
   * Refunds consumed filament grams back to the corresponding physical spool,
   * clamping the remaining weight at initial_weight_g.
   */
  public async refundSpoolWeight(spoolId: string, gramsToRefund: number): Promise<void> {
    await this.refundMultipleSpools([{ spoolId, grams: gramsToRefund }]);
  }

  /**
   * Deletes a print/sale history record and automatically restores the consumed
   * filament stock back to the corresponding spool(s).
   */
  public async deleteHistoryItem(id: string): Promise<void> {
    await this.init();

    // 1. Fetch the job record before deleting it so we can restore filament stock
    const currentHistory = await this.getHistory();
    const targetJob = currentHistory.find((h) => h.id === id);

    if (targetJob) {
      const refundsToApply: Array<{ spoolId: string; grams: number }> = [];

      // Check canonical targetJob.deductions first, then multicolor_deductions
      const list =
        targetJob.deductions && targetJob.deductions.length > 0
          ? targetJob.deductions
          : targetJob.multicolor_deductions;

      if (Array.isArray(list) && list.length > 0) {
        for (const item of list) {
          const sId = item.spool_id || (item as any).spoolId;
          const g = Number(
            (item as any).grams ??
            (item as any).grams_used ??
            0
          );
          if (sId && g > 0) {
            refundsToApply.push({ spoolId: sId, grams: g });
          }
        }
      } else if (targetJob.spool_id && targetJob.grams_used > 0) {
        refundsToApply.push({
          spoolId: targetJob.spool_id,
          grams: Number(targetJob.grams_used),
        });
      }

      if (refundsToApply.length > 0) {
        await this.refundMultipleSpools(refundsToApply);
      }
    }

    // 2. Delete the row from SQLite
    const sqlMod = await getSql();
    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);
        await db.execute('DELETE FROM jobs_history WHERE id = $1;', [id]);
      } catch (err) {
        console.warn('Failed to delete history item in SQLite:', err);
      }
    }

    // 3. Delete the row from storage fallback
    try {
      const updated = currentHistory.filter((h) => h.id !== id);
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.HISTORY,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
  }

  /**
   * Alias for deleteHistoryItem(id)
   */
  public async deleteJob(id: string): Promise<void> {
    return this.deleteHistoryItem(id);
  }

  // --- 1-CLICK MASTER BACKUP EXPORT & RESTORE ---
  public async exportFullBackup(): Promise<PrintOpsBackup> {
    await this.init();
    const [settings, spools, expenses, product_templates, jobs_history] =
      await Promise.all([
        this.getSettings(),
        this.getSpools(),
        this.getExpenses(),
        this.getProductTemplates(),
        this.getHistory(),
      ]);

    return {
      version: '2.0',
      app_name: 'PrintOps 3D',
      export_date: new Date().toISOString(),
      settings,
      spools,
      expenses,
      product_templates,
      jobs_history,
    };
  }

  public async restoreFullBackup(backup: PrintOpsBackup): Promise<void> {
    if (!backup || !backup.settings || !Array.isArray(backup.spools)) {
      throw new Error('Invalid PrintOps backup file structure.');
    }

    await this.init();
    const sqlMod = await getSql();

    if (sqlMod) {
      try {
        const db = await sqlMod.default.load(DB_PATH);

        // 1. Settings
        await db.execute('DELETE FROM settings;');
        const s = backup.settings;
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

        // 2. Spools
        await db.execute('DELETE FROM spools;');
        for (const sp of backup.spools) {
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

        // 3. Expenses
        await db.execute('DELETE FROM expenses;');
        if (Array.isArray(backup.expenses)) {
          for (const exp of backup.expenses) {
            await db.execute(
              `INSERT INTO expenses (id, date, supplier, concept, category, expense_type, amount_eur, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
              [
                exp.id,
                exp.date,
                exp.supplier,
                exp.concept,
                exp.category,
                exp.expense_type,
                exp.amount_eur,
                exp.notes || '',
              ]
            );
          }
        }

        // 4. Product Templates
        await db.execute('DELETE FROM product_templates;');
        if (Array.isArray(backup.product_templates)) {
          for (const tpl of backup.product_templates) {
            await db.execute(
              `INSERT INTO product_templates (id, name, default_spool_id, filament_type, weight_g, print_hours, print_minutes, prep_minutes, post_minutes, batch_quantity, extra_hardware_json, profit_markup, target_price_eur, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
              [
                tpl.id,
                tpl.name,
                tpl.default_spool_id || '',
                tpl.filament_type,
                tpl.weight_g,
                tpl.print_hours,
                tpl.print_minutes,
                tpl.prep_minutes,
                tpl.post_minutes,
                tpl.batch_quantity,
                tpl.extra_hardware_json || '[]',
                tpl.profit_markup,
                tpl.target_price_eur || 0,
                tpl.created_at,
              ]
            );
          }
        }

        // 5. Jobs History
        await db.execute('DELETE FROM jobs_history;');
        if (Array.isArray(backup.jobs_history)) {
          for (const job of backup.jobs_history) {
            const deductionsJson = job.multicolor_deductions
              ? JSON.stringify(job.multicolor_deductions)
              : null;
            await db.execute(
              `INSERT INTO jobs_history (id, date, project_name, spool_id, grams_used, print_minutes, quantity, production_cost, selling_price, net_profit, record_type, sales_channel, notes, multicolor_deductions_json)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
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
                deductionsJson,
              ]
            );
          }
        }
      } catch (err) {
        console.warn('SQLite restore error, syncing to local storage:', err);
      }
    }

    // Sync to fallback storage
    try {
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.SETTINGS,
        JSON.stringify(backup.settings)
      );
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.SPOOLS,
        JSON.stringify(backup.spools)
      );
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.EXPENSES,
        JSON.stringify(backup.expenses || [])
      );
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.TEMPLATES,
        JSON.stringify(backup.product_templates || [])
      );
      setStorageItem(
        STORAGE_KEYS_SQL_FALLBACK.HISTORY,
        JSON.stringify(backup.jobs_history || [])
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
