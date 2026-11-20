import { useEffect, useState } from "react";
import type { Dataset, DataRow } from "../domain/types";
import { missing } from "./data";
import { normalizeCell } from "../services/cellNormalizer";

export default function TablePanel({
  dataset,
  rows,
  hidden,
  editing,
  onEdit,
  onRows,
  onRename,
  onDeleteColumn,
  onSort,
  sort,
}: {
  dataset: Dataset;
  rows: DataRow[];
  hidden: string[];
  editing: boolean;
  onEdit: () => void;
  onRows: (rows: DataRow[]) => void;
  onRename: (old: string, name: string) => void;
  onDeleteColumn: (field: string) => void;
  onSort: (field: string) => void;
  sort: { field: string; direction: 1 | -1 } | null;
}) {
  const [page, setPage] = useState(0),
    [pageSize, setPageSize] = useState(25),
    [column, setColumn] = useState(""),
    [name, setName] = useState("");
  const fields = dataset.columns.filter((c) => !hidden.includes(c.field));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)),
    current = Math.min(page, pages - 1);
  useEffect(() => setPage(0), [pageSize]);
  function patch(row: DataRow, field: string, value: string) {
    onRows(
      dataset.rows.map((r) =>
        r.__rowId === row.__rowId ? { ...r, [field]: normalizeCell(value) } : r,
      ),
    );
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ИСХОДНЫЕ ДАННЫЕ</span>
          <h2>Таблица</h2>
        </div>
        <span className="badge">
          {rows.length.toLocaleString("ru-RU")} записей · {fields.length}{" "}
          столбцов
        </span>
      </div>
      <p className="scope-note">
        Таблица учитывает фильтр и скрытые поля. NA = 1, если в строке есть хотя
        бы один пропуск, включая скрытые столбцы.
      </p>
      {editing && (
        <>
          <div className="notice">
            Режим редактирования. Изменения применятся после «Сохранить». Фильтр
            продолжает определять видимые строки; остальные строки сохраняются.
          </div>
          <div className="toolbar">
            <label>
              Поле
              <select
                aria-label="Редактируемый столбец"
                value={column}
                onChange={(e) => {
                  setColumn(e.target.value);
                  setName(e.target.value);
                }}
              >
                <option value="">Выберите поле</option>
                {dataset.columns.map((c) => (
                  <option key={c.field}>{c.field}</option>
                ))}
              </select>
            </label>
            <label>
              Название
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button
              disabled={!column || !name.trim()}
              onClick={() => {
                onRename(column, name.trim());
                setColumn("");
                setName("");
              }}
            >
              Переименовать
            </button>
            <button
              className="danger secondary"
              disabled={!column}
              onClick={() => {
                if (confirm(`Удалить столбец «${column}» из всех строк?`)) {
                  onDeleteColumn(column);
                  setColumn("");
                  setName("");
                }
              }}
            >
              Удалить столбец
            </button>
            <button
              className="secondary"
              onClick={() =>
                onRows([
                  ...dataset.rows,
                  Object.fromEntries([
                    ["__rowId", crypto.randomUUID()],
                    ...dataset.columns.map((c) => [c.field, null]),
                  ]) as DataRow,
                ])
              }
            >
              Добавить строку
            </button>
          </div>
        </>
      )}
      <div className="table-scroll data-grid">
        <table>
          <thead>
            <tr>
              {editing && <th>Удалить</th>}
              <th>№</th>
              <th>
                <span title="Наличие пропусков в строке">NA</span>
              </th>
              {fields.map((c) => (
                <th key={c.field}>
                  <button
                    className="column-sort"
                    onClick={() => onSort(c.field)}
                    title={`Сортировать: ${c.field}`}
                  >
                    {c.field}
                    {sort?.field === c.field
                      ? sort.direction === 1
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                  <span className={`type type-${c.type}`}>
                    {c.type === "number"
                      ? "число"
                      : c.type === "boolean"
                        ? "логическая"
                        : c.type === "date"
                          ? "дата"
                          : "категория"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .slice(current * pageSize, (current + 1) * pageSize)
              .map((row, i) => (
                <tr key={row.__rowId}>
                  {editing && (
                    <td>
                      <button
                        aria-label={`Удалить строку ${current * pageSize + i + 1}`}
                        className="delete-row"
                        onClick={() =>
                          onRows(
                            dataset.rows.filter(
                              (r) => r.__rowId !== row.__rowId,
                            ),
                          )
                        }
                      >
                        ×
                      </button>
                    </td>
                  )}
                  <td className="row-number">{current * pageSize + i + 1}</td>
                  <td className="missing-flag">
                    {missing(
                      row,
                      dataset.columns.map((c) => c.field),
                    )}
                  </td>
                  {fields.map((c) => (
                    <td
                      key={c.field}
                      className={row[c.field] == null ? "blank-cell" : ""}
                    >
                      {editing ? (
                        <input
                          aria-label={`Строка ${current * pageSize + i + 1}, ${c.field}`}
                          key={`${row.__rowId}:${c.field}:${String(row[c.field])}`}
                          defaultValue={
                            row[c.field] == null ? "" : String(row[c.field])
                          }
                          onBlur={(e) => {
                            if (
                              e.target.value !==
                              (row[c.field] == null ? "" : String(row[c.field]))
                            )
                              patch(row, c.field, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                        />
                      ) : (
                        <span title={String(row[c.field] ?? "")}>
                          {row[c.field] == null ? (
                            <span className="null-value">пусто</span>
                          ) : (
                            String(row[c.field])
                          )}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty-state">Нет строк, соответствующих фильтру.</div>
        )}
        {fields.length === 0 && (
          <div className="notice">
            Все столбцы скрыты. Выберите поля для отображения.
          </div>
        )}
      </div>
      <div className="pagination">
        <label>
          На странице
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[15, 25, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <span>
          Страница {current + 1} из {pages}
        </span>
        <button
          className="secondary"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          Предыдущая
        </button>
        <button
          className="secondary"
          disabled={current === pages - 1}
          onClick={() => setPage(current + 1)}
        >
          Следующая
        </button>
        {!editing && (
          <button className="secondary" onClick={onEdit}>
            Редактор
          </button>
        )}
      </div>
    </section>
  );
}
