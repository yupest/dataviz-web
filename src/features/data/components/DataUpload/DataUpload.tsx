import { useState } from "react";
import { parseDatasetFile } from "../../services/fileParser";
import { useDataset } from "../../hooks/useDataset";
import "./DataUpload.css";

export default function DataUpload() {
  const { setDataset } = useDataset();
  const [error, setError] = useState<string>("");
  const [, setFileName] = useState<string>("");

  const handleFile = async (file: File) => {
    setError("");
    setFileName(file.name);

    try {
      const dataset = await parseDatasetFile(file);
      await setDataset(dataset);
    } catch {
      setError("Не удалось прочитать или обработать файл.");
    }
  };

  return (
    <div className="upload-card">
      <h2>Загрузка данных</h2>

      <label className="upload-button">
        Выбрать файл
        <input
          type="file"
          accept=".csv,.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          hidden
        />
      </label>

      {error && <div className="upload-error">{error}</div>}
    </div>
  );
}