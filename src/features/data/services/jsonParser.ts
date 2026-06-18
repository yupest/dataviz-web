import { isSystemField } from "../domain/row";
import type { Dataset, DataRow, } from "../types";
import { normalizeRow } from "./cellNormalizer";
import { inferColumns, } from "./columnInference";

function normalizeJson(value: unknown): DataRow[] {

  if (Array.isArray(value)) {
    return value
      .filter((item) => item && typeof item === "object")
      .map((item) => normalizeRow(item as Record<string, unknown>));
  }

  if (value && typeof value === "object") {
    return [normalizeRow(value as Record<string, unknown>),];
  }

  return [];
}

export async function parseJsonFile(file: File): Promise<Dataset> {

  const text = await file.text();

  const parsed = JSON.parse(text);

  const rows = normalizeJson(parsed);

  const fields = rows.length > 0 ? Object.keys(rows[0]).filter((field) => !isSystemField(field)) : [];

  return { name: file.name,
           sourceType: "json",
           columns: inferColumns(rows, fields),
           rows,};
}