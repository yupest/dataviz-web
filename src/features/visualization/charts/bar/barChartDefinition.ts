import type { ChartDefinition, BarChartSpec } from "../../domain/types";
import { createBarSpec } from "./createBarSpec";
import { buildBarOption } from "./buildBarOption";
import BarChartEditor from "./BarChartEditor";

export const barChartDefinition: ChartDefinition<BarChartSpec> = {
  type: "bar",
  label: "Столбчатый",
  icon: "📊",
  createDefaultSpec: createBarSpec,
  buildOption: buildBarOption,
  Editor: BarChartEditor,
};