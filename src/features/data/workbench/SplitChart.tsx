import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  AriaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
echarts.use([
  BarChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  AriaComponent,
  CanvasRenderer,
]);
import type { ModelResult } from "./model";

export default function SplitChart({ result }: { result: ModelResult }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const colors = [
      "#168c92",
      "#6677d9",
      "#eba64d",
      "#cd6e8b",
      "#7baf73",
      "#9184bd",
    ];
    const totals = [
      result.train.length,
      result.test.length,
      result.rows.length,
    ];
    chart.setOption({
      color: colors,
      aria: { enabled: true },
      tooltip: { trigger: "item" },
      legend: { type: "scroll", bottom: 0 },
      grid: { top: 40, bottom: 65, left: 65, right: 20 },
      ...(result.categorical
        ? {
            xAxis: { type: "category", data: ["train", "test", "целиком"] },
            yAxis: { type: "value", name: "Записей" },
            series: result.distributions.map((d) => ({
              name: d.label,
              type: "bar",
              stack: "rows",
              barMaxWidth: 100,
              data: [d.train, d.test, d.all],
              label: { show: false },
            })),

          }
        : {
            series: [
              {
                type: "pie",
                radius: ["30%", "65%"],
                center: ["50%", "45%"],
                label: { formatter: "{b}: {c} ({d}%)" },
                data: [
                  { name: "train", value: totals[0] },
                  { name: "test", value: totals[1] },
                ],
              },
            ],
          }),
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [result]);
  return (
    <figure className="split-figure">
      <figcaption>
        100% = {result.rows.length.toLocaleString("ru-RU")} записей после
        фильтрации
      </figcaption>
      <p className="chart-totals">train: {result.train.length} · test: {result.test.length} · целиком: {result.rows.length}</p>
      <div
        ref={ref}
        className="split-chart"
        role="img"
        aria-label={`Размеры: train ${result.train.length}, test ${result.test.length}, целиком ${result.rows.length}`}
      />
    </figure>
  );
}
