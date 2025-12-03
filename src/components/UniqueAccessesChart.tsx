import { axisBottom, axisLeft, max, scaleBand, scaleLinear, select } from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UniqueAccessBucket } from "../lib/dataProcessing";
import type { UniqueAccessTopSegment } from "../lib/store";

interface UniqueAccessesChartProps {
  data: UniqueAccessBucket[];
  topSegment: UniqueAccessTopSegment;
}

export function UniqueAccessesChart({ data, topSegment }: UniqueAccessesChartProps) {
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
        .text("No access data found for the current filters.");
      return;
    }

    const margin = { top: 16, right: 24, bottom: 56, left: 56 };
    const innerWidth = Math.max(width - margin.left - margin.right, 160);
    const innerHeight = 340;
    const height = innerHeight + margin.top + margin.bottom;

    svg.attr("viewBox", `0 0 ${Math.max(width, 320)} ${height}`);
    svg.attr("height", height);

    const xDomain = data.map((bucket) => bucket.uniqueAccesses.toString());
    const xScale = scaleBand<string>().domain(xDomain).range([0, innerWidth]).padding(0.2);
    const yScale = scaleLinear()
      .domain([0, (maxTotal || 1) * 1.05])
      .nice()
      .range([innerHeight, 0]);

    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const LABEL_MIN_HEIGHT = 24;

    const grid = axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => "");
    chart
      .append("g")
      .attr("class", "text-slate-700")
      .call(grid)
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("line").attr("stroke", "currentColor").attr("stroke-opacity", 0.25));

    const bars = chart.append("g");
    bars
      .selectAll("g")
      .data(data)
      .join("g")
      .attr(
        "transform",
        (bucket) => `translate(${xScale(bucket.uniqueAccesses.toString()) ?? 0},0)`,
      )
      .each(function (bucket) {
        const group = select(this);
        const bandwidth = xScale.bandwidth();
        const zeroY = yScale(0);
        const topKey: "wins" | "losses" = topSegment;
        const bottomKey: "wins" | "losses" = topSegment === "wins" ? "losses" : "wins";
        const stackOrder: Array<"wins" | "losses"> = [bottomKey, topKey];
        type SegmentInfo = { value: number; y: number; height: number };
        const segments: Record<"wins" | "losses", SegmentInfo> = {
          wins: { value: bucket.wins, y: zeroY, height: 0 },
          losses: { value: bucket.losses, y: zeroY, height: 0 },
        };
        let offsetValue = 0;
        for (const role of stackOrder) {
          const value = role === "wins" ? bucket.wins : bucket.losses;
          const startCoord = yScale(offsetValue);
          const endValue = offsetValue + value;
          const endCoord = yScale(endValue);
          const height = startCoord - endCoord;
          segments[role] = { value, y: endCoord, height: Math.max(0, height) };
          offsetValue = endValue;
        }
        const stackTotal = offsetValue;
        const stackTopY = stackTotal > 0 ? yScale(stackTotal) : zeroY;

        for (const role of stackOrder) {
          const segment = segments[role];
          if (segment.value <= 0 || segment.height <= 0) continue;
          group
            .append("rect")
            .attr("x", 0)
            .attr("y", segment.y)
            .attr("width", bandwidth)
            .attr("height", segment.height)
            .attr("rx", 4)
            .attr("class", role === "wins" ? "fill-emerald-400/80" : "fill-rose-500/70");
        }

        const topInfo = segments[topKey];
        const bottomInfo = segments[bottomKey];
        const shouldFloatBoth = bottomInfo.value === 0 || bottomInfo.height < LABEL_MIN_HEIGHT;
        const canPlaceTopInside =
          topInfo.value > 0 && topInfo.height >= LABEL_MIN_HEIGHT && !shouldFloatBoth;
        const canPlaceBottomInside =
          bottomInfo.value > 0 && bottomInfo.height >= LABEL_MIN_HEIGHT && !shouldFloatBoth;

        const labelPositions: Record<"wins" | "losses", number> = { wins: 0, losses: 0 };
        const labelInside: Record<"wins" | "losses", boolean> = { wins: false, losses: false };

        if (shouldFloatBoth) {
          const first = Math.max(stackTopY - 18, 12);
          const second = Math.max(first + 12, 12);
          labelPositions[topKey] = first;
          labelPositions[bottomKey] = second;
        } else {
          labelPositions[topKey] = canPlaceTopInside
            ? topInfo.y + topInfo.height / 2
            : Math.max(topInfo.y - 6, 12);
          labelPositions[bottomKey] = canPlaceBottomInside
            ? bottomInfo.y + bottomInfo.height / 2
            : Math.max(bottomInfo.y - 6, 12);
          labelInside[topKey] = canPlaceTopInside;
          labelInside[bottomKey] = canPlaceBottomInside;
        }

        (["wins", "losses"] as const).forEach((role) => {
          const isInside = labelInside[role];
          const textClass = isInside
            ? role === "wins"
              ? "text-[0.65rem] font-semibold fill-emerald-950"
              : "text-[0.65rem] font-semibold fill-white"
            : role === "wins"
              ? "text-[0.65rem] font-semibold fill-emerald-300"
              : "text-[0.65rem] font-semibold fill-rose-300";
          const value = role === "wins" ? bucket.wins : bucket.losses;
          const prefix = role === "wins" ? "W" : "L";
          group
            .append("text")
            .attr("x", bandwidth / 2)
            .attr("y", labelPositions[role])
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", isInside ? "middle" : "baseline")
            .attr("class", textClass)
            .text(isInside ? value.toString() : `${prefix} ${value}`);
        });

        const percent = bucket.total > 0 ? Math.round((bucket.wins / bucket.total) * 100) : 0;
        const percentY = labelInside[topKey]
          ? Math.max(topInfo.y - 10, 12)
          : Math.max(stackTopY - (shouldFloatBoth ? 30 : 24), 8);
        group
          .append("text")
          .attr("x", bandwidth / 2)
          .attr("y", percentY)
          .attr("text-anchor", "middle")
          .attr("class", "text-[0.65rem] font-semibold fill-slate-200")
          .text(`${percent}%`);
      });

    const xAxis = axisBottom(xScale);
    const xAxisGroup = chart
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisGroup
      .selectAll("text")
      .attr("class", "text-xs fill-slate-300")
      .attr("dy", "0.75em")
      .attr("dx", "-0.5em")
      .attr("transform", "rotate(-35)")
      .style("text-anchor", "end");
    xAxisGroup.selectAll("line").remove();
    xAxisGroup.selectAll("path").attr("stroke", "currentColor").attr("class", "text-slate-700");

    chart
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 44)
      .attr("text-anchor", "middle")
      .attr("class", "text-xs fill-slate-300 uppercase tracking-wide")
      .text("Unique runner accesses");

    const yAxis = axisLeft(yScale).ticks(Math.min(8, maxTotal || 1));
    const yAxisGroup = chart.append("g").call(yAxis);
    yAxisGroup.selectAll("text").attr("class", "text-xs fill-slate-300");
    yAxisGroup.selectAll("path").remove();
    yAxisGroup.selectAll("line").remove();

    chart
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 18)
      .attr("text-anchor", "middle")
      .attr("class", "text-xs fill-slate-300 uppercase tracking-wide")
      .text("Games");

    const legend = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const entries = [
      { label: "Losses", className: "fill-rose-500/70" },
      { label: "Wins", className: "fill-emerald-400/80" },
    ];
    entries.forEach((entry, index) => {
      const legendItem = legend.append("g").attr("transform", `translate(${index * 120},-8)`);
      legendItem
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 3)
        .attr("class", entry.className);
      legendItem
        .append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("class", "text-xs fill-slate-300")
        .text(entry.label);
    });
  }, [data, maxTotal, topSegment, width]);

  return (
    <div ref={wrapperRef} className="w-full">
      <svg
        ref={svgRef}
        className="w-full overflow-visible"
        role="img"
        aria-label="Unique accesses to win chart"
      />
    </div>
  );
}
