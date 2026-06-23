type Props = {
  title: string;
  description: string;
};

export default function WorkspacePlaceholder({ title, description }: Props) {
  return (
    <section className="workspace-card">
      <h2 className="workspace-card__title">{title}</h2>
      <p className="workspace-card__text">{description}</p>
    </section>
  );
}