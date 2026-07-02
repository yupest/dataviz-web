import type { Dataset } from "../../data/domain/types";
import { chartRegistry } from "../domain/chartRegistry";
import type { ChartSpec } from "../domain/types";

type Props = {
  dataset: Dataset;
  chart: ChartSpec;
  onChange: (patch: Partial<Omit<ChartSpec, "id" | "type">>) => void;
};

export default function ChartEditorHost({ dataset, chart, onChange }: Props) {
  const definition = chartRegistry[chart.type];
  const Editor = definition.Editor as React.ComponentType<any>;

  return <Editor dataset={dataset} chart={chart} onChange={onChange} />;
}