import Papa from "papaparse";
import type { Dataset } from "../types";
import { inferColumns } from "./columnInference";
import { normalizeRow } from "./cellNormalizer";

export async function parseCsvFile(file: File): Promise<Dataset> {

  const text = await file.text();

  return new Promise((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(text, {

        header: true,

        skipEmptyLines: true,

        complete: (results) => {
          const rows = results.data
            .filter((row) => Object.keys(row).length > 0)
            .map(normalizeRow);
          const fields = rows.length > 0 ? Object.keys(rows[0]) : [];

          resolve({ name: file.name,
                    sourceType: "csv",
                    columns: inferColumns(rows, fields),
                    rows,});
        },

        error: (error: { message: string | undefined; }) => {reject(new Error(error.message));},
      });
    }
  );
}