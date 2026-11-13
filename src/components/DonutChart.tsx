import { useState } from 'react';
import type { BreakdownItem, CurrencyCode } from '../types/calculator';
import { formatCurrency } from '../utils/calculations';

interface DonutChartProps {
  items: BreakdownItem[];
  totalAmount: number;
  currency: CurrencyCode;
}

export function DonutChart({ items, totalAmount, currency }: DonutChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const size = 210;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const nonZeroItems = items.filter((item) => item.unitAmount > 0.0001);
  const activeItem = nonZeroItems.find((item) => item.id === hoveredId) ?? null;

  const segments =
    totalAmount > 0
      ? nonZeroItems.reduce<
          Array<{
            item: BreakdownItem;
            dashArray: string;
            rotation: number;
            cumulativeAfter: number;
          }>
        >((acc, item) => {
          const prevCumulative =
            acc.length > 0 ? acc[acc.length - 1].cumulativeAfter : 0;
          const fraction = item.unitAmount / totalAmount;
          const segmentLength = fraction * circumference;
          acc.push({
            item,
            dashArray: `${Math.max(0, segmentLength - 1.5)} ${circumference}`,
            rotation: prevCumulative * 360 - 90,
            cumulativeAfter: prevCumulative + fraction,
          });
          return acc;
        }, [])
      : [];

  return (
    <div className="donut-container">
      <div className="donut-svg-wrap">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="donut-svg"
          role="img"
          aria-label="Cost breakdown donut chart"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            className="donut-track"
            strokeWidth={strokeWidth}
          />

          {segments.map(({ item, dashArray, rotation }) => {
            const isHovered = hoveredId === item.id;

            return (
              <circle
                key={item.id}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 5 : strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={0}
                transform={`rotate(${rotation} ${center} ${center})`}
                className="donut-segment"
                style={{
                  opacity: hoveredId && !isHovered ? 0.35 : 1,
                }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            );
          })}
        </svg>

        <div className="donut-center">
          {activeItem ? (
            <>
              <span className="donut-center-label">{activeItem.label}</span>
              <span className="donut-center-value">
                {formatCurrency(activeItem.unitAmount, currency)}
              </span>
              <span className="donut-center-pct">
                {activeItem.percentage.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="donut-center-label">Unit Price</span>
              <span className="donut-center-value">
                {formatCurrency(totalAmount, currency)}
              </span>
              <span className="donut-center-pct">100%</span>
            </>
          )}
        </div>
      </div>

      <div className="donut-legend">
        {items.map((item) => {
          const isHovered = hoveredId === item.id;
          const isZero = item.unitAmount <= 0.0001;
          return (
            <button
              key={item.id}
              type="button"
              className={`legend-item ${isHovered ? 'is-active' : ''} ${
                isZero ? 'is-muted' : ''
              }`}
              onMouseEnter={() => !isZero && setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() =>
                !isZero && setHoveredId((prev) => (prev === item.id ? null : item.id))
              }
            >
              <span
                className="legend-dot"
                style={{ backgroundColor: item.color }}
              />
              <span className="legend-name">{item.label}</span>
              <span className="legend-pct">{item.percentage.toFixed(1)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
