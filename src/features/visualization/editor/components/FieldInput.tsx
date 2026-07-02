type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function FieldInput({ label, value, onChange, placeholder }: Props) {
  return (
    <label className="visualization-editor__field">
      <span className="visualization-editor__field-label">{label}</span>
      <input
        className="visualization-editor__input"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}