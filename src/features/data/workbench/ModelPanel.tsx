import { useMemo, useState } from "react";
import type { Dataset, DataRow } from "../domain/types";
import {
  aliasesFor,
  importModelSettings,
  isCategorical,
  modelArchive,
  prepareModel,
  roleOf,
  targetOf,
  targetValues,
} from "./model";
import { saveFile } from "./data";
import type { ModelSettings, Role } from "./types";
import SplitChart from "./SplitChart";

export default function ModelPanel({
  dataset,
  rows,
  settings,
  onChange,
  onError,
}: {
  dataset: Dataset;
  rows: DataRow[];
  settings: ModelSettings;
  onChange: (s: ModelSettings) => void;
  onError: (message: string) => void;
}) {
  const [step, setStep] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [bulk, setBulk] = useState<Role>("feature");
  const target = targetOf(dataset, settings),
    categorical = isCategorical(dataset, settings);
  const values = useMemo(
    () => (target ? targetValues(rows, target.field) : []),
    [rows, target],
  );
  const aliases = useMemo(
    () => (target ? aliasesFor(rows, target.field, settings.aliases) : {}),
    [rows, target, settings.aliases],
  );
  const features = dataset.columns.filter(
    (c) => roleOf(c.field, settings) === "feature",
  );
  const preview = useMemo(() => {
    if (step !== 2) return null;
    try {
      return {
        result: prepareModel(dataset, rows, { ...settings, aliases }),
        error: "",
      };
    } catch (e) {
      return { result: null, error: (e as Error).message };
    }
  }, [dataset, rows, settings, aliases, step]);
  function changeRoles(roles: Record<string, Role>) {
    const previous = target?.field,
      next = dataset.columns.find((c) => roles[c.field] === "target")?.field;
    onChange({
      ...settings,
      roles,
      reference: undefined,
      ...(previous !== next
        ? { aliases: {}, targetKind: "auto" as const }
        : {}),
    });
  }
  async function loadSettings(file: File) {
    try {
      onChange(importModelSettings(JSON.parse(await file.text()), dataset));
      setStep(0);
      onError("");
    } catch (e) {
      onError((e as Error).message);
    }
  }
  function next() {
    if (!target || !features.length) {
      onError("Выберите ровно одну цель и хотя бы один признак.");
      return;
    }
    if (
      step === 1 &&
      (Object.values(aliases).some((v) => !Number.isFinite(v)) ||
        new Set(Object.values(aliases)).size !== values.length)
    ) {
      onError("Коды должны быть уникальными конечными числами.");
      return;
    }
    onError("");
    onChange({ ...settings, aliases });
    setStep(step === 0 && !categorical ? 2 : step + 1);
  }
  return (
    <section className="panel model-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ПОДГОТОВКА ВЫБОРОК</span>
          <h2>Данные для модели</h2>
        </div>
        <label className="button secondary">
          Загрузить настройки модели
          <input
            type="file"
            accept=".json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadSettings(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="scope-note">
        Используются {rows.length.toLocaleString("ru-RU")} записей текущего
        фильтра со всех страниц. Скрытие столбцов не влияет на роли полей.
      </p>
      <nav className="steps" aria-label="Шаги подготовки">
        {[
          [0, "Поля и роли"],
          ...(categorical ? [[1, "Кодирование цели"]] : []),
          [2, "Разбиение"],
        ].map(([i, label]) => (
          <span key={i} className={step === i ? "active" : ""}>
            {label}
          </span>
        ))}
      </nav>
      {settings.reference && (
        <div className="notice">
          Используется общий словарь из model-settings.json. Роли и порядок
          признаков должны совпадать.
          <button
            className="link"
            onClick={() => onChange({ ...settings, reference: undefined })}
          >
            Отключить общий словарь
          </button>
        </div>
      )}
      {step === 0 && (
        <>
          <p className="summary-text">
            Выбрано признаков: {features.length}. Целевая переменная —{" "}
            {target?.field ?? "не выбрана (нужна ровно одна)"}.
          </p>
          <div className="toolbar">
            <label>
              <input
                type="checkbox"
                checked={selected.length === dataset.columns.length}
                onChange={(e) =>
                  setSelected(
                    e.target.checked ? dataset.columns.map((c) => c.field) : [],
                  )
                }
              />{" "}
              Все поля
            </label>
            <select
              aria-label="Роль выбранных полей"
              value={bulk}
              onChange={(e) => setBulk(e.target.value as Role)}
            >
              <option value="feature">Признак</option>
              <option value="target">Целевая</option>
              <option value="ignore">Не использовать</option>
            </select>
            <button
              disabled={!selected.length}
              onClick={() =>
                changeRoles({
                  ...settings.roles,
                  ...Object.fromEntries(selected.map((f) => [f, bulk])),
                })
              }
            >
              Изменить роль
            </button>
          </div>
          <div className="table-scroll role-table">
            <table>
              <thead>
                <tr>
                  <th>Выбор</th>
                  <th>Поле</th>
                  <th>Тип</th>
                  <th>Роль</th>
                </tr>
              </thead>
              <tbody>
                {dataset.columns.map((c) => (
                  <tr key={c.field}>
                    <td>
                      <input
                        aria-label={`Выбрать ${c.field}`}
                        type="checkbox"
                        checked={selected.includes(c.field)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, c.field]
                              : selected.filter((f) => f !== c.field),
                          )
                        }
                      />
                    </td>
                    <th scope="row">{c.field}</th>
                    <td>
                      <span className={`type type-${c.type}`}>
                        {c.type === "number"
                          ? "Числовая"
                          : c.type === "boolean"
                            ? "Логическая"
                            : "Категориальная"}
                      </span>
                    </td>
                    <td>
                      <select
                        aria-label={`Роль ${c.field}`}
                        value={roleOf(c.field, settings)}
                        onChange={(e) =>
                          changeRoles({
                            ...settings.roles,
                            [c.field]: e.target.value as Role,
                          })
                        }
                      >
                        <option value="feature">Признак</option>
                        <option value="target">Целевая</option>
                        <option value="ignore">Не использовать</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {target && (
            <label className="field">
              Тип цели
              <select
                value={settings.targetKind}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    targetKind: e.target.value as ModelSettings["targetKind"],
                  })
                }
              >
                <option value="auto">Автоматически</option>
                <option value="categorical">Категориальная / дискретная</option>
                <option value="numeric">Числовая</option>
              </select>
            </label>
          )}
        </>
      )}
      {step === 1 && target && (
        <>
          <h3>Кодирование цели: {target.field}</h3>
          <p>
            Значения и количества учитывают текущий фильтр. Задайте отдельный
            числовой код каждому классу.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Значение</th>
                  <th>Записей</th>
                  <th>Код</th>
                </tr>
              </thead>
              <tbody>
                {values.map(([key, v]) => (
                  <tr key={key}>
                    <td>{String(v.value)}</td>
                    <td>{v.count}</td>
                    <td>
                      <input
                        aria-label={`Код ${v.value}`}
                        type="number"
                        value={
                          Number.isFinite(aliases[key]) ? aliases[key] : ""
                        }
                        onChange={(e) =>
                          onChange({
                            ...settings,
                            aliases: {
                              ...aliases,
                              [key]:
                                e.target.value === ""
                                  ? NaN
                                  : Number(e.target.value),
                            },
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!values.length && (
            <p role="alert">После фильтрации нет непустых значений цели.</p>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <h3>Разбиение train / test</h3>
          <div className="split-controls">
            <label>
              Seed
              <input
                type="number"
                min="0"
                max="4294967295"
                step="1"
                value={Number.isNaN(settings.seed) ? "" : settings.seed}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    seed: e.target.value === "" ? NaN : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Train, %
              <input
                type="number"
                min="1"
                max="99"
                value={
                  Number.isNaN(settings.testPercent)
                    ? ""
                    : 100 - settings.testPercent
                }
                onChange={(e) =>
                  onChange({
                    ...settings,
                    testPercent:
                      e.target.value === ""
                        ? NaN
                        : 100 - Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Test, %
              <input
                type="number"
                min="1"
                max="99"
                value={
                  Number.isNaN(settings.testPercent) ? "" : settings.testPercent
                }
                onChange={(e) =>
                  onChange({
                    ...settings,
                    testPercent:
                      e.target.value === "" ? NaN : Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <input
            aria-label="Доля train"
            type="range"
            min="1"
            max="99"
            value={100 - settings.testPercent || 80}
            onChange={(e) =>
              onChange({
                ...settings,
                testPercent: 100 - Number(e.target.value),
              })
            }
          />
          {categorical && (
            <label className="check">
              <input
                type="checkbox"
                checked={settings.stratify}
                onChange={(e) =>
                  onChange({ ...settings, stratify: e.target.checked })
                }
              />{" "}
              Сохранять доли классов целевой переменной
            </label>
          )}
          <p className="scope-note">
            Для числовой цели используется случайное разбиение. При одинаковом
            Seed, данных, порядке строк и настройках разбиение будет одинаковым.
            Стратификация сохраняет классы цели, а не категории всех признаков.
          </p>
          <p>
            Кодирование признаков — по правилам энкодера, одинаковое для train и
            test.
          </p>
          {preview?.error && (
            <div role="alert" className="error">
              {preview.error}
            </div>
          )}
          {preview?.result && (
            <>
              <p className="summary-text">
                В результате кодирования {preview.result.features.length}{" "}
                исходных признаков преобразуются в{" "}
                {preview.result.encodedColumns.length} столбцов.
              </p>
              <SplitChart result={preview.result} />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Файл</th>
                      <th>Записей</th>
                      <th>Столбцов</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        "X_train",
                        preview.result.train.length,
                        preview.result.encodedColumns.length,
                      ],
                      ["y_train", preview.result.train.length, 1],
                      [
                        "X_test",
                        preview.result.test.length,
                        preview.result.encodedColumns.length,
                      ],
                      ["y_test", preview.result.test.length, 1],
                      [
                        "Полный train",
                        preview.result.train.length,
                        dataset.columns.length,
                      ],
                    ].map(([name, n, k]) => (
                      <tr key={name}>
                        <th>{name}</th>
                        <td>{n}</td>
                        <td>{k}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="scope-note">
            Архив содержит X_train, y_train, X_test, y_test, настройки модели и
            полный train.csv со всеми исходными полями без кодирования.
          </p>
        </>
      )}
      <div className="toolbar model-nav">
        <button
          className="secondary"
          disabled={step === 0}
          onClick={() => {
            onError("");
            setStep(step === 2 && !categorical ? 0 : step - 1);
          }}
        >
          Назад
        </button>
        {step < 2 ? (
          <button onClick={next}>Далее</button>
        ) : (
          <button
            disabled={!preview?.result}
            onClick={() => {
              try {
                const result = prepareModel(dataset, rows, {
                  ...settings,
                  aliases,
                });
                saveFile(
                  "model-data.zip",
                  modelArchive(dataset, result, {
                    ...settings,
                    aliases,
                  }).slice().buffer,
                  "application/zip",
                );
                onError("");
              } catch (e) {
                onError((e as Error).message);
              }
            }}
          >
            Скачать ZIP
          </button>
        )}
      </div>
    </section>
  );
}
