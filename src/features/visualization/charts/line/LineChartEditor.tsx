import type { ChartEditorProps, LineChartSpec } from "../../domain/types";
import ChartEditorShell from "../../editor/components/ChartEditorShell";
import EditorSection from "../../editor/components/EditorSection";
import AxisMappingBlock from "../../editor/blocks/AxisMappingBlock";
import SeriesStyleBlock from "../../editor/blocks/SeriesStyleBlock";

type Props = ChartEditorProps<LineChartSpec>;

export default function LineChartEditor({ dataset, chart, onChange }: Props) {
  return (
    <ChartEditorShell
      name={chart.name}
      onNameChange={(name) => onChange({ name })}
    >
      <EditorSection title="Оси">
        <AxisMappingBlock
          dataset={dataset}
          xField={chart.xField}
          yField={chart.yField}
          onXChange={(xField) => onChange({ xField })}
          onYChange={(yField) => onChange({ yField })}
        />
      </EditorSection>

      <EditorSection title="Стиль">
        <SeriesStyleBlock
          smooth={chart.smooth}
          onSmoothChange={(smooth) => onChange({ smooth })}
        />
      </EditorSection>
    </ChartEditorShell>
  );
}