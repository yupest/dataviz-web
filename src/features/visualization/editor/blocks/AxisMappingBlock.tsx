import type { Dataset } from "../../../data/domain/types";
import ColumnSelect from "../components/ColumnSelect";

type Props = {
  dataset: Dataset;
  xField: string | null;
  yField: string | null;
  onXChange: (value: string | null) => void;
  onYChange: (value: string | null) => void;
};

export default function AxisMappingBlock({ dataset, xField, yField, onXChange, onYChange }: Props) {
  return (
    <>
      <ColumnSelect
        label="Ось X"
        dataset={dataset}
        value={xField}
        onChange={onXChange}
        emptyLabel="Индекс строки"
      />

      <ColumnSelect
        label="Ось Y"
        dataset={dataset}
        value={yField}
        onChange={onYChange}
        filter={(column) => column.type === "number"}
        emptyLabel="Выберите числовой столбец"
      />
    </>
  );
}