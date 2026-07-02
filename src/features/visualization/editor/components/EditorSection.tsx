import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export default function EditorSection({ title, children }: Props) {
  return (
    <section className="visualization-editor__section">
      <h4 className="visualization-editor__section-title">{title}</h4>
      <div className="visualization-editor__section-body">{children}</div>
    </section>
  );
}