import { useContext } from "react";
import { DatasetContext } from "../context/DatasetContext";

export function useDataset() {
  const context = useContext(DatasetContext);

  if (!context) {
    throw new Error("useDataset must be used inside DatasetProvider");
  }

  return context;
}