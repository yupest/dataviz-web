import { DatasetProvider } from "../features/data/context/DatasetContext";
import Workbench from "../features/data/workbench/Workbench";

export default function App() {
  return (
    <DatasetProvider>
      <Workbench />
    </DatasetProvider>
  );
}
