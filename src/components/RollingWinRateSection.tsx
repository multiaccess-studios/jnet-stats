import { useMemo } from "react";
import { buildRollingWinRate } from "../lib/dataProcessing";
import { useStatsStore } from "../lib/store";
import { useDifferentialPoints, useFilteredGames } from "../lib/hooks";
import { RollingWinRateChart } from "./RollingWinRateChart";
import { VisualizationCard } from "./VisualizationCard";

export function RollingWinRateSection() {
  const games = useStatsStore((state) => state.games);
  const rollingWindow = useStatsStore((state) => state.rollingWindow);
  const setRollingWindow = useStatsStore((state) => state.setRollingWindow);
  const showRolling = useStatsStore((state) => state.visualizations.rolling);

  const { filteredGames } = useFilteredGames();
  const differentialPoints = useDifferentialPoints(filteredGames);
  const data = useMemo(
    () => buildRollingWinRate(differentialPoints, rollingWindow),
    [differentialPoints, rollingWindow],
  );

  const visible = games.length > 0 && showRolling;
  if (!visible) return null;

  const handleWindowChange = (value: number) => {
    if (Number.isNaN(value) || value <= 0) {
      setRollingWindow(1);
      return;
    }
    setRollingWindow(Math.floor(value));
  };

  return (
    <VisualizationCard
      title="Rolling win rate"
      actions={
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span>Window size (games)</span>
          <input
            type="number"
            min={1}
            value={rollingWindow}
            onChange={(event) => handleWindowChange(Number(event.target.value))}
            className="w-28 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
      }
    >
      <RollingWinRateChart data={data} windowSize={rollingWindow} />
    </VisualizationCard>
  );
}
