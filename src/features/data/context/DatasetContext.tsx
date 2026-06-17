import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Dataset } from "../types";
import { clearDataset, loadDataset, saveDataset } from "../../../shared/storage/datasetRepository";

type DatasetContextValue = {
  dataset: Dataset | null;
  isReady: boolean;
  setDataset: (dataset: Dataset | null) => Promise<void>;
  clear: () => Promise<void>;
};

const DatasetContext = createContext<DatasetContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function DatasetProvider({ children }: Props) {
  const [dataset, setDatasetState] = useState<Dataset | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const loaded = await loadDataset();
      if (cancelled) return;
      setDatasetState(loaded);
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setDataset = useCallback(async (next: Dataset | null) => {
    setDatasetState(next);
    await saveDataset(next);
  }, []);

  const clear = useCallback(async () => {
    setDatasetState(null);
    await clearDataset();
  }, []);

  const value = useMemo(() => ({ dataset, isReady, setDataset, clear }), [dataset, isReady, setDataset, clear]);

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export { DatasetContext };