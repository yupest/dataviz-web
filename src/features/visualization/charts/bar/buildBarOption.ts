import type { EChartsOption } from "echarts";
import type { Dataset } from "../../../data/domain/types";
import type { BarChartSpec } from "../../domain/types";
import { formatCategoryLabel, normalizeNumber } from "../../services/chartData";

export function buildBarOption(dataset: Dataset, spec: BarChartSpec): EChartsOption | null {
  const valueField = spec.valueField;
  if (!valueField) return null;

  const valueMeta = dataset.columns.find((column) => column.field === valueField);
  if (!valueMeta || valueMeta.type !== "number") return null;

  if (dataset.rows.length === 0) return null;

  const categoryField = spec.categoryField;
  const categories = dataset.rows.map((row, index) => (categoryField ? formatCategoryLabel(row[categoryField], index) : String(index + 1)));
  const seriesData = dataset.rows.map((row) => normalizeNumber(row[valueField]));

  return {
    title: { text: spec.name, left: "center" },
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 24, top: 64, bottom: 48, containLabel: true },
    xAxis: { type: "category", data: categories, axisLabel: { hideOverlap: true } },
    yAxis: { type: "value", scale: true },
    series: [
      {
        name: valueMeta.title,
        type: "bar",
        data: seriesData,
      },
    ],
  };
}