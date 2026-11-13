import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ToggleSwitch } from './ToggleSwitch';

interface CollapsibleSectionProps {
  stepNumber: number;
  title: string;
  subtitle?: string;
  badgeText?: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  // Optional section toggle support (iOS style)
  optionalToggle?: {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
  };
  children: ReactNode;
}

export function CollapsibleSection({
  stepNumber,
  title,
  subtitle,
  badgeText,
  icon,
  defaultOpen = true,
  optionalToggle,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isEnabled = optionalToggle ? optionalToggle.enabled : true;
  // If this section is optional and toggled OFF, completely collapse it
  const isContentVisible = isEnabled && isOpen;

  const handleHeaderClick = () => {
    // Only allow manual collapse/expand if the section is enabled
    if (isEnabled) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <section
      className={`calc-card ${isContentVisible ? 'is-open' : 'is-collapsed'} ${
        !isEnabled ? 'is-disabled-section' : ''
      }`}
    >
      <button
        type="button"
        className="calc-card-header"
        aria-expanded={isContentVisible}
        onClick={handleHeaderClick}
        disabled={!isEnabled}
      >
        <div className="calc-card-title-wrap">
          <span className="step-icon-badge" aria-hidden="true">
            {icon}
          </span>
          <div className="calc-card-headings">
            <div className="calc-card-title-line">
              <span className="step-num">0{stepNumber}</span>
              <h2 className="calc-card-title">{title}</h2>
            </div>
            {subtitle && <p className="calc-card-subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="calc-card-header-right">
          {optionalToggle && (
            <ToggleSwitch
              id={`toggle-sec-${stepNumber}`}
              checked={optionalToggle.enabled}
              onChange={(nextEnabled) => {
                optionalToggle.onToggle(nextEnabled);
                if (nextEnabled) {
                  setIsOpen(true);
                }
              }}
              label={`Enable ${title}`}
            />
          )}
          {badgeText && <span className="section-cost-pill">{badgeText}</span>}
          {isEnabled && (
            <ChevronDown
              size={18}
              className={`chevron-icon ${isOpen ? 'rotated' : ''}`}
            />
          )}
        </div>
      </button>

      {isContentVisible && <div className="calc-card-body">{children}</div>}
    </section>
  );
}
