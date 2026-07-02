import { FieldCheckbox } from "../components/FieldCheckbox";

type Props = {
  smooth: boolean;
  onSmoothChange: (value: boolean) => void;
};

export default function SeriesStyleBlock({ smooth, onSmoothChange }: Props) {
  return <FieldCheckbox label="Сглаживание линии" checked={smooth} onChange={onSmoothChange} />;
}