import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { createChartSpec } from "../services/chartFactory";
import type { ChartId, ChartPatch, ChartSpec, ChartType } from "../domain/types";

type VisualizationContextValue = {
  charts: ChartSpec[];
  activeChartId: ChartId | null;
  activeChart: ChartSpec | null;
  setActiveChartId: (id: ChartId) => void;
  createChart: (type: ChartType) => ChartId;
  resetCharts: (type?: ChartType) => void;
  updateChart: <T extends ChartType>(id: ChartId, patch: ChartPatch<T>) => void;
  deleteChart: (id: ChartId) => void;
};

const initialChart = createChartSpec("line");

const VisualizationContext = createContext<VisualizationContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function VisualizationProvider({ children }: Props) {
  const [charts, setCharts] = useState<ChartSpec[]>([initialChart]);
  const [activeChartId, setActiveChartId] = useState<ChartId | null>(initialChart.id);

  const activeChart = useMemo(() => charts.find((chart) => chart.id === activeChartId) ?? null, [charts, activeChartId]);

  const createChart = useCallback((type: ChartType) => {
    const spec = createChartSpec(type);
    setCharts((prev) => [...prev, spec]);
    setActiveChartId(spec.id);
    return spec.id;
  }, []);

  const resetCharts = useCallback((type: ChartType = "line") => {
    const spec = createChartSpec(type);
    setCharts([spec]);
    setActiveChartId(spec.id);
  }, []);

  const updateChart = useCallback(<T extends ChartType>(id: ChartId, patch: ChartPatch<T>) => {
    setCharts((prev) => prev.map((chart) => (chart.id === id ? ({ ...chart, ...patch } as ChartSpec) : chart)));
  }, []);

  const deleteChart = useCallback((id: ChartId) => {
    setCharts((prev) => {
      const next = prev.filter((chart) => chart.id !== id);

      if (next.length === 0) {
        const fallback = createChartSpec("line");
        setActiveChartId(fallback.id);
        return [fallback];
      }

      if (activeChartId === id) {
        setActiveChartId(next[0].id);
      }

      return next;
    });
  }, [activeChartId]);

  const value = useMemo(
    () => ({ charts, activeChartId, activeChart, setActiveChartId, createChart, resetCharts, updateChart, deleteChart }),
    [charts, activeChartId, activeChart, createChart, resetCharts, updateChart, deleteChart]
  );

  return <VisualizationContext.Provider value={value}>{children}</VisualizationContext.Provider>;
}

export { VisualizationContext };