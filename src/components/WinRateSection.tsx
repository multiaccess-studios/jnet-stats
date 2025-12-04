import { useMemo, type ReactNode } from "react";
import type { IdentityStat } from "../lib/dataProcessing";
import { FACTION_CLASS_MAP } from "../lib/staticMaps";
import { useStatsStore, type WinRateSortOrder } from "../lib/store";
import { VisualizationCard } from "./VisualizationCard";
import { WinRateChart } from "./WinRateChart";

const SORT_OPTIONS = [
  { value: "games-desc", label: "Games played (descending)" },
  { value: "games-asc", label: "Games played (ascending)" },
  { value: "winRate-desc", label: "Win rate (descending)" },
  { value: "winRate-asc", label: "Win rate (ascending)" },
] as const;

interface WinRateSectionProps {
  title: string;
  stats: IdentityStat[];
  visible: boolean;
  metaLabel: string;
  description?: ReactNode;
  emptyMessage?: ReactNode;
  emptyFooter?: ReactNode;
}

export function WinRateSection({
  title,
  stats,
  visible,
  metaLabel,
  description,
  emptyMessage = "No games match the current filters.",
  emptyFooter = "Try relaxing your filters to see results.",
}: WinRateSectionProps) {
  const sortOption = useStatsStore((state) => state.winRateSortOrder);
  const setSortOption = useStatsStore((state) => state.setWinRateSortOrder);
  const hasData = stats.length > 0;
  const sortedStats = useMemo(() => {
    if (!hasData) return stats;
    return [...stats].sort((a, b) => {
      const delta = sortOption.startsWith("winRate") ? a.winRate - b.winRate : a.total - b.total;
      if (delta !== 0) return sortOption.endsWith("desc") ? -delta : delta;
      return a.identity.localeCompare(b.identity);
    });
  }, [hasData, sortOption, stats]);

  if (!visible) return null;

  const metaContent = hasData ? (
    <div className="flex flex-wrap items-center gap-2">
      <span>
        {metaLabel}:{" "}
        <span className="font-semibold text-white">{stats.length.toLocaleString()}</span>
      </span>
    </div>
  ) : (
    emptyMessage
  );

  const footer = hasData ? null : emptyFooter;
  const actions = hasData ? (
    <label className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
      <span>Sort by</span>
      <select
        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        value={sortOption}
        onChange={(event) => setSortOption(event.target.value as WinRateSortOrder)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ) : null;

  return (
    <VisualizationCard
      title={title}
      description={description}
      meta={metaContent}
      footer={footer}
      actions={actions}
    >
      <WinRateChart stats={sortedStats} factionClasses={FACTION_CLASS_MAP} />
    </VisualizationCard>
  );
}
