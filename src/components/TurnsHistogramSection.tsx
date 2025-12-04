import { useMemo } from "react";
import { buildTurnBuckets } from "../lib/dataProcessing";
import { useFilteredGames } from "../lib/hooks";
import { useStatsStore, type UniqueAccessTopSegment } from "../lib/store";
import { WinLossHistogramChart } from "./WinLossHistogramChart";
import { VisualizationCard } from "./VisualizationCard";

export function TurnsHistogramSection() {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const showTurns = useStatsStore((state) => state.visualizations.turns);
  const turnTopSegment = useStatsStore((state) => state.turnTopSegment);
  const setTurnTopSegment = useStatsStore((state) => state.setTurnTopSegment);
  const { filteredGames } = useFilteredGames();

  const rawData = useMemo(() => {
    if (!profile) return [];
    return buildTurnBuckets(filteredGames, profile.usernames);
  }, [filteredGames, profile]);

  const data = useMemo(() => {
    if (!rawData.length) return [];
    const map = new Map(rawData.map((bucket) => [bucket.value, bucket]));
    const minTurns = rawData[0].value;
    const maxTurns = rawData[rawData.length - 1].value;
    const filled = [];
    for (let value = minTurns; value <= maxTurns; value += 1) {
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

  const visible = games.length > 0 && showTurns;
  if (!visible) return null;

  return (
    <VisualizationCard
      title="Turns to finish"
      actions={
        <label className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span>Stack top</span>
          <select
            value={turnTopSegment}
            onChange={(event) => setTurnTopSegment(event.target.value as UniqueAccessTopSegment)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="wins">Wins on top</option>
            <option value="losses">Losses on top</option>
          </select>
        </label>
      }
    >
      <WinLossHistogramChart data={data} topSegment={turnTopSegment} xLabel="Turns before end" />
    </VisualizationCard>
  );
}
