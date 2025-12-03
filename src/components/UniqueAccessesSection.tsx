import { useMemo } from "react";
import { buildRunnerUniqueAccessBuckets } from "../lib/dataProcessing";
import { useFilteredGames } from "../lib/hooks";
import { useStatsStore, type UniqueAccessTopSegment } from "../lib/store";
import { WinLossHistogramChart } from "./WinLossHistogramChart";
import { VisualizationCard } from "./VisualizationCard";

export function UniqueAccessesSection() {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const showUniqueAccesses = useStatsStore((state) => state.visualizations.uniqueAccesses);
  const uniqueAccessTopSegment = useStatsStore((state) => state.uniqueAccessTopSegmentRunner);
  const setUniqueAccessTopSegment = useStatsStore((state) => state.setUniqueAccessTopSegmentRunner);
  const { filteredGames } = useFilteredGames();

  const rawData = useMemo(() => {
    if (!profile) return [];
    return buildRunnerUniqueAccessBuckets(filteredGames, profile.username);
  }, [filteredGames, profile]);

  const data = useMemo(() => {
    if (!rawData.length) return [];
    const map = new Map(rawData.map((bucket) => [bucket.value, bucket]));
    const minAccesses = rawData[0].value;
    const maxAccesses = rawData[rawData.length - 1].value;
    const filled = [];
    for (let value = minAccesses; value <= maxAccesses; value += 1) {
      filled.push(
        map.get(value) ?? {
          value,
          wins: 0,
          losses: 0,
          total: 0,
        },
      );
    }
    return filled;
  }, [rawData]);

  const totalRunnerGames = useMemo(
    () => data.reduce((sum, bucket) => sum + bucket.total, 0),
    [data],
  );

  const visible = games.length > 0 && showUniqueAccesses;
  if (!visible) return null;

  return (
    <VisualizationCard
      title="Unique accesses"
      description="Runner-only view of how many different cards you accessed before each result."
      meta={
        <span>
          Runner samples counted:{" "}
          <span className="font-semibold text-white">{totalRunnerGames.toLocaleString()}</span>
        </span>
      }
      actions={
        <label className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span>Stack top</span>
          <select
            value={uniqueAccessTopSegment}
            onChange={(event) =>
              setUniqueAccessTopSegment(event.target.value as UniqueAccessTopSegment)
            }
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="wins">Wins on top</option>
            <option value="losses">Losses on top</option>
          </select>
        </label>
      }
      footer="Accesses in Archives are not counted, even if they were not previously accessed."
    >
      <WinLossHistogramChart
        data={data}
        topSegment={uniqueAccessTopSegment}
        xLabel="Unique runner accesses"
      />
    </VisualizationCard>
  );
}
