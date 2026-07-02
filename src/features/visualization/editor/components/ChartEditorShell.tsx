import type { ReactNode } from "react";
import { FieldInput } from "./FieldInput";
import "./ChartEditor.css";

type Props = {
  title?: string;
  name: string;
  onNameChange: (name: string) => void;
  children: ReactNode;
};

export default function ChartEditorShell({
  title = "Настройки графика",
  name,
  onNameChange,
  children,
}: Props) {
  return (
    <aside className="visualization-editor">
      <div className="visualization-editor__header">
        <h3 className="visualization-editor__title">{title}</h3>

        <FieldInput
          label="Название графика"
          value={name}
          onChange={onNameChange}
          placeholder="Введите название"
        />
      </div>

      <div className="visualization-editor__body">{children}</div>
    </aside>
  );
}