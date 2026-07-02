import { lineChartDefinition } from "../charts/line/lineChartDefinition";
import { barChartDefinition } from "../charts/bar/barChartDefinition";

export const chartRegistry = {
  line: lineChartDefinition,
  bar: barChartDefinition,
} as const;