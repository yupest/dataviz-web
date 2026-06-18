import type { ROW_ID_FIELD } from "./domain/row";

export type DataType = "string" | "number" | "boolean" | "date";

export type CellValue = string | number | boolean | null;

export type DataRow = {
  [ROW_ID_FIELD]: string;
} & Record<string, CellValue>;

export type ColumnMeta = {
  field: string;
  title: string;
  type: DataType;
  uniqueCount: number;
  nullCount: number;
  sampleValues: string[];
};

export type Dataset = {
  name: string;
  sourceType: "csv" | "json";
  columns: ColumnMeta[];
  rows: DataRow[];
};