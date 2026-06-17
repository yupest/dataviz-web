import type { Dataset } from "../types";
import { parseCsvFile } from "./csvParser";
import { parseJsonFile } from "./jsonParser";

export async function parseDatasetFile(file: File): Promise<Dataset> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return parseCsvFile(file);
  }

  if (extension === "json") {
    return parseJsonFile(file);
  }

  throw new Error("Unsupported file type");
}