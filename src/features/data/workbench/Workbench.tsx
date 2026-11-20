import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { useDataset } from "../hooks/useDataset";
import type { Dataset } from "../domain/types";
import {
  csv,
  encodeRows,
  filterRows,
  saveFile,
  schemaFor,
  statistics,
  viewOf,
  withRows,
} from "./data";
import { datasetFromRecords, readFile } from "./files";
import { defaultModel, type Filter, type ViewSettings } from "./types";
import TablePanel from "./TablePanel";
const ModelPanel = lazy(() => import("./ModelPanel"));
import Help from "./Help";
import "./workbench.css";

const fmt = (n: number | null) =>
  n == null
    ? "—"
    : Number.isInteger(n)
      ? n.toLocaleString("ru-RU")
      : n.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
export default function Workbench() {
  const { dataset, setDataset, isReady, clear } = useDataset();
  const [tab, setTab] = useState<"table" | "stats" | "model" | "help">("table");
  const [draft, setDraft] = useState<Dataset | null>(null),
    [showFields, setShowFields] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const [sort, setSort] = useState<{ field: string; direction: 1 | -1 } | null>(
    null,
  );
  const fileInput = useRef<HTMLInputElement>(null),
    excelFile = useRef<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]),
    [sheet, setSheet] = useState("");
  const active = draft ?? dataset,
    view = active ? viewOf(active) : null;
  const filtered = useMemo(
    () =>
      active && view ? filterRows(active, view.filters, view.filterMode) : [],
    [active, view],
  );
  const rows = useMemo(
    () =>
      sort
        ? [...filtered].sort((a, b) => {
            const x = a[sort.field],
              y = b[sort.field];
            if (x == null) return y == null ? 0 : 1;
            if (y == null) return -1;
            return (
              (typeof x === "number" && typeof y === "number"
                ? x - y
                : String(x).localeCompare(String(y), "ru", { numeric: true })) *
              sort.direction
            );
          })
        : filtered,
    [filtered, sort],
  );
  const stats = useMemo(
    () => (active && tab === "stats" ? statistics(active) : []),
    [active, tab],
  );
  async function persist(next: Dataset) {
    setError("");
    try {
      await setDataset(next);
      setStatus("Сохранено в этом браузере");
    } catch {
      setError(
        "Не удалось сохранить в браузере. Скачайте проект, чтобы сохранить данные в файл.",
      );
    }
  }
  function changeView(next: ViewSettings) {
    if (active) void persist({ ...active, view: next });
  }
  async function upload(file: File, sheetName?: string) {
    if (draft) {
      setError("Сохраните или отмените изменения редактора перед загрузкой.");
      return;
    }
    if (
      !sheetName &&
      dataset &&
      !confirm(
        "Заменить текущие данные? Сначала сохраните проект, если он нужен.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await readFile(file, sheetName);
      await persist(result.dataset);
      setSort(null);
      setTab("table");
      setSheets(result.sheets ?? []);
      setSheet(sheetName ?? result.sheets?.[0] ?? "");
      excelFile.current = result.sheets ? file : null;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportData(encoded: boolean) {
    if (!active || !view) return;
    try {
      const fields = active.columns
        .filter((c) => !view.hidden.includes(c.field))
        .map((c) => c.field);
      if (!fields.length)
        throw new Error("Выберите хотя бы один видимый столбец.");
      const table = encoded
        ? encodeRows(rows, fields, schemaFor(active))
        : { headers: fields, data: rows.map((r) => fields.map((f) => r[f])) };
      saveFile(
        active.name.replace(/\.[^.]+$/, "") +
          (encoded ? "_encode.csv" : "_new.csv"),
        "\uFEFF" + csv(table.headers, table.data),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function rename(old: string, name: string) {
    if (!draft) return;
    if (name === old) return;
    if (
      [
        "__rowId",
        "__missing__",
        "__proto__",
        "constructor",
        "prototype",
      ].includes(name) ||
      draft.columns.some((c) => c.field === name)
    ) {
      setError("Название уже существует или зарезервировано.");
      return;
    }
    const fields = draft.columns.map((c) => (c.field === old ? name : c.field));
    const updated = draft.rows.map(
      (row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k === old ? name : k, v]),
        ) as typeof row,
    );
    setDraft({
      ...withRows(draft, updated, fields),
      view: {
        ...viewOf(draft),
        hidden: viewOf(draft).hidden.map((f) => (f === old ? name : f)),
        filters: viewOf(draft).filters.map((f) => ({
          ...f,
          field: f.field === old ? name : f.field,
        })),
        model: defaultModel(),
      },
    });
    setError("");
  }
  function deleteColumn(field: string) {
    if (!draft) return;
    if (draft.columns.length === 1) {
      setError("Нельзя удалить последний столбец.");
      return;
    }
    const updated = draft.rows.map((row) => {
      const copy = { ...row };
      delete copy[field];
      return copy;
    });
    setDraft({
      ...withRows(
        draft,
        updated,
        draft.columns.filter((c) => c.field !== field).map((c) => c.field),
      ),
      view: {
        ...viewOf(draft),
        hidden: viewOf(draft).hidden.filter((f) => f !== field),
        filters: viewOf(draft).filters.filter((f) => f.field !== field),
        model: defaultModel(),
      },
    });
  }
  function patchFilter(id: string, patch: Partial<Filter>) {
    if (view)
      changeView({
        ...view,
        filters: view.filters.map((f) =>
          f.id === id ? { ...f, ...patch } : f,
        ),
      });
  }
  if (!isReady)
    return (
      <main className="loading" role="status">
        Восстанавливаем рабочие данные…
      </main>
    );
  return (
    <div className="data-app">
      <header className="app-header">
        <a href="#" className="brand" onClick={(e) => e.preventDefault()}>
          <span className="brand-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            Датавиз<span className="brand-sub">Работа с данными</span>
          </span>
        </a>
        <span className="local-label">
          В браузере · без отправки данных на сервер
        </span>
        <button className="secondary" disabled={!!draft} onClick={() => setTab("help")}>
          Справка
        </button>
      </header>
      <main className="workbench">
        <div className="page-heading">
          <div>
            <span className="eyebrow">ДАННЫЕ</span>
            <h1>От исходной таблицы к выборкам</h1>
            <p>
              Проверьте, подготовьте и выгрузите данные для анализа и модели.
            </p>
          </div>
          <div className="file-actions">
            <input
              ref={fileInput}
              aria-label="Загрузить файл данных или проект"
              type="file"
              accept=".csv,.txt,.json,.xlsx,.xls"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
            <button
              disabled={busy || !!draft}
              onClick={() => fileInput.current?.click()}
            >
              {busy ? "Загрузка…" : "Загрузить файл"}
            </button>
            {dataset && (
              <button
                className="secondary"
                disabled={!!draft}
                onClick={() => {
                  saveFile(
                    "dataviz-project.json",
                    JSON.stringify({
                      format: "dataviz-data-workspace-v1",
                      dataset,
                    }),
                    "application/octet-stream",
                  );
                  setStatus("Файл проекта подготовлен для скачивания");
                }}
              >
                Сохранить проект
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <button aria-label="Закрыть сообщение" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        <div className="save-status" role="status">
          {status}
        </div>
        {!dataset && (
          <section
            className="panel empty-upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) void upload(f);
            }}
          >
            <div className="upload-glyph" aria-hidden="true">
              ▤
            </div>
            <h2>Начните с набора данных</h2>
            <p>Перетащите файл сюда или выберите его на компьютере.</p>
            <p className="muted">
              CSV · TXT · JSON · XLS · XLSX · сохранённый проект
            </p>
            <button disabled={busy} onClick={() => fileInput.current?.click()}>
              Выбрать файл
            </button>
            <button
              className="link"
              onClick={() =>
                void persist(
                  datasetFromRecords(
                    Array.from({ length: 120 }, (_, i) => ({
                      id: i + 1,
                      Город: ["Иркутск", "Москва", "Казань"][i % 3],
                      Возраст: 18 + (i % 45),
                      Доход: i % 17 === 0 ? null : 35000 + i * 800,
                      Подписка: i % 4 === 0 ? "Да" : "Нет",
                    })),
                    "Пример.csv",
                    "csv",
                  ),
                )
              }
            >
              Открыть пример
            </button>
          </section>
        )}
        {active && view && (
          <>
            <section className="dataset-summary">
              <div className="dataset-name">
                <span className="file-tag">
                  {active.sourceType.toUpperCase()}
                </span>
                <div>
                  <h2>{active.name}</h2>
                  <span>Исходный набор сохраняется целиком</span>
                </div>
              </div>
              <div className="metric">
                <strong>{fmt(active.rows.length)}</strong>
                <span>записей в наборе</span>
              </div>
              <div className="metric">
                <strong>{active.columns.length}</strong>
                <span>исходных столбцов</span>
              </div>
              <div className="metric accent">
                <strong>{fmt(filtered.length)}</strong>
                <span>после фильтрации</span>
              </div>
            </section>
            {sheets.length > 1 && (
              <label className="sheet-picker">
                Лист Excel
                <select
                  disabled={busy || !!draft}
                  value={sheet}
                  onChange={(e) => {
                    if (excelFile.current)
                      void upload(excelFile.current, e.target.value);
                  }}
                >
                  {sheets.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <nav className="workspace-tabs" aria-label="Работа с данными">
              {(
                [
                  ["table", "Таблица"],
                  ["stats", "Статистика"],
                  ["model", "Данные для модели"],
                  ["help", "Справка"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  disabled={!!draft && key !== "table"}
                  className={tab === key ? "active" : ""}
                  onClick={() => {
                    setTab(key);
                    setError("");
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab !== "help" && (
              <>
                <section className="panel filter-panel">
                  <div className="section-heading">
                    <h2>Фильтры строк</h2>
                    <div className="toolbar">
                      <select
                        disabled={!!draft}
                        aria-label="Объединение фильтров"
                        value={view.filterMode}
                        onChange={(e) =>
                          changeView({
                            ...view,
                            filterMode: e.target.value as "all" | "any",
                          })
                        }
                      >
                        <option value="all">Все условия (И)</option>
                        <option value="any">Любое условие (ИЛИ)</option>
                      </select>
                      <button
                        className="secondary"
                        disabled={!!draft}
                        onClick={() =>
                          changeView({
                            ...view,
                            filters: [
                              ...view.filters,
                              {
                                id: crypto.randomUUID(),
                                field: active.columns[0].field,
                                op: "contains",
                                value: "",
                              },
                            ],
                          })
                        }
                      >
                        Добавить условие
                      </button>
                      {view.filters.length > 0 && (
                        <button
                          className="link"
                          disabled={!!draft}
                          onClick={() => changeView({ ...view, filters: [] })}
                        >
                          Сбросить
                        </button>
                      )}
                    </div>
                  </div>
                  {!view.filters.length && (
                    <p className="muted">
                      Фильтр не задан — используются все строки.
                    </p>
                  )}
                  {view.filters.map((f) => (
                    <div className="filter-row" key={f.id}>
                      <select
                        disabled={!!draft}
                        aria-label="Поле фильтра"
                        value={f.field}
                        onChange={(e) =>
                          patchFilter(f.id, { field: e.target.value })
                        }
                      >
                        {active.columns.map((c) => (
                          <option key={c.field}>{c.field}</option>
                        ))}
                        <option value="__missing__">
                          NA · наличие пропусков
                        </option>
                      </select>
                      <select
                        disabled={!!draft}
                        aria-label="Оператор фильтра"
                        value={f.op}
                        onChange={(e) =>
                          patchFilter(f.id, {
                            op: e.target.value as Filter["op"],
                          })
                        }
                      >
                        {[
                          ["contains", "содержит"],
                          ["=", "равно"],
                          ["!=", "не равно"],
                          [">", "больше"],
                          [">=", "больше или равно"],
                          ["<", "меньше"],
                          ["<=", "меньше или равно"],
                          ["blank", "пусто"],
                          ["notblank", "не пусто"],
                        ].map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {!["blank", "notblank"].includes(f.op) && (
                        <input
                          disabled={!!draft}
                          aria-label="Значение фильтра"
                          placeholder="Введите значение"
                          value={f.value}
                          onChange={(e) =>
                            patchFilter(f.id, { value: e.target.value })
                          }
                        />
                      )}
                      <button
                        className="link"
                        disabled={!!draft}
                        aria-label="Удалить условие"
                        onClick={() =>
                          changeView({
                            ...view,
                            filters: view.filters.filter((x) => x.id !== f.id),
                          })
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <p className="scope-note">
                    Фильтр влияет на таблицу, выгрузки и модель. Статистика
                    рассчитывается по полному набору. Скрытие столбца не
                    отключает фильтр по нему.
                  </p>
                </section>
                <div className="actions-bar">
                  <div className="toolbar">
                    {tab === "table" &&
                      (!draft ? (
                        <button
                          className="secondary"
                          onClick={() => {
                            setDraft(structuredClone(active));
                            setError("");
                          }}
                        >
                          Редактор
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              void persist(draft);
                              setDraft(null);
                            }}
                          >
                            Сохранить
                          </button>
                          <button
                            className="secondary"
                            onClick={() => {
                              setDraft(null);
                              setError("");
                            }}
                          >
                            Отменить
                          </button>
                        </>
                      ))}
                    <button
                      className="secondary"
                      disabled={!!draft}
                      aria-expanded={showFields}
                      onClick={() => setShowFields(!showFields)}
                    >
                      Скрыть / показать поля
                      {view.hidden.length ? ` (${view.hidden.length})` : ""}
                    </button>
                  </div>
                  <div className="toolbar">
                    <button
                      className="secondary"
                      disabled={!!draft || busy}
                      onClick={() => exportData(false)}
                    >
                      Скачать данные
                    </button>
                    <button
                      disabled={!!draft || busy}
                      onClick={() => exportData(true)}
                    >
                      Энкодер
                    </button>
                  </div>
                </div>
                {showFields && (
                  <section className="panel">
                    <div className="section-heading">
                      <h2>Видимые поля</h2>
                      <button
                        className="link"
                        disabled={!!draft}
                        onClick={() => changeView({ ...view, hidden: [] })}
                      >
                        Показать все
                      </button>
                    </div>
                    <div className="field-list">
                      {active.columns.map((c) => (
                        <label key={c.field}>
                          <input
                            disabled={!!draft}
                            type="checkbox"
                            checked={!view.hidden.includes(c.field)}
                            onChange={(e) =>
                              changeView({
                                ...view,
                                hidden: e.target.checked
                                  ? view.hidden.filter((f) => f !== c.field)
                                  : [...view.hidden, c.field],
                              })
                            }
                          />
                          {c.field}
                        </label>
                      ))}
                    </div>
                    <p className="scope-note">
                      Скрытые поля исключены из обычной и кодированной выгрузки.
                      Для модели состав полей определяется ролями; полный
                      train.csv содержит все поля.
                    </p>
                  </section>
                )}
              </>
            )}
            {tab === "table" && (
              <TablePanel
                dataset={active}
                rows={rows}
                hidden={view.hidden}
                editing={!!draft}
                onEdit={() => setDraft(structuredClone(active))}
                onRows={(next) => {
                  if (draft) setDraft(withRows(draft, next));
                }}
                onRename={rename}
                onDeleteColumn={deleteColumn}
                sort={sort}
                onSort={(field) =>
                  setSort((s) => ({
                    field,
                    direction: s?.field === field && s.direction === 1 ? -1 : 1,
                  }))
                }
              />
            )}
            {tab === "stats" && (
              <section className="panel">
                <div className="section-heading">
                  <h2>Описательная статистика</h2>
                  <button
                    className="secondary"
                    onClick={() => {
                      const fields = Object.keys(stats[0] ?? {});
                      saveFile(
                        "statistics.csv",
                        "\uFEFF" +
                          csv(
                            fields,
                            stats.map((r) =>
                              fields.map(
                                (f) =>
                                  (
                                    r as unknown as Record<
                                      string,
                                      string | number | null
                                    >
                                  )[f],
                              ),
                            ),
                          ),
                      );
                    }}
                  >
                    Скачать статистику
                  </button>
                </div>
                <p className="scope-note">
                  Весь набор: {active.rows.length} записей,{" "}
                  {active.columns.length} столбцов. Фильтры и скрытие полей не
                  учитываются.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Поле",
                          "Тип",
                          "Записей",
                          "Пропусков",
                          "Уникальных",
                          "Частое",
                          "Частота",
                          "Среднее",
                          "Ст. откл.",
                          "Мин.",
                          "25%",
                          "Медиана",
                          "75%",
                          "Макс.",
                        ].map((s) => (
                          <th key={s}>{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((r) => (
                        <tr key={r.field}>
                          <th>{r.field}</th>
                          <td>{r.type}</td>
                          {[r.count, r.missing, r.unique].map((v, i) => (
                            <td key={i}>{fmt(v)}</td>
                          ))}
                          <td>{r.top}</td>
                          {[
                            r.frequency,
                            r.mean,
                            r.std,
                            r.min,
                            r.q25,
                            r.median,
                            r.q75,
                            r.max,
                          ].map((v, i) => (
                            <td key={i}>{fmt(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {tab === "model" && (
              <Suspense
                fallback={
                  <section className="panel" role="status">
                    Подготовка мастера модели…
                  </section>
                }
              >
                <ModelPanel
                  dataset={active}
                  rows={filtered}
                  settings={view.model}
                  onChange={(model) => changeView({ ...view, model })}
                  onError={setError}
                />
              </Suspense>
            )}
          </>
        )}
        {tab === "help" && <Help />}
        {dataset && (
          <footer>
            <p>
              Данные хранятся в этом браузере. Для переноса на другой компьютер
              сохраните проект.
            </p>
            <button
              className="link danger"
              disabled={!!draft}
              onClick={() => {
                if (confirm("Очистить рабочие данные в этом браузере?")) {
                  void clear().catch(() =>
                    setError("Не удалось очистить локальное хранилище."),
                  );
                  setDraft(null);
                  setSheets([]);
                  setSort(null);
                  setTab("table");
                }
              }}
            >
              Очистить данные
            </button>
          </footer>
        )}
      </main>
    </div>
  );
}
