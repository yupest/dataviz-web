import type { ChartDefinition, LineChartSpec } from "../../domain/types";
import { createLineSpec } from "./createLineSpec";
import { buildLineOption } from "./buildLineOption";
import LineChartEditor from "./LineChartEditor";

export const lineChartDefinition: ChartDefinition<LineChartSpec> = {
  type: "line",
  label: "Линейный",
  icon: "📈",
  createDefaultSpec: createLineSpec,
  buildOption: buildLineOption,
  Editor: LineChartEditor,
};