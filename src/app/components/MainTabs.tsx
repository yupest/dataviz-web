export type MainTabKey = "data" | "visualizations" | "dashboard";

type TabItem = {
  key: MainTabKey;
  label: string;
};

const tabs: TabItem[] = [
  { key: "data", label: "Данные" },
  { key: "visualizations", label: "Визуализация" },
  { key: "dashboard", label: "Дашборд" },
];

type Props = {
  activeTab: MainTabKey;
  onChange: (tab: MainTabKey) => void;
};

export default function MainTabs({ activeTab, onChange }: Props) {
  return (
    <nav className="main-tabs" role="tablist" aria-label="Основные разделы">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={`main-tabs__tab ${activeTab === tab.key ? "main-tabs__tab--active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}