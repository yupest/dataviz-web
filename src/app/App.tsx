import { useState } from "react";
import DataUpload from "../features/data/components/DataUpload/DataUpload";
import DataTable from "../features/data/components/DataTable/DataTable";
import type { Dataset } from "../features/data/types";

function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>DataViz Prototype</h1>

      <DataUpload onDataLoaded={setDataset} />
      <DataTable dataset={dataset} />
    </main>
  );
}

export default App;