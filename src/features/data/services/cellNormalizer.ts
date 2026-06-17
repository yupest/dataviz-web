import type { DataRow } from "../types";

function convertCell(value: unknown) {

  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (text === "") {
    return null;
  }

  if (/^(true|false)$/i.test(text)) {
    return (text.toLowerCase() === "true");
  }

  const number = Number(text.replace(",", "."));
  if (!Number.isNaN(number)) {
    return number;
  }

  return text;
}

export function normalizeRow(row: Record<string, unknown>): DataRow {

  const result: DataRow = {};

  for (const [key, value] of Object.entries(row)) {
    result[key] = convertCell(value);
  }

  return result;
}