import type { LineChartSpec } from "../../domain/types";
import { createId } from "../../../../shared/utils/createId";

export function createLineSpec(): LineChartSpec {
  return {
    id: createId(),
    type: "line",
    name: "Линейный график",
    xField: null,
    yField: null,
    smooth: false,
  };
}