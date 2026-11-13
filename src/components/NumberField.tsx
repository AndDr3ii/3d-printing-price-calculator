import { useState } from 'react';
import { Tooltip } from './Tooltip';

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  tooltip?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  isInteger?: boolean;
  showSlider?: boolean;
  sliderMax?: number;
  hint?: string;
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  tooltip,
  prefix,
  suffix,
  min = 0,
  max,
  step = 1,
  isInteger = false,
  showSlider = false,
  sliderMax = 100,
  hint,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string>(
    Number.isFinite(value) ? String(value) : '0'
  );
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = isFocused ? draft : Number.isFinite(value) ? String(value) : '0';

  const parseNumberString = (raw: string): number => {
    // Normalize comma to dot for international decimal support
    const normalized = raw.replace(',', '.').trim();
    return isInteger ? parseInt(normalized, 10) : parseFloat(normalized);
  };

  const clampAndCommit = (raw: string) => {
    const parsed = parseNumberString(raw);
    if (!Number.isFinite(parsed)) {
      onChange(min);
      setDraft(String(min));
      return;
    }
    let next = Math.max(min, parsed);
    if (max !== undefined) {
      next = Math.min(max, next);
    }
    onChange(next);
    setDraft(String(next));
  };

  const handleInputChange = (raw: string) => {
    setDraft(raw);
    const normalized = raw.replace(',', '.');
    // Allow typing leading minus or trailing decimal point without committing incomplete tokens
    if (
      normalized === '' ||
      normalized === '-' ||
      normalized.endsWith('.') ||
      normalized === '.'
    ) {
      return;
    }
    const parsed = isInteger ? parseInt(normalized, 10) : parseFloat(normalized);
    if (Number.isFinite(parsed)) {
      let next = Math.max(min, parsed);
      if (max !== undefined) next = Math.min(max, next);
      onChange(next);
    }
  };

  return (
    <div className="field-group">
      <div className="field-label-row">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {tooltip && <Tooltip text={tooltip} label={`Info about ${label}`} />}
      </div>

      <div className="input-shell">
        {prefix && <span className="input-affix input-prefix">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode={isInteger ? 'numeric' : 'decimal'}
          className={`field-input ${prefix ? 'has-prefix' : ''} ${
            suffix ? 'has-suffix' : ''
          }`}
          value={displayValue}
          min={min}
          max={max}
          step={step}
          onFocus={() => {
            setDraft(Number.isFinite(value) ? String(value) : '');
            setIsFocused(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            clampAndCommit(draft);
          }}
          onChange={(e) => handleInputChange(e.target.value)}
        />
        {suffix && <span className="input-affix input-suffix">{suffix}</span>}
      </div>

      {showSlider && (
        <div className="slider-row">
          <input
            type="range"
            aria-label={`${label} slider`}
            className="field-slider"
            min={min}
            max={Math.max(sliderMax, Number.isFinite(value) ? value : min)}
            step={step}
            value={Number.isFinite(value) ? value : min}
            onChange={(e) => {
              const next = parseFloat(e.target.value);
              if (Number.isFinite(next)) {
                onChange(next);
                setDraft(String(next));
              }
            }}
          />
          <div className="slider-ticks">
            <span>{min}%</span>
            <span>{Math.round(sliderMax / 2)}%</span>
            <span>{Math.max(sliderMax, Number.isFinite(value) ? value : min)}%</span>
          </div>
        </div>
      )}

      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
