import { axisLeft, scaleBand, scaleLinear, select } from "d3";
import { useEffect, useRef, useState } from "react";
import type { IdentityStat } from "../lib/dataProcessing";
import type { FactionClassMap } from "../lib/statsUtils";

const defaultStyle = {
  bar: "fill-slate-500",
  text: "text-slate-200",
};

interface WinRateChartProps {
  stats: IdentityStat[];
  factionClasses: FactionClassMap;
}

export function WinRateChart({ stats, factionClasses }: WinRateChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(960);

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

    if (!stats.length) {
      svg.attr("viewBox", "0 0 600 80");
      svg
        .append("text")
        .attr("x", 300)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("class", "text-sm fill-slate-400")
        .text("Drop a game_history.json file to see your chart");
      return;
    }

    const longestLabel = stats.reduce((max, d) => Math.max(max, d.identity.length), 0);
    const dynamicLeftMargin = Math.min(600, Math.max(220, longestLabel * 9));
    const margin = { top: 16, right: 24, bottom: 32, left: dynamicLeftMargin };
    const innerWidth = Math.max(width - margin.left - margin.right, 120);
    const innerHeight = Math.max(stats.length * 36, 160);
    const height = innerHeight + margin.top + margin.bottom;

    svg.attr("viewBox", `0 0 ${Math.max(width, 320)} ${height}`);
    svg.attr("height", height);

    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = scaleLinear().domain([0, 1]).range([0, innerWidth]);
    const yScale = scaleBand<string>()
      .domain(stats.map((d) => d.identity))
      .range([0, innerHeight])
      .padding(0.25);

    const midX = xScale(0.5);
    if (midX >= 0 && midX <= innerWidth) {
      chart
        .append("line")
        .attr("x1", midX)
        .attr("x2", midX)
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("class", "stroke-white stroke-2 opacity-50");
    }

    const bars = chart.append("g");
    bars
      .selectAll("rect")
      .data(stats)
      .join("rect")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.identity) ?? 0)
      .attr("width", (d) => xScale(d.winRate))
      .attr("height", yScale.bandwidth())
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("class", (d) => `opacity-90 ${getStyle(factionClasses, d.faction).bar}`);

    const labels = chart.append("g");
    labels
      .selectAll("text")
      .data(stats)
      .join("text")
      .attr("x", (d) => {
        const value = xScale(d.winRate);
        return value > innerWidth - 60 ? value - 8 : value + 12;
      })
      .attr("y", (d) => (yScale(d.identity) ?? 0) + yScale.bandwidth() / 2)
      .attr("text-anchor", (d) => (xScale(d.winRate) > innerWidth - 60 ? "end" : "start"))
      .attr("dominant-baseline", "middle")
      .attr("class", "text-xs font-medium fill-slate-100")
      .text((d) => `${Math.round(d.winRate * 100)}% (${d.wins}/${d.total})`);

    const yAxis = axisLeft(yScale);
    const yAxisGroup = chart.append("g").call(yAxis);
    yAxisGroup.selectAll("text").attr("class", "text-sm fill-slate-100").attr("text-anchor", "end");
    yAxisGroup.selectAll("path").remove();
    yAxisGroup.selectAll("line").remove();
  }, [stats, factionClasses, width]);

  return (
    <div ref={wrapperRef} className="w-full">
      <svg
        ref={svgRef}
        className="w-full overflow-visible"
        role="img"
        aria-label="Win rate by identity chart"
      />
    </div>
  );
}

function getStyle(map: FactionClassMap, faction: string) {
  return map[faction] ?? defaultStyle;
}
