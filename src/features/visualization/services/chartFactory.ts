import type { ChartSpec, ChartType } from "../domain/types";
import { chartRegistry } from "../domain/chartRegistry";

export function createChartSpec(type: ChartType): ChartSpec {
  return chartRegistry[type].createDefaultSpec();
}