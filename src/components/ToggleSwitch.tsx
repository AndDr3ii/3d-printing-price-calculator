interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function ToggleSwitch({
  id,
  checked,
  onChange,
  label = 'Toggle section',
}: ToggleSwitchProps) {
  return (
    <label
      htmlFor={id}
      className="ios-toggle-label"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        id={id}
        type="checkbox"
        className="ios-toggle-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="ios-toggle-track">
        <span className="ios-toggle-thumb" />
      </span>
      <span className="ios-toggle-status-text">
        {checked ? 'Active' : 'Optional (Off)'}
      </span>
    </label>
  );
}
