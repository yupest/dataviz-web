import type { DataType } from "../domain/types";

export const TYPE_CONFIG = {
  string: {
    sorter: "string",
    editor: "input",
    isMeasure: false,
    isDimension: true,
  },

  number: {
    sorter: "number",
    editor: "number",
    isMeasure: true,
    isDimension: false,
  },

  boolean: {
    sorter: "boolean",
    editor: undefined,
    isMeasure: false,
    isDimension: true,
  },

  date: {
    sorter: "date",
    editor: "input",
    isMeasure: false,
    isDimension: true,
  },
} as const satisfies Record<
  DataType,
  {
    sorter: "string" | "number" | "boolean" | "date";
    editor: "input" | "number" | undefined;
    isMeasure: boolean;
    isDimension: boolean;
  }
>;