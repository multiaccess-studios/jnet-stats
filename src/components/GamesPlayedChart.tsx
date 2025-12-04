import {
  axisBottom,
  axisLeft,
  max,
  scaleBand,
  scaleLinear,
  select,
  pointer as d3Pointer,
} from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GamesPlayedBucket, HistogramPeriod } from "../lib/dataProcessing";

interface GamesPlayedChartProps {
  data: GamesPlayedBucket[];
  period: HistogramPeriod;
}

const PERIOD_AXIS_LABEL: Record<HistogramPeriod, string> = {
  daily: "Day",
  weekly: "Week",
  monthly: "Month",
  yearly: "Year",
};

export function GamesPlayedChart({ data, period }: GamesPlayedChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(960);
  const [tooltip, setTooltip] = useState<{
    label: string;
    total: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number | null;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const maxTotal = useMemo(() => max(data, (bucket) => bucket.total) ?? 0, [data]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    if (!data.length) {
      svg.attr("viewBox", "0 0 600 80");
      svg
        .append("text")
        .attr("x", 300)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("class", "text-sm fill-slate-400")
        .text("No monthly data available.");
      return;
    }

    const margin = { top: 16, right: 16, bottom: 56, left: 56 };
    const innerWidth = Math.max(width - margin.left - margin.right, 160);
    const innerHeight = 320;
    const height = innerHeight + margin.top + margin.bottom;

    svg.attr("viewBox", `0 0 ${Math.max(width, 320)} ${height}`);
    svg.attr("height", height);

    const xDomain = data.map((bucket) => bucket.label);
    const xScale = scaleBand<string>().domain(xDomain).range([0, innerWidth]).padding(0.2);
    const yScale = scaleLinear()
      .domain([0, (maxTotal || 1) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const grid = axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => "");
    chart
      .append("g")
      .attr("class", "text-slate-800")
      .call(grid)
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("line").attr("stroke", "currentColor").attr("stroke-opacity", 0.15));

    const bars = chart.append("g");
    const wrapper = wrapperRef.current;
    bars
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (bucket) => xScale(bucket.label) ?? 0)
      .attr("y", (bucket) => yScale(bucket.total))
      .attr("width", xScale.bandwidth())
      .attr("height", (bucket) => innerHeight - yScale(bucket.total))
      .attr("rx", 4)
      .attr("class", "fill-cyan-400/70 hover:fill-cyan-300/80 transition-colors")
      .on("pointerenter pointermove", function (event, bucket) {
        if (!wrapper) return;
        const [px, py] = d3Pointer(event, wrapper);
        const completed = bucket.wins + bucket.losses;
        const winRate =
          completed > 0
            ? Math.round((bucket.wins / completed) * 100)
            : bucket.wins > 0
              ? 100
              : null;
        setTooltip({
          label: formatTooltipLabel(bucket, period),
          total: bucket.total,
          wins: bucket.wins,
          losses: bucket.losses,
          draws: bucket.draws,
          winRate,
          x: px + 12,
          y: py - 24,
        });
      })
      .on("pointerleave", () => setTooltip(null));

    const labelMap = new Map(data.map((bucket) => [bucket.label, bucket]));
    const tickValues = data
      .filter((bucket, index, arr) => {
        if (index === 0) return true;
        const prev = arr[index - 1];
        return bucket.date.getUTCFullYear() !== prev.date.getUTCFullYear();
      })
      .map((bucket) => bucket.label);
    if (!tickValues.length && data.length) {
      tickValues.push(data[0].label);
    }
    const formatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
    const xAxis = axisBottom(xScale)
      .tickValues(tickValues)
      .tickFormat((label) => {
        const bucket = labelMap.get(String(label));
        if (!bucket) return label;
        if (period === "yearly") {
          return bucket.date.getUTCFullYear().toString();
        }
        return formatter.format(bucket.date).replace(" ", "\n");
      });
    const xAxisGroup = chart
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisGroup
      .selectAll("text")
      .attr("class", "text-xs fill-slate-400 whitespace-pre")
      .style("text-anchor", "middle");
    xAxisGroup.selectAll("line").remove();
    xAxisGroup.selectAll("path").attr("class", "stroke-white/60");

    chart
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 44)
      .attr("text-anchor", "middle")
      .attr("class", "text-xs fill-slate-300 uppercase tracking-wide")
      .text(PERIOD_AXIS_LABEL[period]);

    const yAxis = axisLeft(yScale).ticks(Math.min(8, maxTotal || 1));
    const yAxisGroup = chart.append("g").call(yAxis);
    yAxisGroup.selectAll("text").attr("class", "text-xs fill-slate-400");
    yAxisGroup.selectAll("path").attr("class", "stroke-white/60");
    yAxisGroup.selectAll("line").remove();

    chart
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 18)
      .attr("text-anchor", "middle")
      .attr("class", "text-xs fill-slate-300 uppercase tracking-wide")
      .text("Games");
  }, [data, maxTotal, period, width]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <svg
        ref={svgRef}
        className="w-full overflow-visible"
        role="img"
        aria-label="Monthly totals chart"
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold text-slate-50">{tooltip.label}</p>
          <p>Total: {tooltip.total}</p>
          <p>Wins: {tooltip.wins}</p>
          <p>Losses: {tooltip.losses}</p>
          <p>Incomplete: {tooltip.draws}</p>
          <p>
            Win rate:{" "}
            {tooltip.winRate === null
              ? "N/A"
              : `${tooltip.winRate}% (${tooltip.wins}/${tooltip.wins + tooltip.losses})`}
          </p>
        </div>
      )}
    </div>
  );
}

function formatTooltipLabel(bucket: GamesPlayedBucket, period: HistogramPeriod) {
  if (period === "yearly") {
    return bucket.date.getUTCFullYear().toString();
  }
  if (period === "monthly") {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
      bucket.date,
    );
  }
  if (period === "weekly") {
    const end = new Date(bucket.date);
    end.setUTCDate(end.getUTCDate() + 6);
    const rangeFormatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });
    return `Week of ${rangeFormatter.format(bucket.date)} - ${rangeFormatter.format(end)}`;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(bucket.date);
}
