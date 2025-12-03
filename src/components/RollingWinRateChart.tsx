import {
  axisBottom,
  axisLeft,
  curveMonotoneX,
  line as d3Line,
  pointer as d3Pointer,
  scaleLinear,
  select,
} from "d3";
import { useEffect, useRef, useState } from "react";
import type { RollingWinRatePoint } from "../lib/dataProcessing";

interface RollingWinRateChartProps {
  data: RollingWinRatePoint[];
  windowSize: number;
}

export function RollingWinRateChart({ data, windowSize }: RollingWinRateChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(960);
  const [tooltip, setTooltip] = useState<{
    date: Date;
    winRate: number;
    wins: number;
    total: number;
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

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    if (!data.length) {
      svg.attr("viewBox", "0 0 640 80");
      svg
        .append("text")
        .attr("x", 320)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("class", "text-sm fill-slate-400")
        .text("Rolling win rate will appear once enough games are loaded.");
      return;
    }

    const margin = { top: 20, right: 24, bottom: 36, left: 56 };
    const height = 360;
    const innerWidth = Math.max(width - margin.left - margin.right, 200);
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${Math.max(width, 320)} ${height}`);
    svg.attr("height", height);

    const indexed = data.map((point, idx) => ({
      ...point,
      index: idx + 1,
    }));
    const maxIndex = Math.max(1, indexed.length);
    const normalizedWindow = Math.max(1, Math.floor(windowSize));
    const xScale = scaleLinear().domain([1, maxIndex]).range([0, innerWidth]);
    const yScale = scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const lineGenerator = d3Line<(typeof indexed)[number]>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(d.winRate))
      .curve(curveMonotoneX);

    const unstablePoints = indexed.filter((point) => point.index < normalizedWindow);
    const stablePoints = indexed.filter((point) => point.index >= normalizedWindow);
    const stablePathPoints =
      stablePoints.length &&
      normalizedWindow > 1 &&
      normalizedWindow - 2 >= 0 &&
      normalizedWindow - 2 < indexed.length
        ? [indexed[normalizedWindow - 2], ...stablePoints]
        : stablePoints;

    if (unstablePoints.length) {
      chart
        .append("path")
        .datum(unstablePoints)
        .attr("fill", "none")
        .attr("stroke", "#fbbf24")
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", lineGenerator);
    }

    if (stablePathPoints.length) {
      chart
        .append("path")
        .datum(stablePathPoints)
        .attr("fill", "none")
        .attr("stroke", "#34d399")
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", lineGenerator);
    }

    const midY = yScale(0.5);
    if (midY >= 0 && midY <= innerHeight) {
      chart
        .append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", midY)
        .attr("y2", midY)
        .attr("class", "stroke-white stroke-2 opacity-60");
    }

    const yAxis = axisLeft(yScale)
      .ticks(5)
      .tickFormat((value) => {
        const numeric = typeof value === "number" ? value : Number(value);
        return `${Math.round((numeric || 0) * 100)}%`;
      });
    chart.append("g").call(yAxis).selectAll("text").attr("class", "text-xs fill-slate-400");

    const xAxis = axisBottom(xScale)
      .ticks(6)
      .tickFormat((value) => `#${Math.round(Number(value) || 0)}`);
    const xAxisGroup = chart
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisGroup
      .selectAll("text")
      .attr("class", "text-xs fill-slate-400")
      .attr("text-anchor", "middle");

    const focus = chart
      .append("circle")
      .attr("r", 5)
      .attr("fill", "#34d399")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2)
      .style("display", "none");

    const overlay = chart
      .append("rect")
      .attr("fill", "transparent")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .on("mousemove", (event) => {
        if (!wrapperRef.current) return;
        const [xPos] = d3Pointer(event);
        const approxIndex = xScale.invert(xPos);
        const clamped = Math.max(1, Math.min(indexed.length, approxIndex));
        const point = indexed[Math.round(clamped) - 1];
        focus
          .style("display", "block")
          .attr("cx", xScale(point.index))
          .attr("cy", yScale(point.winRate));
        const [px, py] = d3Pointer(event, wrapperRef.current);
        setTooltip({
          date: point.date,
          winRate: point.winRate,
          wins: point.wins,
          total: point.total,
          x: px + 12,
          y: py + 12,
        });
      })
      .on("mouseleave", () => {
        setTooltip(null);
        focus.style("display", "none");
      });

    return () => {
      overlay.on("mousemove", null).on("mouseleave", null);
    };
  }, [data, width, windowSize]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <svg
        ref={svgRef}
        className="w-full overflow-visible"
        role="img"
        aria-label="Rolling win rate chart"
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-lg whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold text-slate-50">{tooltip.date.toLocaleDateString()}</p>
          <p>
            Win rate: {Math.round(tooltip.winRate * 100)}% ({tooltip.wins}/{tooltip.total})
          </p>
          <p>Losses: {tooltip.total - tooltip.wins}</p>
        </div>
      )}
    </div>
  );
}
