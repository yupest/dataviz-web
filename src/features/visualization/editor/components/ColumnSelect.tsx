import type { Dataset } from "../../../data/domain/types";
import { FieldSelect, type SelectOption } from "./FieldSelect";

type Props = {
  label: string;
  dataset: Dataset;
  value: string | null;
  onChange: (value: string | null) => void;
  filter?: (column: Dataset["columns"][number]) => boolean;
  emptyLabel?: string;
};

export default function ColumnSelect({
  label,
  dataset,
  value,
  onChange,
  filter,
  emptyLabel = "Не выбрано",
}: Props) {
  const options: SelectOption[] = dataset.columns
    .filter((column) => (filter ? filter(column) : true))
    .map((column) => ({
      value: column.field,
      label: `${column.title} · ${column.type}`,
    }));

  return <FieldSelect label={label} value={value} onChange={onChange} options={options} emptyLabel={emptyLabel} />;
}