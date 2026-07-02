import type { ChartEditorProps, BarChartSpec } from "../../domain/types";
import ChartEditorShell from "../../editor/components/ChartEditorShell";
import EditorSection from "../../editor/components/EditorSection";
import CategoryValueMappingBlock from "../../editor/blocks/CategoryValueMappingBlock";

type Props = ChartEditorProps<BarChartSpec>;

export default function BarChartEditor({ dataset, chart, onChange }: Props) {
  return (
    <ChartEditorShell
      name={chart.name}
      onNameChange={(name) => onChange({ name })}
    >
      <EditorSection title="Поля">
        <CategoryValueMappingBlock
          dataset={dataset}
          categoryField={chart.categoryField}
          valueField={chart.valueField}
          onCategoryChange={(categoryField) => onChange({ categoryField })}
          onValueChange={(valueField) => onChange({ valueField })}
        />
      </EditorSection>
    </ChartEditorShell>
  );
}