import { useEffect, useRef } from "react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";
import { buildTabulatorColumns } from "../../services/tabulatorColumns";
import { useDataset } from "../../hooks/useDataset";
import "./DataTable.css";

export default function DataTable() {
  const { dataset } = useDataset();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const tabulatorRef = useRef<InstanceType<typeof Tabulator> | null>(null);

  useEffect(() => {
    if (!tableRef.current) return;

    tabulatorRef.current?.destroy();
    tabulatorRef.current = null;

    if (!dataset) return;

    tabulatorRef.current = new Tabulator(tableRef.current, {
      data: dataset.rows,
      columns: buildTabulatorColumns(dataset),
      layout: "fitColumns",
      placeholder: "Нет данных для отображения",
    });

    return () => {
      tabulatorRef.current?.destroy();
      tabulatorRef.current = null;
    };
  }, [dataset]);

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

      <div ref={tableRef} className="data-table-root" />
    </section>
  );
}