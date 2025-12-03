import { useMemo } from "react";
import {
  buildCombinedOpponentStat,
  buildOpponentIdentityStats,
  buildOpponentOverallStat,
  type IdentityStat,
} from "../lib/dataProcessing";
import { useFilteredGames } from "../lib/hooks";
import { IDENTITY_MAP } from "../lib/staticMaps";
import { useStatsStore } from "../lib/store";
import { getShortIdentityName } from "../lib/identityNames";
import { WinRateSection } from "./WinRateSection";

const displayLabel = (identity: string) => {
  return IDENTITY_MAP.has(identity) ? getShortIdentityName(identity) : identity;
};

export function OpponentPerformanceSection() {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const { baseFilteredGames, filteredGames } = useFilteredGames();
  const showOpponents = useStatsStore((state) => state.visualizations.opponents);
  const visible = games.length > 0 && showOpponents;

  const runnerOpponents = useMemo(() => {
    if (!profile) return [];
    return buildOpponentIdentityStats(filteredGames, profile.username, "runner", IDENTITY_MAP);
  }, [filteredGames, profile]);

  const corpOpponents = useMemo(() => {
    if (!profile) return [];
    return buildOpponentIdentityStats(filteredGames, profile.username, "corp", IDENTITY_MAP);
  }, [filteredGames, profile]);

  const overallRunner = useMemo(() => {
    if (!profile) return null;
    return buildOpponentOverallStat(baseFilteredGames, profile.username, "runner");
  }, [baseFilteredGames, profile]);

  const overallCorp = useMemo(() => {
    if (!profile) return null;
    return buildOpponentOverallStat(baseFilteredGames, profile.username, "corp");
  }, [baseFilteredGames, profile]);

  const overallCombined = useMemo(() => {
    if (!profile) return null;
    return buildCombinedOpponentStat(baseFilteredGames, profile.username);
  }, [baseFilteredGames, profile]);

  const combinedStats = useMemo(() => {
    const merged: IdentityStat[] = [];
    if (overallCombined) merged.push(overallCombined);
    if (overallRunner) merged.push(overallRunner);
    if (overallCorp) merged.push(overallCorp);
    merged.push(...runnerOpponents, ...corpOpponents);
    return merged.sort((a, b) => b.total - a.total);
  }, [corpOpponents, overallCombined, overallCorp, overallRunner, runnerOpponents]);

  const displayStats = useMemo(
    () =>
      combinedStats.map((stat) => ({
        ...stat,
        identity: displayLabel(stat.identity),
      })),
    [combinedStats],
  );

  return (
    <WinRateSection
      title="Opponent performance overview"
      stats={displayStats}
      visible={visible}
      metaLabel="Opponent identities"
      metaDescription="Bar height shows how often you defeat that opposing identity."
      emptyMessage="No opponents match the current filters."
      emptyFooter="Try adjusting your filters to see opponents."
    />
  );
}
