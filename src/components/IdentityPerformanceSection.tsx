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
import { IDENTITY_MAP } from "../lib/staticMaps";
import { WinRateSection } from "./WinRateSection";

export function IdentityPerformanceSection() {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const showIdentities = useStatsStore((state) => state.visualizations.identities);
  const { baseFilteredGames, filteredGames } = useFilteredGames();
  const visible = games.length > 0 && showIdentities;

  const runnerStats = useMemo(() => {
    if (!profile) return [];
    return buildIdentityStats(filteredGames, profile.usernames, "runner", IDENTITY_MAP);
  }, [filteredGames, profile]);

  const corpStats = useMemo(() => {
    if (!profile) return [];
    return buildIdentityStats(filteredGames, profile.usernames, "corp", IDENTITY_MAP);
  }, [filteredGames, profile]);

  const overallRunner = useMemo(() => {
    if (!profile) return null;
    return buildOverallStat(baseFilteredGames, profile.usernames, "runner");
  }, [baseFilteredGames, profile]);

  const overallCorp = useMemo(() => {
    if (!profile) return null;
    return buildOverallStat(baseFilteredGames, profile.usernames, "corp");
  }, [baseFilteredGames, profile]);

  const overallCombined = useMemo(() => {
    if (!profile) return null;
    const usernames = profile.usernames;
    const relevant = baseFilteredGames.filter(
      (game) =>
        (game.winner !== null &&
          game.runner.username &&
          usernames.includes(game.runner.username)) ||
        (game.corp.username && usernames.includes(game.corp.username)),
    );
    if (!relevant.length) return null;
    const wins = relevant.reduce((sum, game) => {
      const role = resolveUserRole(game, usernames);
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

  return (
    <WinRateSection
      title="Identity performance overview"
      stats={displayStats}
      visible={visible}
      metaLabel="Played identities"
      description="Bar height shows how often you win with that identity."
      emptyFooter="Try relaxing your filters to see results."
    />
  );
}

function buildOverallStat(
  games: GameRecord[],
  usernames: string[],
  role: PlayerRole,
): IdentityStat | null {
  const relevant = games.filter(
    (game) =>
      game.winner !== null &&
      game[role].username !== null &&
      usernames.includes(game[role].username as string),
  );
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
