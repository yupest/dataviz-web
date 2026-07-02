import { useEffect, useState } from "react";
import { DatasetProvider } from "../features/data/context/DatasetContext";
import { VisualizationProvider } from "../features/visualization/context/VisualizationContext";
import { useVisualization } from "../features/visualization/hooks/useVisualization";
import VisualizationWorkspace from "../features/visualization/components/VisualizationWorkspace";
import MainTabs, { type MainTabKey } from "./components/MainTabs";
import WorkspacePlaceholder from "./components/WorkspacePlaceholder";
import "./App.css";
import { useDataset } from "../features/data/hooks/useDataset";
import DataWorkspace from "../features/data/components/DataWorkspace/DataWorkspace";

function AppContent() {
  const [activeTab, setActiveTab] = useState<MainTabKey>("data");
  const { isReady, datasetVersion } = useDataset();
  const { resetCharts } = useVisualization();

  useEffect(() => {
    resetCharts("line");
  }, [datasetVersion, resetCharts]);

  if (!isReady) {
    return (
      <main className="app-shell">
        <div className="workspace-card">Загрузка...</div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <MainTabs activeTab={activeTab} onChange={setActiveTab} />
      </header>

      <main className="app-shell__content">
        {activeTab === "data" && <DataWorkspace />}
        {activeTab === "visualizations" && <VisualizationWorkspace />}
        {activeTab === "dashboard" && (
          <WorkspacePlaceholder
            title="Дашборд"
            description="Здесь будет общий отчёт, кросс-фильтрация и компоновка нескольких графиков."
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DatasetProvider>
      <VisualizationProvider>
        <AppContent />
      </VisualizationProvider>
    </DatasetProvider>
  );
}