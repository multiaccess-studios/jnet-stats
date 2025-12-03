import type { ReactNode } from "react";
import type { IdentityStat } from "../lib/dataProcessing";
import { FACTION_CLASS_MAP } from "../lib/staticMaps";
import { VisualizationCard } from "./VisualizationCard";
import { WinRateChart } from "./WinRateChart";

interface WinRateSectionProps {
  title: string;
  stats: IdentityStat[];
  visible: boolean;
  metaLabel: string;
  metaDescription?: string;
  emptyMessage?: ReactNode;
  emptyFooter?: ReactNode;
}

export function WinRateSection({
  title,
  stats,
  visible,
  metaLabel,
  metaDescription,
  emptyMessage = "No games match the current filters.",
  emptyFooter = "Try relaxing your filters to see results.",
}: WinRateSectionProps) {
  if (!visible) return null;

  const hasData = stats.length > 0;
  const metaContent = hasData ? (
    <div className="flex flex-wrap items-center gap-2">
      <span>
        {metaLabel}:{" "}
        <span className="font-semibold text-white">{stats.length.toLocaleString()}</span>
      </span>
      {metaDescription ? (
        <>
          <span className="text-slate-600" aria-hidden="true">
            &bull;
          </span>
          <span className="text-xs text-slate-300">{metaDescription}</span>
        </>
      ) : null}
    </div>
  ) : (
    emptyMessage
  );

  const footer = hasData ? null : emptyFooter;

  return (
    <VisualizationCard title={title} meta={metaContent} footer={footer}>
      <WinRateChart stats={stats} factionClasses={FACTION_CLASS_MAP} />
    </VisualizationCard>
  );
}
