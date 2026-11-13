import { Plus, Trash2 } from 'lucide-react';
import type { CurrencyCode, ExtraCostItem } from '../types/calculator';
import { CURRENCIES } from '../constants/defaults';
import { Tooltip } from './Tooltip';

interface DynamicOtherCostsProps {
  items: ExtraCostItem[];
  currency: CurrencyCode;
  onChange: (items: ExtraCostItem[]) => void;
}

export function DynamicOtherCosts({
  items,
  currency,
  onChange,
}: DynamicOtherCostsProps) {
  const currencySymbol = CURRENCIES[currency].symbol;

  const handleAddItem = () => {
    const newItem: ExtraCostItem = {
      id: `extra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      cost: 0,
    };
    onChange([...items, newItem]);
  };

  const handleUpdateItem = (
    id: string,
    field: 'name' | 'cost',
    val: string | number
  ) => {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        if (field === 'name') return { ...item, name: String(val) };
        const num = typeof val === 'number' ? val : parseFloat(val);
        return {
          ...item,
          cost: Number.isFinite(num) && num >= 0 ? num : 0,
        };
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="dynamic-costs-wrap">
      <div className="dynamic-costs-header">
        <div className="field-label-row">
          <label className="field-label">Other Costs &amp; Non-printed Hardware</label>
          <Tooltip
            text="Add any non-printed items per part: packaging, magnets, threaded brass inserts, screws, bearings, glue, or assembly hardware."
            label="Info about other costs"
          />
        </div>
        <button
          type="button"
          className="btn-apple-secondary-sm"
          onClick={handleAddItem}
        >
          <Plus size={14} /> Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="dynamic-costs-empty">
          <span>No extra hardware added. Click &ldquo;Add Item&rdquo; if needed.</span>
        </div>
      ) : (
        <div className="dynamic-costs-list">
          {items.map((item) => (
            <div key={item.id} className="dynamic-cost-row">
              <input
                type="text"
                className="field-input dynamic-cost-name"
                placeholder="e.g. M3 Heat-set inserts (x4)"
                value={item.name}
                onChange={(e) =>
                  handleUpdateItem(item.id, 'name', e.target.value)
                }
              />
              <div className="input-shell dynamic-cost-amount">
                <span className="input-affix input-prefix">{currencySymbol}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  className="field-input has-prefix"
                  placeholder="0.00"
                  value={item.cost === 0 ? '' : item.cost}
                  onChange={(e) =>
                    handleUpdateItem(item.id, 'cost', e.target.value)
                  }
                />
              </div>
              <button
                type="button"
                className="btn-trash-row"
                aria-label={`Remove ${item.name || 'item'}`}
                title="Remove line item"
                onClick={() => handleDeleteItem(item.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
