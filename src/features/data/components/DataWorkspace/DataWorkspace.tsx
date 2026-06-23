
import DataTable from "../DataTable/DataTable";
import DataUpload from "../DataUpload/DataUpload";
import "./DataWorkspace.css";

export default function DataWorkspace() {
  return (
    <section className="data-workspace">
      <DataUpload />
      <DataTable />
    </section>
  );
}