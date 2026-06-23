import { useState } from "react";
import { DatasetProvider } from "../features/data/context/DatasetContext";
import MainTabs, { type MainTabKey } from "./components/MainTabs";
import WorkspacePlaceholder from "./components/WorkspacePlaceholder";
import "./App.css";
import { useDataset } from "../features/data/hooks/useDataset";
import DataWorkspace from "../features/data/components/DataWorkspace/DataWorkspace";

function AppContent() {
  const [activeTab, setActiveTab] = useState<MainTabKey>("data");
  const { isReady } = useDataset();

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
        {activeTab === "visualizations" && (
          <WorkspacePlaceholder
            title="Визуализация"
            description="Здесь появятся вкладки графиков, настройки осей, стилей и предпросмотр."
          />
        )}
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
      <AppContent />
    </DatasetProvider>
  );
}