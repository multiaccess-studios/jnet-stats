import { useMemo } from "react";
import {
  buildIdentityStats,
  resolveUserRole,
  type GameRecord,
  type IdentityStat,
  type PlayerRole,
} from "../lib/dataProcessing";
import { getShortIdentityName } from "../lib/identityNames";
import { useStatsStore } from "../lib/store";
import { useFilteredGames } from "../lib/hooks";
import { FACTION_CLASS_MAP, IDENTITY_MAP } from "../lib/staticMaps";
import { VisualizationCard } from "./VisualizationCard";
import { WinRateChart } from "./WinRateChart";

export function IdentityPerformanceSection() {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const showIdentities = useStatsStore((state) => state.visualizations.identities);
  const { baseFilteredGames, filteredGames } = useFilteredGames();
  const visible = games.length > 0 && showIdentities;

  const runnerStats = useMemo(() => {
    if (!profile) return [];
    return buildIdentityStats(filteredGames, profile.username, "runner", IDENTITY_MAP);
  }, [filteredGames, profile]);

  const corpStats = useMemo(() => {
    if (!profile) return [];
    return buildIdentityStats(filteredGames, profile.username, "corp", IDENTITY_MAP);
  }, [filteredGames, profile]);

  const overallRunner = useMemo(() => {
    if (!profile) return null;
    return buildOverallStat(baseFilteredGames, profile.username, "runner");
  }, [baseFilteredGames, profile]);

  const overallCorp = useMemo(() => {
    if (!profile) return null;
    return buildOverallStat(baseFilteredGames, profile.username, "corp");
  }, [baseFilteredGames, profile]);

  const overallCombined = useMemo(() => {
    if (!profile) return null;
    const relevant = baseFilteredGames.filter(
      (game) =>
        game.winner !== null &&
        (game.runner.username === profile.username || game.corp.username === profile.username),
    );
    if (!relevant.length) return null;
    const wins = relevant.reduce((sum, game) => {
      const role = resolveUserRole(game, profile.username);
      return sum + (role && game.winner === role ? 1 : 0);
    }, 0);
    const total = relevant.length;
    const losses = total - wins;
    return {
      role: "runner" as PlayerRole,
      identity: "Overall",
      faction: "neutral",
      wins,
      losses,
      total,
      winRate: total ? wins / total : 0,
    } satisfies IdentityStat;
  }, [baseFilteredGames, profile]);

  const combinedStats = useMemo(() => {
    const merged: IdentityStat[] = [];
    if (overallCombined) merged.push(overallCombined);
    if (overallRunner) merged.push(overallRunner);
    if (overallCorp) merged.push(overallCorp);
    merged.push(...runnerStats, ...corpStats);
    return merged.sort((a, b) => b.total - a.total);
  }, [corpStats, overallCombined, overallCorp, overallRunner, runnerStats]);

  const displayStats = useMemo(
    () =>
      combinedStats.map((stat) => ({
        ...stat,
        identity: getShortIdentityName(stat.identity),
      })),
    [combinedStats],
  );

  const metaContent = combinedStats.length ? (
    <>
      Played identities: <span className="font-semibold text-white">{combinedStats.length}</span>
    </>
  ) : (
    "No games match the current filters."
  );

  if (!visible) return null;

  return (
    <VisualizationCard
      title="Identity performance overview"
      meta={metaContent}
      footer={combinedStats.length === 0 ? "Try relaxing your filters to see results." : null}
    >
      <WinRateChart stats={displayStats} factionClasses={FACTION_CLASS_MAP} />
    </VisualizationCard>
  );
}

function buildOverallStat(
  games: GameRecord[],
  username: string,
  role: PlayerRole,
): IdentityStat | null {
  const relevant = games.filter((game) => game.winner !== null && game[role].username === username);
  if (!relevant.length) return null;
  const wins = relevant.reduce((sum, game) => sum + (game.winner === role ? 1 : 0), 0);
  const total = relevant.length;
  return {
    role,
    identity: role === "runner" ? "Runner Overall" : "Corp Overall",
    faction: role === "runner" ? "neutral_runner" : "neutral_corp",
    wins,
    losses: total - wins,
    total,
    winRate: total ? wins / total : 0,
  };
}
