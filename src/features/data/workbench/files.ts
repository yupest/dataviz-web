import Papa from "papaparse";
import type { Dataset, DataRow } from "../domain/types";
import { normalizeCell } from "../services/cellNormalizer";
import { inferColumns } from "../services/columnInference";
import { defaultView } from "./types";

export function datasetFromRecords(
  records: Record<string, unknown>[],
  name: string,
  sourceType: Dataset["sourceType"],
): Dataset {
  if (!records.length) throw new Error("В файле нет записей.");
  const originalFields = [...new Set(records.flatMap((r) => Object.keys(r)))];
  if (!originalFields.length) throw new Error("В файле нет столбцов.");
  const reserved = new Set([
    "__rowId",
    "__missing__",
    "__proto__",
    "constructor",
    "prototype",
  ]);
  const names = new Set(originalFields.filter((f) => !reserved.has(f)));
  const mapping = Object.fromEntries(
    originalFields.map((f) => {
      let name = f;
      if (reserved.has(name)) {
        name = `${f}_source`;
        while (names.has(name)) name += "_";
      }
      names.add(name);
      return [f, name];
    }),
  );
  const fields = originalFields.map((f) => mapping[f]);
  const rows = records.map((record, i) =>
    Object.fromEntries([
      ["__rowId", `row-${i}`],
      ...originalFields.map((f) => [mapping[f], normalizeCell(record[f])]),
    ]),
  ) as DataRow[];
  return {
    name,
    sourceType,
    columns: inferColumns(rows, fields),
    rows,
    view: defaultView(),
  };
}
export function validateWorkspace(value: unknown): Dataset {
  const obj = value as { format?: string; dataset?: Dataset };
  const d = obj?.dataset;
  if (
    obj?.format !== "dataviz-data-workspace-v1" ||
    !d ||
    !Array.isArray(d.rows) ||
    !Array.isArray(d.columns) ||
    !d.columns.length ||
    typeof d.name !== "string"
  )
    throw new Error("Некорректный файл проекта.");
  const fields = d.columns.map((c) => c.field);
  if (
    fields.some(
      (f) =>
        typeof f !== "string" ||
        [
          "__rowId",
          "__missing__",
          "__proto__",
          "constructor",
          "prototype",
        ].includes(f),
    ) ||
    new Set(fields).size !== fields.length
  )
    throw new Error("Некорректные имена столбцов проекта.");
  const ids = new Set<string>();
  for (const row of d.rows) {
    if (!row || typeof row.__rowId !== "string" || ids.has(row.__rowId))
      throw new Error("Некорректные идентификаторы строк проекта.");
    ids.add(row.__rowId);
    for (const field of fields) {
      const v = row[field];
      if (v != null && !["number", "boolean", "string"].includes(typeof v))
        throw new Error("В ячейках допустимы только простые значения.");
    }
  }
  if (
    d.view &&
    (!Array.isArray(d.view.filters) ||
      !Array.isArray(d.view.hidden) ||
      !d.view.model ||
      !["all", "any"].includes(d.view.filterMode))
  )
    throw new Error("Некорректные настройки проекта.");
  return {
    ...d,
    columns: inferColumns(d.rows, fields),
    view: d.view ?? defaultView(),
  };
}
export async function readFile(
  file: File,
  sheetName?: string,
): Promise<{ dataset: Dataset; sheets?: string[] }> {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (extension === "xlsx" || extension === "xls") {
    const XLSX = await import("xlsx");
    const book = XLSX.read(await file.arrayBuffer(), { cellDates: true });
    const selected = sheetName ?? book.SheetNames[0];
    if (!book.Sheets[selected])
      throw new Error("В книге нет выбранного листа.");
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      book.Sheets[selected],
      { defval: null, raw: true },
    );
    return {
      dataset: datasetFromRecords(
        records.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [
              k,
              v instanceof Date ? v.toISOString().slice(0, 10) : v,
            ]),
          ),
        ),
        file.name,
        extension,
      ),
      sheets: book.SheetNames,
    };
  }
  const text = await file.text();
  if (extension === "json") {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed &&
      typeof parsed === "object" &&
      "format" in parsed &&
      parsed.format === "dataviz-data-workspace-v1"
    )
      return { dataset: validateWorkspace(parsed) };
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    if (!rows.every((r) => r && typeof r === "object" && !Array.isArray(r)))
      throw new Error("JSON должен содержать объект или массив объектов.");
    return {
      dataset: datasetFromRecords(
        rows as Record<string, unknown>[],
        file.name,
        "json",
      ),
    };
  }
  if (extension === "csv" || extension === "txt") {
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
    });
    if (result.errors.length)
      throw new Error(`Ошибка CSV: ${result.errors[0].message}`);
    if (
      result.meta.renamedHeaders &&
      Object.keys(result.meta.renamedHeaders).length
    )
      throw new Error(
        "В CSV повторяются названия столбцов. Сделайте их уникальными.",
      );
    return { dataset: datasetFromRecords(result.data, file.name, "csv") };
  }
  throw new Error("Поддерживаются CSV, TXT, JSON, XLS и XLSX.");
}
