import type { EChartsOption } from "echarts";
import type { Dataset } from "../../../data/domain/types";
import type { LineChartSpec } from "../../domain/types";
import { formatCategoryLabel, normalizeNumber } from "../../services/chartData";

export function buildLineOption(dataset: Dataset, spec: LineChartSpec): EChartsOption | null {
  const yField = spec.yField;
  if (!yField) return null;

  const yMeta = dataset.columns.find((column) => column.field === yField);
  if (!yMeta || yMeta.type !== "number") return null;

  if (dataset.rows.length === 0) return null;

  const xField = spec.xField;
  const categories = dataset.rows.map((row, index) => (xField ? formatCategoryLabel(row[xField], index) : String(index + 1)));
  const seriesData = dataset.rows.map((row) => normalizeNumber(row[yField]));

  return {
    title: { text: spec.name, left: "center" },
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 24, top: 64, bottom: 48, containLabel: true },
    xAxis: { type: "category", data: categories, axisLabel: { hideOverlap: true } },
    yAxis: { type: "value", scale: true },
    series: [
      {
        name: yMeta.title,
        type: "line",
        smooth: spec.smooth,
        showSymbol: false,
        connectNulls: true,
        data: seriesData,
      },
    ],
  };
}