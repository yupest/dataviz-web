import type { Dataset } from "../../../data/domain/types";
import ColumnSelect from "../components/ColumnSelect";

type Props = {
  dataset: Dataset;
  categoryField: string | null;
  valueField: string | null;
  onCategoryChange: (value: string | null) => void;
  onValueChange: (value: string | null) => void;
};

export default function CategoryValueMappingBlock({
  dataset,
  categoryField,
  valueField,
  onCategoryChange,
  onValueChange,
}: Props) {
  return (
    <>
      <ColumnSelect
        label="Категория"
        dataset={dataset}
        value={categoryField}
        onChange={onCategoryChange}
        emptyLabel="Выберите категорию"
      />

      <ColumnSelect
        label="Значение"
        dataset={dataset}
        value={valueField}
        onChange={onValueChange}
        filter={(column) => column.type === "number"}
        emptyLabel="Выберите числовой столбец"
      />
    </>
  );
}