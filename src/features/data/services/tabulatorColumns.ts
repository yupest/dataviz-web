import type { ColumnDefinition } from "tabulator-tables";
import type { Dataset } from "../domain/types";
import { TYPE_CONFIG } from "../domain/dataTypes";

function buildHeaderTitle(title: string, type: string): string {
  return `${title} · ${type}`;
}

function buildHeaderTooltip(field: string, type: string, uniqueCount: number, nullCount: number, sampleValues: string[]): string {
  return [
    `Field: ${field}`,
    `Type: ${type}`,
    `Unique values: ${uniqueCount}`,
    `Null values: ${nullCount}`,
    sampleValues.length > 0 ? `Samples: ${sampleValues.join(", ")}` : "Samples: -",
  ].join("\n");
}

export function buildTabulatorColumns(dataset: Dataset): ColumnDefinition[] {
  return dataset.columns.map((column) => {
    const config = TYPE_CONFIG[column.type];

    return {
      title: buildHeaderTitle(column.title, column.type),
      field: column.field,
      titleDownload: column.title,
      titlePrint: column.title,
      headerTooltip: buildHeaderTooltip(column.field, column.type, column.uniqueCount, column.nullCount, column.sampleValues),
      headerWordWrap: true,
      headerFilter: "input",
      sorter: config.sorter,
      editor: config.editor,
    };
  });
}