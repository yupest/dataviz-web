import { useContext } from "react";
import { VisualizationContext } from "../context/VisualizationContext";

export function useVisualization() {
  const context = useContext(VisualizationContext);

  if (!context) {
    throw new Error("useVisualization must be used inside VisualizationProvider");
  }

  return context;
}