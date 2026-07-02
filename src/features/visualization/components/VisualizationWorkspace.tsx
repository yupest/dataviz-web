import { useState } from "react";
import { useDataset } from "../../data/hooks/useDataset";
import { useVisualization } from "../hooks/useVisualization";
import { chartRegistry } from "../domain/chartRegistry";
import type { ChartType } from "../domain/types";
import ChartEditorHost from "./ChartEditorHost";
import ChartPreviewHost from "./ChartPreviewHost";
import ChartTabs from "./ChartTabs";
import "./VisualizationWorkspace.css";

export default function VisualizationWorkspace() {
  const { dataset } = useDataset();
  const { charts, activeChartId, activeChart, setActiveChartId, createChart, updateChart, deleteChart } = useVisualization();
  const [draftType, setDraftType] = useState<ChartType>("line");

  const chartDefinitions = Object.values(chartRegistry);

  return (
    <section className="visualization-workspace">
      <div className="visualization-workspace__header">
        <div className="visualization-workspace__actions">
          <select
            className="visualization-workspace__picker"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as ChartType)}
          >
            {chartDefinitions.map((definition) => (
              <option key={definition.type} value={definition.type}>
                {definition.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!dataset && <div className="workspace-card">Сначала загрузите датасет на вкладке «Данные».</div>}

      {dataset && (
        <>
          <ChartTabs
            charts={charts}
            activeChartId={activeChartId}
            onSelect={setActiveChartId}
            onDelete={deleteChart}
            onAdd={() => createChart(draftType)}
          />

          <div className="visualization-workspace__grid">
            {activeChart && (
              <ChartEditorHost
                dataset={dataset}
                chart={activeChart}
                onChange={(patch) => updateChart(activeChart.id, patch)}
              />
            )}

            <section className="visualization-preview-card">
              <ChartPreviewHost dataset={dataset} chart={activeChart} />
            </section>
          </div>
        </>
      )}
    </section>
  );
}