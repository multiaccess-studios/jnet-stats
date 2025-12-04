import { useMemo } from "react";
import { buildCorpAccessBuckets } from "../lib/dataProcessing";
import { useFilteredGames } from "../lib/hooks";
import { useStatsStore, type UniqueAccessTopSegment } from "../lib/store";
import { WinLossHistogramChart } from "./WinLossHistogramChart";
import { VisualizationCard } from "./VisualizationCard";

export function CorpAccessesSection() {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const showCorpAccesses = useStatsStore((state) => state.visualizations.corpAccesses);
  const uniqueAccessTopSegment = useStatsStore((state) => state.uniqueAccessTopSegmentCorp);
  const setUniqueAccessTopSegment = useStatsStore((state) => state.setUniqueAccessTopSegmentCorp);
  const { filteredGames } = useFilteredGames();

  const rawData = useMemo(() => {
    if (!profile) return [];
    return buildCorpAccessBuckets(filteredGames, profile.usernames);
  }, [filteredGames, profile]);

  const data = useMemo(() => {
    if (!rawData.length) return [];
    const map = new Map(rawData.map((bucket) => [bucket.value, bucket]));
    const minAccesses = Math.min(0, rawData[0].value);
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

  const totalCorpGames = useMemo(() => data.reduce((sum, bucket) => sum + bucket.total, 0), [data]);

  const visible = games.length > 0 && showCorpAccesses;
  if (!visible) return null;

  return (
    <VisualizationCard
      title="Accesses faced as corp"
      description="Shows how often opponents access unique cards against you while you are the corp."
      meta={
        <span>
          Corp games:{" "}
          <span className="font-semibold text-white">{totalCorpGames.toLocaleString()}</span>
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
    >
      <WinLossHistogramChart
        data={data}
        topSegment={uniqueAccessTopSegment}
        xLabel="Unique accesses against you"
      />
    </VisualizationCard>
  );
}
