import type { CellValue } from "../domain/types";

export type Role = "feature" | "target" | "ignore";
export type Filter = {
  id: string;
  field: string;
  op: "contains" | "=" | "!=" | ">" | ">=" | "<" | "<=" | "blank" | "notblank";
  value: string;
};
export type Encoding = Record<
  string,
  { method: "one_hot" | "label"; categories: CellValue[] }
>;
export type ModelSettings = {
  roles: Record<string, Role>;
  targetKind: "auto" | "categorical" | "numeric";
  aliases: Record<string, number>;
  seed: number;
  testPercent: number;
  stratify: boolean;
  reference?: { encoding: Encoding; features: string[]; target: string };
};
export type ViewSettings = {
  hidden: string[];
  filters: Filter[];
  filterMode: "all" | "any";
  model: ModelSettings;
};
export const defaultModel = (): ModelSettings => ({
  roles: {},
  targetKind: "auto",
  aliases: {},
  seed: 42,
  testPercent: 20,
  stratify: true,
});
export const defaultView = (): ViewSettings => ({
  hidden: [],
  filters: [],
  filterMode: "all",
  model: defaultModel(),
});
export const keyOf = (value: CellValue) => JSON.stringify(value);
export const isBlank = (value: CellValue | undefined) =>
  value == null || (typeof value === "string" && value.trim() === "");
