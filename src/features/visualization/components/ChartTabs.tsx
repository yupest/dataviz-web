import { useEffect, useRef, useState } from "react";
import { chartRegistry } from "../domain/chartRegistry";
import type { ChartSpec } from "../domain/types";
import "./VisualizationWorkspace.css";

type Props = {
  charts: ChartSpec[];
  activeChartId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

export default function ChartTabs({ charts, activeChartId, onSelect, onDelete, onAdd }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const update = () => {
      setContainerWidth(containerRef.current?.clientWidth ?? 0);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const availableWidth = Math.max(containerWidth - 56, 0);
  const tabWidth = charts.length > 0 ? Math.max(44, Math.min(180, Math.floor(availableWidth / charts.length))) : 180;
  const compact = tabWidth < 96;

  return (
    <div ref={containerRef} className="chart-tabs">
      <div className="chart-tabs__row">
        {charts.map((chart) => {
          const active = chart.id === activeChartId;
          const definition = chartRegistry[chart.type];

          return (
            <button
              key={chart.id}
              type="button"
              className={`chart-tabs__tab ${active ? "chart-tabs__tab--active" : ""} ${compact ? "chart-tabs__tab--compact" : ""}`}
              style={{ width: `${tabWidth}px` }}
              title={chart.name}
              onClick={() => onSelect(chart.id)}
            >
              <span className="chart-tabs__left">
                <span className="chart-tabs__icon">{definition.icon}</span>
                {!compact && <span className="chart-tabs__label">{chart.name}</span>}
              </span>

              <span
                className="chart-tabs__close"
                role="button"
                aria-label={`Удалить график ${chart.name}`}
                title="Удалить график"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(chart.id);
                }}
              >
                ×
              </span>
            </button>
          );
        })}

        <button type="button" className="chart-tabs__add" title="Добавить график" onClick={onAdd}>
          +
        </button>
      </div>
    </div>
  );
}