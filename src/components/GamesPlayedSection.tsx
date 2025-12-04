import { useMemo } from "react";
import {
  addHistogramPeriod,
  buildGamesPlayedBuckets,
  formatHistogramLabel,
  truncateHistogramPeriod,
  type GamesPlayedBucket,
  type HistogramPeriod,
} from "../lib/dataProcessing";
import { useFilteredGames } from "../lib/hooks";
import { useStatsStore } from "../lib/store";
import { GamesPlayedChart } from "./GamesPlayedChart";
import { VisualizationCard } from "./VisualizationCard";

export function GamesPlayedSection() {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const showMonthly = useStatsStore((state) => state.visualizations.monthlyTotals);
  const gamesPlayedPeriod = useStatsStore((state) => state.gamesPlayedPeriod);
  const setGamesPlayedPeriod = useStatsStore((state) => state.setGamesPlayedPeriod);
  const { filteredGames, parsedRangeStart, parsedRangeEnd } = useFilteredGames();

  const data = useMemo(() => {
    if (!profile) return [];
    const buckets = buildGamesPlayedBuckets(filteredGames, profile.usernames, gamesPlayedPeriod);
    if (!buckets.length && !parsedRangeStart && !parsedRangeEnd) {
      return [];
    }
    const startCandidate =
      parsedRangeStart ?? (buckets.length ? new Date(buckets[0].value) : (parsedRangeEnd ?? null));
    const endCandidate =
      parsedRangeEnd ??
      (buckets.length ? new Date(buckets[buckets.length - 1].value) : (parsedRangeStart ?? null));
    if (!startCandidate || !endCandidate) {
      return buckets;
    }
    const start = truncateHistogramPeriod(startCandidate, gamesPlayedPeriod);
    const end = truncateHistogramPeriod(endCandidate, gamesPlayedPeriod);
    if (start.getTime() > end.getTime()) return [];
    const map = new Map(buckets.map((bucket) => [bucket.value, bucket]));
    const filled: GamesPlayedBucket[] = [];
    let cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      const key = cursor.getTime();
      const existing = map.get(key);
      if (existing) {
        filled.push(existing);
      } else {
        const date = new Date(cursor);
        filled.push({
          value: key,
          label: formatHistogramLabel(date, gamesPlayedPeriod),
          date,
          wins: 0,
          losses: 0,
          draws: 0,
          total: 0,
        });
      }
      cursor = addHistogramPeriod(cursor, gamesPlayedPeriod);
    }
    return filled;
  }, [filteredGames, gamesPlayedPeriod, parsedRangeEnd, parsedRangeStart, profile]);

  const totalSamples = useMemo(() => data.reduce((sum, bucket) => sum + bucket.total, 0), [data]);

  const visible = games.length > 0 && showMonthly;
  if (!visible) return null;

  return (
    <VisualizationCard
      title="Games played"
      meta={
        <span>
          Total: <span className="font-semibold text-white">{totalSamples.toLocaleString()}</span>
        </span>
      }
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs uppercase tracking-wide text-slate-400">
          <span>Period</span>
          <select
            value={gamesPlayedPeriod}
            onChange={(event) => setGamesPlayedPeriod(event.target.value as HistogramPeriod)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      }
    >
      <GamesPlayedChart data={data} period={gamesPlayedPeriod} />
    </VisualizationCard>
  );
}
