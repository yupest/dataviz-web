import Papa from "papaparse";
import type { CellValue, DataRow, Dataset } from "../domain/types";
import { inferColumns } from "../services/columnInference";
import {
  defaultView,
  isBlank,
  type Encoding,
  type Filter,
  type ViewSettings,
} from "./types";

export function withRows(
  dataset: Dataset,
  rows: DataRow[],
  fields = dataset.columns.map((c) => c.field),
): Dataset {
  return { ...dataset, rows, columns: inferColumns(rows, fields) };
}
export const viewOf = (dataset: Dataset): ViewSettings =>
  dataset.view ?? defaultView();
export function missing(row: DataRow, fields: string[]) {
  return fields.some((f) => isBlank(row[f])) ? 1 : 0;
}
export function filterRows(
  dataset: Dataset,
  filters: Filter[],
  mode: "all" | "any",
): DataRow[] {
  const fields = dataset.columns.map((c) => c.field);
  const active = filters.filter(
    (f) => f.field && (["blank", "notblank"].includes(f.op) || f.value !== ""),
  );
  return dataset.rows.filter((row) => {
    const checks = active.map((f) => {
      const cell =
        f.field === "__missing__" ? missing(row, fields) : row[f.field];
      if (f.op === "blank") return isBlank(cell);
      if (f.op === "notblank") return !isBlank(cell);
      if (isBlank(cell)) return false;
      const a = String(cell).toLocaleLowerCase(),
        b = f.value.toLocaleLowerCase();
      if (f.op === "contains") return a.includes(b);
      if (f.op === "=") return a === b;
      if (f.op === "!=") return a !== b;
      const numeric = typeof cell === "number";
      const left = numeric ? cell : a;
      const right = numeric ? Number(f.value.replace(",", ".")) : b;
      if (numeric && !Number.isFinite(right)) return false;
      if (f.op === ">") return left! > right;
      if (f.op === ">=") return left! >= right;
      if (f.op === "<") return left! < right;
      return left! <= right;
    });
    return (
      !checks.length ||
      (mode === "all" ? checks.every(Boolean) : checks.some(Boolean))
    );
  });
}
export function schemaFor(dataset: Dataset): Encoding {
  return Object.fromEntries(
    dataset.columns
      .filter((c) => c.type !== "number")
      .map((c) => {
        const categories = [
          ...new Map(
            dataset.rows
              .filter((r) => !isBlank(r[c.field]))
              .map((r) => [JSON.stringify(r[c.field]), r[c.field]]),
          ).values(),
        ].sort((a, b) =>
          String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0,
        );
        return [
          c.field,
          { method: categories.length <= 15 ? "one_hot" : "label", categories },
        ];
      }),
  );
}
export function encodeRows(
  rows: DataRow[],
  fields: string[],
  encoding: Encoding,
) {
  const headers: string[] = [];
  for (const field of fields) {
    const rule = encoding[field];
    if (rule?.method === "one_hot")
      headers.push(...rule.categories.map((v) => `${field}_${v}`));
    else headers.push(field);
  }
  if (new Set(headers).size !== headers.length)
    throw new Error(
      "Кодирование создаёт одинаковые названия столбцов. Переименуйте исходные поля.",
    );
  const indexes = new Map(Object.entries(encoding).map(([field, rule]) =>
    [field, new Map(rule.categories.map((value, index) => [value, index]))]));
  const data = rows.map((row) =>
    fields.flatMap((field) => {
      const rule = encoding[field],
        value = row[field];
      if (!rule) return [value];
      const index = indexes.get(field)?.get(value) ?? -1;
      if (index < 0 && !isBlank(value))
        throw new Error(
          `В словаре «${field}» отсутствует значение «${value}». Загрузите совместимые настройки.`,
        );
      return rule.method === "one_hot"
        ? rule.categories.map((_, i) => (i === index ? 1 : 0))
        : [index < 0 ? null : index];
    }),
  );
  return { headers, data };
}
export function csv(headers: string[], rows: CellValue[][]) {
  return Papa.unparse({ fields: headers, data: rows }, { newline: "\r\n" });
}
export function saveFile(
  name: string,
  content: BlobPart,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function statistics(dataset: Dataset) {
  return dataset.columns.map((col) => {
    const values = dataset.rows
      .map((r) => r[col.field])
      .filter((v) => !isBlank(v));
    const counts = new Map<string, number>();
    values.forEach((v) =>
      counts.set(String(v), (counts.get(String(v)) ?? 0) + 1),
    );
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    const nums = values
      .filter((v): v is number => typeof v === "number")
      .sort((a, b) => a - b);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const q = (p: number) => {
      const pos = (nums.length - 1) * p,
        i = Math.floor(pos);
      return nums.length
        ? nums[i] + (nums[Math.ceil(pos)] - nums[i]) * (pos - i)
        : null;
    };
    return {
      field: col.field,
      type: col.type,
      count: values.length,
      missing: dataset.rows.length - values.length,
      unique: counts.size,
      top: top?.[0] ?? "—",
      frequency: top?.[1] ?? 0,
      mean: nums.length ? mean : null,
      std:
        nums.length > 1
          ? Math.sqrt(
              nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1),
            )
          : null,
      min: nums[0] ?? null,
      q25: q(0.25),
      median: q(0.5),
      q75: q(0.75),
      max: nums.at(-1) ?? null,
    };
  });
}
