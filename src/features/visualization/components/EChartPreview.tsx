import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import "./VisualizationWorkspace.css";

type Props = {
  option: EChartsOption | null;
  emptyMessage: string;
};

export default function EChartPreview({ option, emptyMessage }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!option) {
      chartRef.current.clear();
      return;
    }

    chartRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  return (
    <div className="chart-preview">
      {!option && <div className="chart-preview__empty">{emptyMessage}</div>}
      <div ref={containerRef} className="chart-preview__container" />
    </div>
  );
}