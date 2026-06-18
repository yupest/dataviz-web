import { useEffect, useRef } from "react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import type { CellComponent } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";

import { useDataset } from "../../hooks/useDataset";
import { buildTabulatorColumns } from "../../services/tabulatorColumns";
import type { CellValue, DataRow } from "../../types";
import "./DataTable.css";

export default function DataTable() {
  const { dataset, datasetVersion, updateCell } = useDataset();
  const tableElementRef = useRef<HTMLDivElement | null>(null);
  const tabulatorRef = useRef<InstanceType<typeof Tabulator> | null>(null);

  useEffect(() => {
    if (!tableElementRef.current) return;

    tabulatorRef.current?.destroy();
    tabulatorRef.current = null;

    if (!dataset) return;

    const table = new Tabulator(tableElementRef.current, {
      data: dataset.rows,
      columns: buildTabulatorColumns(dataset),
      layout: "fitColumns",
      placeholder: "Нет данных для отображения",
    });

    table.on("cellEdited", (cell: CellComponent) => {
      const row = cell.getRow().getData() as DataRow;
      const rowId = row.__rowId;
      const field = cell.getField();
      const value = cell.getValue() as CellValue;

      void updateCell(rowId, field, value);
    });

    tabulatorRef.current = table;

    return () => {
      table.destroy();
      tabulatorRef.current = null;
    };
  }, [datasetVersion]);

  return (
    <section className="data-table-section">
      <div className="data-table-header">
        <h2>Таблица данных</h2>
        {dataset && (
          <div className="data-table-meta">
            <span>Файл: {dataset.name}</span>
            <span>Строк: {dataset.rows.length}</span>
            <span>Колонок: {dataset.columns.length}</span>
          </div>
        )}
      </div>

      {!dataset && <div className="data-table-empty">Сначала загрузите CSV или JSON файл.</div>}
      <div ref={tableElementRef} className="data-table-root" />
    </section>
  );
}