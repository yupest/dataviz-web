type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function FieldCheckbox({ label, checked, onChange }: Props) {
  return (
    <label className="visualization-editor__checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}