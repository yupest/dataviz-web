import { useMemo } from "react";
import type { Dataset } from "../../data/domain/types";
import { chartRegistry } from "../domain/chartRegistry";
import type { ChartSpec } from "../domain/types";
import EChartPreview from "./EChartPreview";

type Props = {
  dataset: Dataset;
  chart: ChartSpec | null;
};

export default function ChartPreviewHost({ dataset, chart }: Props) {
  const option = useMemo(() => {
    if (!chart) return null;
    const definition = chartRegistry[chart.type];
    return definition.buildOption(dataset, chart as never);
  }, [dataset, chart]);

  return <EChartPreview option={option} emptyMessage="Выберите поля для построения графика." />;
}