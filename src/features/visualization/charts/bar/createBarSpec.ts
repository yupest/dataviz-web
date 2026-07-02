import type { BarChartSpec } from "../../domain/types";
import { createId } from "../../../../shared/utils/createId";

export function createBarSpec(): BarChartSpec {
  return {
    id: createId(),
    type: "bar",
    name: "Столбчатый график",
    categoryField: null,
    valueField: null,
  };
}