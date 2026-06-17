import DataUpload from "../features/data/components/DataUpload/DataUpload";
import DataTable from "../features/data/components/DataTable/DataTable";
import { DatasetProvider } from "../features/data/context/DatasetContext";
import { useDataset } from "../features/data/hooks/useDataset";

function AppContent() {
  const { isReady } = useDataset();

  if (!isReady) {
    return <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>Загрузка...</main>;
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>DataViz Prototype</h1>
      <DataUpload />
      <DataTable />
    </main>
  );
}

export default function App() {
  return (
    <DatasetProvider>
      <AppContent />
    </DatasetProvider>
  );
}