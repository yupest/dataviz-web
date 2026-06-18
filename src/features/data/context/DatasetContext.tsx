import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CellValue, Dataset } from "../types";
import { clearDataset, loadDataset, saveDataset } from "../../../shared/storage/datasetRepository";

type DatasetContextValue = {
  dataset: Dataset | null;
  isReady: boolean;
  datasetVersion: number;
  setDataset: (dataset: Dataset | null) => Promise<void>;
  updateCell: (rowId: string, field: string, value: CellValue) => Promise<void>;
  clear: () => Promise<void>;
};

const DatasetContext = createContext<DatasetContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function DatasetProvider({ children }: Props) {
  const [dataset, setDatasetState] = useState<Dataset | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [datasetVersion, setDatasetVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const loaded = await loadDataset();
      if (cancelled) return;
      setDatasetState(loaded);
      if (loaded) setDatasetVersion((value) => value + 1);
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setDataset = useCallback(async (next: Dataset | null) => {
    setDatasetState(next);
    setDatasetVersion((value) => value + 1);
    await saveDataset(next);
  }, []);

  const updateCell = useCallback(
    async (rowId: string, field: string, value: CellValue) => {
      const prev = dataset;
      if (!prev) return;

      const nextDataset: Dataset = {
        ...prev,
        rows: prev.rows.map((row) => (row.__rowId === rowId ? { ...row, [field]: value } : row)),
      };

      await setDataset(nextDataset);
    },
    [dataset, setDataset]
  );

  const clear = useCallback(async () => {
    setDatasetState(null);
    setDatasetVersion((value) => value + 1);
    await clearDataset();
  }, []);

  const value = useMemo(() => ({ dataset, isReady, datasetVersion, setDataset, updateCell, clear }), [dataset, isReady, datasetVersion, setDataset, updateCell, clear]);

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export { DatasetContext };