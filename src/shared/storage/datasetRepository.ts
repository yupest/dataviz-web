import { db, WORKSPACE_ID } from "./db";
import type { Dataset } from "../../features/data/types";

type WorkspaceRecord = {
  id: "workspace";
  dataset: Dataset | null;
  updatedAt: number;
};

export async function loadDataset(): Promise<Dataset | null> {
  const record = await db.workspace.get(WORKSPACE_ID) as WorkspaceRecord | undefined;
  return record?.dataset ?? null;
}

export async function saveDataset(dataset: Dataset | null): Promise<void> {
  if (!dataset) {
    await db.workspace.delete(WORKSPACE_ID);
    return;
  }

  await db.workspace.put({ id: WORKSPACE_ID, dataset, updatedAt: Date.now() });
}

export async function clearDataset(): Promise<void> {
  await db.workspace.delete(WORKSPACE_ID);
}