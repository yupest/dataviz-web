import { test } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  datasetFromRecords,
  readFile,
  validateWorkspace,
} from "../src/features/data/workbench/files";
import {
  filterRows,
  schemaFor,
  encodeRows,
  statistics,
} from "../src/features/data/workbench/data";
import {
  defaultModel,
  defaultView,
} from "../src/features/data/workbench/types";
import {
  prepareModel,
  modelArchive,
  importModelSettings,
  aliasesFor,
  targetValues,
} from "../src/features/data/workbench/model";

const dataset = () =>
  datasetFromRecords(
    Array.from({ length: 100 }, (_, i) => ({
      id: i,
      amount: i,
      city: i % 2 ? "B" : "A",
      target: i % 4 ? "yes" : "no",
    })),
    "fixture.csv",
    "csv",
  );
const settings = () => ({
  ...defaultModel(),
  roles: { id: "ignore" as const, target: "target" as const },
  aliases: { '"yes"': 1, '"no"': 0 },
});
function parsed(text: string) {
  return Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  }).data;
}

test("CSV preserves leading zeros, quoted delimiters, booleans, nulls and all fields", async () => {
  const f = new File(
    ['id;title;active;value\r\n001;"a;b";false;\r\n002;x;true;2'],
    "sample.csv",
  );
  const { dataset: d } = await readFile(f);
  assert.equal(d.rows[0].id, "001");
  assert.equal(d.rows[0].title, "a;b");
  assert.equal(d.rows[0].active, false);
  assert.equal(d.rows[0].value, null);
  assert.equal(d.columns[0].type, "string");
  const j = await readFile(
    new File(['[{"a":1},{"a":2,"b":"x"}]'], "sample.json"),
  );
  assert.deepEqual(
    j.dataset.columns.map((c) => c.field),
    ["a", "b"],
  );
  assert.equal(j.dataset.rows[0].b, null);
});
test("CSV rejects inconsistent records and duplicate headers", async () => {
  await assert.rejects(
    () => readFile(new File(["x,y\n1,2,3"], "bad.csv")),
    /CSV/,
  );
  await assert.rejects(
    () => readFile(new File(["x,x\n1,2"], "bad.csv")),
    /повторяются/,
  );
});
test("Excel supports selecting sheets and dates", async () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet([{ a: 1 }]),
    "First",
  );
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet([{ a: 3 }]),
    "Second",
  );
  const file = new File(
    [XLSX.write(book, { bookType: "xlsx", type: "array" })],
    "sample.xlsx",
  );
  const result = await readFile(file, "Second");
  assert.deepEqual(result.sheets, ["First", "Second"]);
  assert.equal(result.dataset.rows[0].a, 3);
});
test("filters apply to all rows with AND/OR, hidden-field conditions, and missing indicator", () => {
  const d = dataset();
  d.rows[0].city = null;
  const filters = [
    { id: "1", field: "amount", op: ">" as const, value: "50" },
    { id: "2", field: "city", op: "=" as const, value: "A" },
  ];
  assert.equal(filterRows(d, filters, "all").length, 24);
  assert.equal(filterRows(d, filters, "any").length, 74);
  assert.equal(
    filterRows(
      d,
      [{ id: "n", field: "__missing__", op: "=" as const, value: "1" }],
      "all",
    ).length,
    1,
  );
  assert.equal(
    filterRows(
      d,
      [{ id: "b", field: "city", op: "blank" as const, value: "" }],
      "all",
    ).length,
    1,
  );
});
test("encoding uses full source; schema threshold, nulls, unknown values, and collisions", () => {
  const d = datasetFromRecords(
    Array.from({ length: 16 }, (_, i) => ({
      city: `c${String(i).padStart(2, "0")}`,
    })),
    "schema.csv",
    "csv",
  );
  const schema = schemaFor(d);
  assert.equal(schema.city.method, "label");
  assert.equal(encodeRows([d.rows[15]], ["city"], schema).data[0][0], 15);
  assert.throws(
    () => encodeRows([{ __rowId: "new", city: "unknown" }], ["city"], schema),
    /отсутствует/,
  );
  assert.deepEqual(
    encodeRows([{ __rowId: "null", city: null }], ["city"], schema).data,
    [[null]],
  );
  const collision = datasetFromRecords(
    [{ city: "A", city_A: 1 }],
    "collision.csv",
    "csv",
  );
  assert.throws(
    () => encodeRows(collision.rows, ["city", "city_A"], schemaFor(collision)),
    /одинаковые/,
  );
});
test("stratification is deterministic, aligned, disjoint, and proportionate", () => {
  const d = dataset(),
    s = settings();
  const a = prepareModel(d, d.rows, s),
    b = prepareModel(d, d.rows, s);
  assert.deepEqual(a.train, b.train);
  assert.equal(a.train.length, 80);
  assert.equal(a.test.length, 20);
  assert.deepEqual(
    a.distributions.map((c) => [c.label, c.train, c.test]),
    [
      ["no", 20, 5],
      ["yes", 60, 15],
    ],
  );
  const ids = new Set(a.train.map((r) => r.__rowId));
  assert.ok(a.test.every((r) => !ids.has(r.__rowId)));
  assert.notDeepEqual(
    a.train,
    prepareModel(d, d.rows, { ...s, seed: 100 }).train,
  );
  const zip = unzipSync(modelArchive(d, a, s));
  assert.deepEqual(
    Object.keys(zip).sort(),
    [
      "X_test.csv",
      "X_train.csv",
      "model-settings.json",
      "train.csv",
      "y_test.csv",
      "y_train.csv",
    ].sort(),
  );
  const X = parsed(strFromU8(zip["X_train.csv"])),
    y = parsed(strFromU8(zip["y_train.csv"])),
    full = parsed(strFromU8(zip["train.csv"]));
  X.forEach((r, i) =>
    assert.equal(Number(y[i].target), Number(r.amount) % 4 ? 1 : 0),
  );
  assert.ok(!Object.hasOwn(X[0], "id"));
  assert.ok(!Object.hasOwn(X[0], "target"));
  assert.ok(Object.hasOwn(full[0], "id"));
  assert.ok(!Object.hasOwn(full[0], "__rowId"));
});
test("filtered target values, preserved aliases and unknown classes", () => {
  const d = dataset();
  const rows = d.rows.filter((r) => r.target === "yes");
  assert.equal(targetValues(rows, "target").length, 1);
  assert.equal(targetValues(rows, "target")[0][1].count, 75);
  assert.deepEqual(aliasesFor(rows, "target", { '"yes"': 7 }), { '"yes"': 7 });
  const both = aliasesFor(d.rows, "target", { '"yes"': 0 });
  assert.equal(both['"yes"'], 0);
  assert.equal(both['"no"'], 1);
});
test("numeric target, validation and disabling impossible stratification", () => {
  const d = dataset(),
    s = {
      ...settings(),
      roles: {
        id: "ignore" as const,
        amount: "target" as const,
        target: "ignore" as const,
      },
    };
  const r = prepareModel(d, d.rows, s);
  assert.equal(r.categorical, false);
  assert.equal(r.test.length, 20);
  assert.throws(() => prepareModel(d, d.rows, { ...s, seed: 1.5 }), /Seed/);
  assert.throws(() => prepareModel(d, [], s), /не осталось/);
  d.rows[0].amount = null;
  assert.throws(() => prepareModel(d, d.rows, s), /пропуски/);
  const rare = datasetFromRecords(
    [
      { x: 1, y: "a" },
      { x: 2, y: "a" },
      { x: 3, y: "b" },
    ],
    "rare.csv",
    "csv",
  );
  const rs = { ...defaultModel(), roles: { y: "target" as const } };
  assert.throws(() => prepareModel(rare, rare.rows, rs), /две строки/);
  assert.equal(
    prepareModel(rare, rare.rows, { ...rs, stratify: false }).test.length,
    1,
  );
});
test("second-stage import retains full encoding and roles for held-out data", () => {
  const original = datasetFromRecords(
    Array.from({ length: 160 }, (_, i) => ({
      id: i,
      owner: `o${i % 20}`,
      target: i % 2 ? "yes" : "no",
    })),
    "original.csv",
    "csv",
  );
  const s = settings(),
    first = prepareModel(original, original.rows, s),
    z = unzipSync(modelArchive(original, first, s));
  const manifest = JSON.parse(strFromU8(z["model-settings.json"]));
  const next = datasetFromRecords(
    parsed(strFromU8(z["train.csv"])),
    "train.csv",
    "csv",
  );
  const imported = importModelSettings(manifest, next),
    second = prepareModel(next, next.rows, { ...imported, testPercent: 20 });
  assert.deepEqual(second.encodedColumns, first.encodedColumns);
  assert.deepEqual(second.encoding, manifest.feature_encoding);
  assert.equal(imported.roles.id, "ignore");
  assert.equal(imported.roles.target, "target");
  const encoded1 = encodeRows(first.train, ["owner"], first.encoding),
    encoded2 = encodeRows(next.rows, ["owner"], second.encoding);
  assert.deepEqual(encoded2, encoded1);
});
test("workspace roundtrip preserves filters, hidden fields, roles and schema", () => {
  const d = dataset();
  d.view = {
    ...defaultView(),
    hidden: ["city"],
    filters: [{ id: "f", field: "amount", op: ">", value: "4" }],
    model: settings(),
  };
  const loaded = validateWorkspace(
    JSON.parse(
      JSON.stringify({ format: "dataviz-data-workspace-v1", dataset: d }),
    ),
  );
  assert.deepEqual(loaded, d);
  assert.equal(statistics(loaded).length, 4);
  assert.equal(statistics(loaded)[0].count, 100);
});
