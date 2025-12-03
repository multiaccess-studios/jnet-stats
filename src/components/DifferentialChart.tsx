import { axisBottom, axisLeft, pointer as d3Pointer, scaleBand, scaleLinear, select } from "d3";
import { useEffect, useRef, useState } from "react";
import type { AggregationPeriod, DifferentialCandle } from "../lib/dataProcessing";

interface DifferentialChartProps {
  candles: DifferentialCandle[];
  period: AggregationPeriod;
}

export function DifferentialChart({ candles, period }: DifferentialChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const width = 920;
  const [tooltip, setTooltip] = useState<{
    label: string;
    open: number;
    close: number;
    high: number;
    low: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    if (!candles.length) {
      svg.attr("viewBox", "0 0 600 60");
      svg
        .append("text")
        .attr("x", 300)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("class", "text-sm fill-slate-400")
        .text("No differential data yet.");
      return;
    }

    const margin = { top: 16, right: 24, bottom: 40, left: 56 };
    const height = 520;
    const innerHeight = height - margin.top - margin.bottom;
    const scaledWidth = Math.max(width, 320);
    const innerWidth = scaledWidth - margin.left - margin.right;

    svg.attr("viewBox", `0 0 ${scaledWidth} ${height}`);
    svg.attr("height", height);

    const xKeys = candles.map((c) => c.start.toISOString());
    const xScale = scaleBand<string>().domain(xKeys).range([0, innerWidth]).padding(0.3);

    const values = candles.flatMap((c) => [c.high, c.low]);
    const yScale = scaleLinear()
      .domain([Math.min(...values) - 1, Math.max(...values) + 1])
      .nice()
      .range([innerHeight, 0]);

    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const labelMap = new Map<string, string>();
    for (const candle of candles) {
      if (candle.start) {
        labelMap.set(candle.start.toISOString(), formatTickLabel(candle.start, period));
      }
    }

    const xAxis = axisBottom(xScale)
      .tickSize(0)
      .tickFormat(() => "");
    const xAxisGroup = chart
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisGroup.selectAll("path").remove();
    xAxisGroup.selectAll("line").remove();

    const yAxis = axisLeft(yScale).ticks(6);
    chart.append("g").call(yAxis).selectAll("text").attr("class", "text-xs fill-slate-400");

    const zeroY = yScale(0);
    if (zeroY >= 0 && zeroY <= innerHeight) {
      chart
        .append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", zeroY)
        .attr("y2", zeroY)
        .attr("class", "stroke-white stroke-2 opacity-80");
    }

    const bodyWidth = xScale.bandwidth();

    const wickGroup = chart.append("g");
    wickGroup
      .selectAll("line")
      .data(candles)
      .join("line")
      .attr("x1", (candle) => {
        const offset = xScale(candle.start.toISOString()) ?? 0;
        return offset + xScale.bandwidth() / 2;
      })
      .attr("x2", (candle) => {
        const offset = xScale(candle.start.toISOString()) ?? 0;
        return offset + xScale.bandwidth() / 2;
      })
      .attr("y1", (candle) => yScale(Math.max(candle.high, candle.open, candle.close)))
      .attr("y2", (candle) => yScale(Math.min(candle.low, candle.open, candle.close)))
      .attr("class", (candle) =>
        candle.close >= candle.open ? "stroke-emerald-400" : "stroke-rose-400",
      )
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round");

    const bodyGroup = chart.append("g");
    bodyGroup
      .selectAll("rect")
      .data(candles)
      .join("rect")
      .attr("x", (candle) => {
        const offset = xScale(candle.start.toISOString()) ?? 0;
        return offset + xScale.bandwidth() / 2 - bodyWidth / 2;
      })
      .attr("width", bodyWidth)
      .attr("y", (candle) => {
        const openY = yScale(candle.open);
        const closeY = yScale(candle.close);
        return Math.min(openY, closeY);
      })
      .attr("height", (candle) => {
        const openY = yScale(candle.open);
        const closeY = yScale(candle.close);
        return Math.max(Math.abs(openY - closeY), 2);
      })
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("class", (candle) =>
        candle.close >= candle.open ? "fill-emerald-500" : "fill-rose-500",
      );

    const overlay = chart.append("g");
    overlay
      .selectAll("rect")
      .data(candles)
      .join("rect")
      .attr("x", (candle) => xScale(candle.start.toISOString()) ?? 0)
      .attr("width", xScale.bandwidth())
      .attr("y", 0)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .on("mousemove", (event, candle) => {
        if (!wrapperRef.current || !candle.start) return;
        const [px, py] = d3Pointer(event, wrapperRef.current);
        setTooltip({
          label: formatTickLabel(candle.start, period),
          open: candle.open,
          close: candle.close,
          high: candle.high,
          low: candle.low,
          x: px + 12,
          y: py + 12,
        });
      })
      .on("mouseleave", () => setTooltip(null));
  }, [candles, period, width]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <svg
        ref={svgRef}
        className="w-full overflow-visible"
        role="img"
        aria-label="Win/loss differential candlestick chart"
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-lg whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <p className="font-semibold text-slate-50">{tooltip.label}</p>
          <p>Open: {tooltip.open}</p>
          <p>Close: {tooltip.close}</p>
          <p>High: {tooltip.high}</p>
          <p>Low: {tooltip.low}</p>
        </div>
      )}
    </div>
  );
}

function formatTickLabel(date: Date, period: AggregationPeriod) {
  if (period === "weekly") {
    const week = getISOWeek(date);
    return `${date.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
  }
  if (period === "monthly") {
    return date.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }
  return date.toLocaleDateString();
}

function getISOWeek(date: Date) {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
