import type { ComponentType } from "react";
import type { EChartsOption } from "echarts";
import type { Dataset } from "../../data/domain/types";

export type ChartId = string;
export type ChartType = "line" | "bar";

export type ChartBase = {
  id: ChartId;
  type: ChartType;
  name: string;
};

export type LineChartSpec = ChartBase & {
  type: "line";
  xField: string | null;
  yField: string | null;
  smooth: boolean;
};

export type BarChartSpec = ChartBase & {
  type: "bar";
  categoryField: string | null;
  valueField: string | null;
};

export type ChartSpecByType = {
  line: LineChartSpec;
  bar: BarChartSpec;
};

export type ChartSpec = ChartSpecByType[ChartType];
export type ChartPatch<T extends ChartType> = Partial<Omit<ChartSpecByType[T], "id" | "type">>;

export type ChartEditorProps<TSpec extends ChartSpec> = {
  dataset: Dataset;
  chart: TSpec;
  onChange: (patch: Partial<Omit<TSpec, "id" | "type">>) => void;
};

export type ChartDefinition<TSpec extends ChartSpec> = {
  type: TSpec["type"];
  label: string;
  icon: string;
  createDefaultSpec: () => TSpec;
  buildOption: (dataset: Dataset, spec: TSpec) => EChartsOption | null;
  Editor: ComponentType<ChartEditorProps<TSpec>>;
};