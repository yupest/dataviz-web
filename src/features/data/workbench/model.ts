import { strToU8, zipSync } from "fflate";
import type { CellValue, DataRow, Dataset } from "../domain/types";
import { csv, encodeRows, schemaFor } from "./data";
import {
  isBlank,
  keyOf,
  type Encoding,
  type ModelSettings,
  type Role,
} from "./types";

export function roleOf(field: string, settings: ModelSettings): Role {
  return (
    settings.roles[field] ??
    (/(^|[_\s])id($|[_\s])/i.test(field) ? "ignore" : "feature")
  );
}
export function targetOf(dataset: Dataset, settings: ModelSettings) {
  const targets = dataset.columns.filter(
    (c) => roleOf(c.field, settings) === "target",
  );
  return targets.length === 1 ? targets[0] : null;
}
export function isCategorical(dataset: Dataset, settings: ModelSettings) {
  const target = targetOf(dataset, settings);
  return (
    settings.targetKind === "categorical" ||
    (settings.targetKind === "auto" && target?.type !== "number" && !!target)
  );
}
export function targetValues(rows: DataRow[], target: string) {
  const values = new Map<string, { value: CellValue; count: number }>();
  for (const row of rows) {
    const v = row[target];
    if (isBlank(v)) continue;
    const key = keyOf(v);
    const prev = values.get(key);
    values.set(key, { value: v, count: (prev?.count ?? 0) + 1 });
  }
  return [...values].sort((a, b) =>
    String(a[1].value) < String(b[1].value)
      ? -1
      : String(a[1].value) > String(b[1].value)
        ? 1
        : 0,
  );
}
export function aliasesFor(
  rows: DataRow[],
  target: string,
  aliases: Record<string, number>,
) {
  const result: Record<string, number> = {};
  const used = new Set(Object.values(aliases).filter(Number.isFinite));
  let next = 0;
  for (const [key] of targetValues(rows, target)) {
    if (Object.hasOwn(aliases, key)) result[key] = aliases[key];
    else {
      while (used.has(next)) next++;
      result[key] = next;
      used.add(next++);
    }
  }
  return result;
}
// Documented seeded algorithm; independent of the browser's Math.random.
function randomGenerator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export type ModelResult = ReturnType<typeof prepareModel>;
export function prepareModel(
  dataset: Dataset,
  rows: DataRow[],
  settings: ModelSettings,
) {
  const target = targetOf(dataset, settings);
  if (!target) throw new Error("Выберите ровно одну целевую переменную.");
  const features = dataset.columns
    .filter((c) => roleOf(c.field, settings) === "feature")
    .map((c) => c.field);
  if (!features.length) throw new Error("Выберите хотя бы один признак.");
  if (!rows.length) throw new Error("После фильтрации не осталось строк.");
  if (rows.some((r) => isBlank(r[target.field])))
    throw new Error(
      "В цели есть пропуски. Заполните их или исключите строки фильтром.",
    );
  const categorical = isCategorical(dataset, settings);
  if (
    !categorical &&
    rows.some(
      (r) =>
        typeof r[target.field] !== "number" ||
        !Number.isFinite(r[target.field]),
    )
  )
    throw new Error("Для числовой цели нужны конечные числовые значения.");
  if (
    !Number.isInteger(settings.seed) ||
    settings.seed < 0 ||
    settings.seed > 4294967295
  )
    throw new Error("Seed — целое число от 0 до 4294967295.");
  if (
    !Number.isFinite(settings.testPercent) ||
    settings.testPercent < 1 ||
    settings.testPercent > 99
  )
    throw new Error("Доля test — от 1 до 99%.");
  const testSize = Math.ceil((rows.length * settings.testPercent) / 100);
  if (testSize >= rows.length)
    throw new Error("Недостаточно строк для выбранного разбиения.");
  const values = targetValues(rows, target.field);
  const aliases = aliasesFor(rows, target.field, settings.aliases);
  if (categorical) {
    const codes = values.map(([key]) => aliases[key]);
    if (!codes.every(Number.isFinite) || new Set(codes).size !== codes.length)
      throw new Error("Коды цели должны быть уникальными конечными числами.");
  }
  const random = randomGenerator(settings.seed);
  let train: DataRow[], test: DataRow[];
  if (categorical && settings.stratify) {
    const groups = new Map<string, DataRow[]>();
    rows.forEach((row) => {
      const key = keyOf(row[target.field]);
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    });
    const buckets = values.map(([key]) => groups.get(key)!);
    if (
      buckets.some((g) => g.length < 2) ||
      Math.min(testSize, rows.length - testSize) < buckets.length
    )
      throw new Error(
        "Для стратификации нужны минимум две строки каждого класса и место для всех классов в train и test. Измените доли или отключите сохранение долей классов.",
      );
    const ideal = buckets.map((g) => (g.length * testSize) / rows.length);
    const counts = buckets.map((g, i) =>
      Math.max(1, Math.min(g.length - 1, Math.floor(ideal[i]))),
    );
    let difference = testSize - counts.reduce((a, b) => a + b, 0);
    while (difference !== 0) {
      const delta = difference > 0 ? 1 : -1;
      let index = -1,
        score = -Infinity;
      buckets.forEach((g, i) => {
        if (
          (delta > 0 ? counts[i] < g.length - 1 : counts[i] > 1) &&
          (ideal[i] - counts[i]) * delta > score
        ) {
          index = i;
          score = (ideal[i] - counts[i]) * delta;
        }
      });
      if (index < 0)
        throw new Error(
          "Невозможно сохранить доли классов при выбранном размере test.",
        );
      counts[index] += delta;
      difference -= delta;
    }
    train = [];
    test = [];
    buckets.forEach((g, i) => {
      const part = shuffle(g, random);
      test.push(...part.slice(0, counts[i]));
      train.push(...part.slice(counts[i]));
    });
    train = shuffle(train, random);
    test = shuffle(test, random);
  } else {
    const all = shuffle(rows, random);
    test = all.slice(0, testSize);
    train = all.slice(testSize);
  }
  if (
    settings.reference &&
    (JSON.stringify(settings.reference.features) !== JSON.stringify(features) ||
      settings.reference.target !== target.field)
  )
    throw new Error(
      "Роли и порядок признаков отличаются от загруженных настроек. Восстановите роли или отключите общий словарь.",
    );
  const encoding = settings.reference?.encoding ?? schemaFor(dataset);
  const encoded = encodeRows(rows, features, encoding);
  const trainCounts = new Map<string,number>(), testCounts = new Map<string,number>();
  if (categorical) {
    train.forEach(r => { const k=keyOf(r[target.field]);trainCounts.set(k,(trainCounts.get(k)??0)+1); });
    test.forEach(r => { const k=keyOf(r[target.field]);testCounts.set(k,(testCounts.get(k)??0)+1); });
  }
  const distributions = (categorical ? values : []).map(
    ([key, { value, count }]) => ({
      label: String(value),
      code: aliases[key],
      all: count,
      train: trainCounts.get(key) ?? 0,
      test: testCounts.get(key) ?? 0,
    }),
  );
  return {
    train,
    test,
    rows,
    features,
    target: target.field,
    categorical,
    encoding,
    aliases,
    encodedColumns: encoded.headers,
    distributions,
  };
}
export function modelArchive(
  dataset: Dataset,
  result: ModelResult,
  settings: ModelSettings,
) {
  const rawFields = dataset.columns.map((c) => c.field);
  const raw = (rows: DataRow[]) =>
    csv(
      rawFields,
      rows.map((r) => rawFields.map((f) => r[f])),
    );
  const X = (rows: DataRow[]) => {
    const table = encodeRows(rows, result.features, result.encoding);
    return csv(table.headers, table.data);
  };
  const y = (rows: DataRow[]) =>
    csv(
      [result.target],
      rows.map((r) => [
        result.categorical
          ? result.aliases[keyOf(r[result.target])]
          : r[result.target],
      ]),
    );
  const labels = {
    feature: "Признак",
    target: "Целевая",
    ignore: "Не использовать",
  };
  const manifest = {
    format_version: 3,
    application: "dataviz-web-data",
    source_filename: dataset.name,
    fields: dataset.columns.map((c) => ({
      field: c.field,
      type: c.type === "number" ? "Числовая" : "Категориальная",
      role: labels[roleOf(c.field, settings)],
    })),
    target: {
      field: result.target,
      type: result.categorical ? "Категориальная" : "Числовая",
      aliases: result.categorical ? result.aliases : {},
    },
    feature_encoding: Object.fromEntries(
      Object.entries(result.encoding).filter(([k]) =>
        result.features.includes(k),
      ),
    ),
    encoding_scope: settings.reference
      ? "imported_reference"
      : "full_source_before_filter_and_split",
    output_features: result.encodedColumns,
    split: {
      seed: settings.seed,
      algorithm: "mulberry32-fisher-yates-v1",
      test_percent: settings.testPercent,
      stratify_requested: settings.stratify,
      stratify_applied: result.categorical && settings.stratify,
      source_rows: dataset.rows.length,
      filtered_rows: result.rows.length,
      train_rows: result.train.length,
      test_rows: result.test.length,
    },
    filters: {
      rules: dataset.view?.filters ?? [],
      mode: dataset.view?.filterMode ?? "all",
    },
    hidden_columns_affect_features: false,
    balance: { method: "none" },
    scaling: false,
  };
  const files: Record<string, Uint8Array> = {};
  for (const [name, text] of Object.entries({
    "X_train.csv": X(result.train),
    "X_test.csv": X(result.test),
    "y_train.csv": y(result.train),
    "y_test.csv": y(result.test),
    "train.csv": raw(result.train),
    "model-settings.json": JSON.stringify(manifest, null, 2),
  }))
    files[name] = strToU8(text);
  return zipSync(files);
}
export function importModelSettings(
  value: unknown,
  dataset: Dataset,
): ModelSettings {
  const manifest = value as {
    fields?: { field: string; role: string }[];
    target?: { field: string; type: string; aliases: Record<string, number> };
    feature_encoding?: Encoding;
    split?: { seed: number; test_percent: number; stratify_requested: boolean };
  };
  if (!manifest?.fields || !manifest.target || !manifest.feature_encoding)
    throw new Error(
      "Нужен файл model-settings.json из архива данных для модели.",
    );
  const fields = dataset.columns.map((c) => c.field);
  if (
    manifest.fields.some(
      (f) => f.role !== "Не использовать" && !fields.includes(f.field),
    )
  )
    throw new Error("В данных отсутствуют поля из настроек модели.");
  const roles = Object.fromEntries(
    dataset.columns.map((c) => [c.field, "ignore"]),
  ) as Record<string, Role>;
  manifest.fields.forEach((f) => {
    if (fields.includes(f.field))
      roles[f.field] =
        f.role === "Признак"
          ? "feature"
          : f.role === "Целевая"
            ? "target"
            : "ignore";
  });
  const features = manifest.fields
    .filter((f) => f.role === "Признак")
    .map((f) => f.field);
  // Match source order explicitly; CSV from the full train preserves this order.
  const actual = dataset.columns
    .filter((c) => roles[c.field] === "feature")
    .map((c) => c.field);
  if (JSON.stringify(features) !== JSON.stringify(actual))
    throw new Error(
      "Порядок исходных признаков отличается от настроек модели.",
    );
  for (const rule of Object.values(manifest.feature_encoding))
    if (
      !["one_hot", "label"].includes(rule.method) ||
      !Array.isArray(rule.categories)
    )
      throw new Error("Некорректный словарь кодирования.");
  return {
    roles,
    targetKind: manifest.target.type === "Числовая" ? "numeric" : "categorical",
    aliases: manifest.target.aliases ?? {},
    seed: manifest.split?.seed ?? 42,
    testPercent: manifest.split?.test_percent ?? 20,
    stratify: manifest.split?.stratify_requested ?? true,
    reference: {
      encoding: manifest.feature_encoding,
      features,
      target: manifest.target.field,
    },
  };
}
