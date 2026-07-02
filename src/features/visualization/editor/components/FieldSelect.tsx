export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  emptyLabel?: string;
};

export function FieldSelect({ label, value, onChange, options, emptyLabel = "Не выбрано" }: Props) {
  return (
    <label className="visualization-editor__field">
      <span className="visualization-editor__field-label">{label}</span>
      <select className="visualization-editor__input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}