import Dexie, { type Table } from "dexie";
import type { Dataset } from "../../features/data/types";

export type WorkspaceRecord = {
  id: "workspace";
  dataset: Dataset | null;
  updatedAt: number;
};

class AppDB extends Dexie {
  workspace!: Table<WorkspaceRecord, "workspace">;

  constructor() {
    super("data-viz-app");
    this.version(1).stores({
      workspace: "id, updatedAt",
    });
  }
}

export const WORKSPACE_ID = "workspace" as const;
export const db = new AppDB();