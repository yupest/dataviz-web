import type { ColumnMeta, DataRow, DataType, } from "../types";

function normalizeValue(value: unknown): string {
  return String(value ?? "").trim();
}

function isBooleanLike(value: string): boolean {
  return /^(true|false)$/i.test(value);
}

function isNumberLike(value: string): boolean {
  return !Number.isNaN(Number(value.replace(",", ".")));
}

function isDateLike(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function detectType(values: string[]): DataType {

  const nonEmpty = values.filter((v) => v !== "");

  if (nonEmpty.length > 0 && nonEmpty.every(isBooleanLike)) {
    return "boolean";
  }

  if (nonEmpty.length > 0 && nonEmpty.every(isNumberLike)) {
    return "number";
  }

  if (nonEmpty.length > 0 && nonEmpty.every(isDateLike)) {
    return "date";
  }

  return "string";
}

export function inferColumnMeta(field: string, rows: DataRow[]): ColumnMeta {

  const values = rows.map((row) => normalizeValue(row[field]));
  const nonEmpty = values.filter((v) => v !== "");
  const uniqueValues = Array.from(new Set(nonEmpty));
  const type = detectType(values);

  return {
    field, title: field, type,

    uniqueCount: uniqueValues.length,

    nullCount: values.length - nonEmpty.length,

    sampleValues: uniqueValues.slice(0, 5),
  };
}

export function inferColumns(rows: DataRow[], fields: string[]): ColumnMeta[] {
  return fields.map((field) => inferColumnMeta(field, rows));
}