import { createId } from "../../../shared/utils/createId";
import { ROW_ID_FIELD } from "../domain/row";
import type { CellValue, DataRow } from "../types";

export function normalizeCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;

  if (typeof value === "boolean" || typeof value === "number") return value;

  const text = String(value).trim();
  if (text === "") return null;
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === "true";

  const number = Number(text.replace(",", "."));
  if (!Number.isNaN(number)) return number;

  return text;
}

export function normalizeRow(row: Record<string, unknown>): DataRow {
  const result = { [ROW_ID_FIELD]: createId() } as DataRow;

  for (const [key, value] of Object.entries(row)) {
    result[key] = normalizeCell(value);
  }

  return result;
}