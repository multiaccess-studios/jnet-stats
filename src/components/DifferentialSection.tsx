import { useMemo } from "react";
import { buildDifferentialCandles, type AggregationPeriod } from "../lib/dataProcessing";
import { useStatsStore } from "../lib/store";
import { useDifferentialPoints, useFilteredGames } from "../lib/hooks";
import { DifferentialChart } from "./DifferentialChart";
import { VisualizationCard } from "./VisualizationCard";

export function DifferentialSection() {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const diffPeriod = useStatsStore((state) => state.diffPeriod);
  const setDiffPeriod = useStatsStore((state) => state.setDiffPeriod);
  const showDifferential = useStatsStore((state) => state.visualizations.differential);
  const { filteredGames, parsedRangeEnd, parsedRangeStart } = useFilteredGames();
  const differentialPoints = useDifferentialPoints(filteredGames);
  const latestDifferential = differentialPoints[differentialPoints.length - 1]?.cumulative ?? 0;

  const candles = useMemo(
    () =>
      buildDifferentialCandles(differentialPoints, {
        period: diffPeriod,
        start: parsedRangeStart ?? undefined,
        end: parsedRangeEnd ?? undefined,
      }),
    [differentialPoints, diffPeriod, parsedRangeEnd, parsedRangeStart],
  );

  const visible = games.length > 0 && showDifferential;
  if (!visible) return null;

  return (
    <VisualizationCard
      title="Win/loss differential"
      meta={
        profile && (
          <p>
            Current differential:{" "}
            <span className="font-semibold text-white">{latestDifferential}</span>
          </p>
        )
      }
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs uppercase tracking-wide text-slate-400">
          <span>Period</span>
          <select
            value={diffPeriod}
            onChange={(event) => setDiffPeriod(event.target.value as AggregationPeriod)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      }
    >
      <DifferentialChart candles={candles} period={diffPeriod} />
    </VisualizationCard>
  );
}
