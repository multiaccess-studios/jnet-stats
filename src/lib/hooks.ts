import { useMemo } from "react";
import {
  buildDifferentialTimeline,
  resolveUserRole,
  type DifferentialPoint,
  type GameRecord,
} from "./dataProcessing";
import { useStatsStore } from "./store";
import { clampDateToBounds, endOfDay, startOfDay } from "./statsUtils";
import { IDENTITY_MAP } from "./staticMaps";

export function useDataBounds() {
  const games = useStatsStore((state) => state.games);
  return useMemo(() => {
    if (!games.length) {
      return { min: null as Date | null, max: null as Date | null };
    }
    let min: Date | null = null;
    let max: Date | null = null;
    for (const game of games) {
      if (!game.completedAt) continue;
      if (!min || game.completedAt < min) {
        min = new Date(game.completedAt);
      }
      if (!max || game.completedAt > max) {
        max = new Date(game.completedAt);
      }
    }
    return { min, max };
  }, [games]);
}

export function useFilteredGames() {
  const games = useStatsStore((state) => state.games);
  const filterFormat = useStatsStore((state) => state.filterFormat);
  const rangeStart = useStatsStore((state) => state.rangeStart);
  const rangeEnd = useStatsStore((state) => state.rangeEnd);
  const entityFilter = useStatsStore((state) => state.entityFilter);
  const entityFilters = useStatsStore((state) => state.entityFilters);
  const opponentFilters = useStatsStore((state) => state.opponentFilters);
  const profile = useStatsStore((state) => state.profile);

  return useMemo(() => {
    const parsedRangeStart = rangeStart ? startOfDay(rangeStart) : null;
    const parsedRangeEnd = rangeEnd ? endOfDay(rangeEnd) : null;

    const baseFilteredGames = games.filter((game) => {
      if (filterFormat) {
        const normalized = game.format ?? "";
        if (normalized !== filterFormat) return false;
      }
      if (parsedRangeStart && (!game.completedAt || game.completedAt < parsedRangeStart)) {
        return false;
      }
      if (parsedRangeEnd && (!game.completedAt || game.completedAt > parsedRangeEnd)) {
        return false;
      }
      return true;
    });

    const usernames = profile?.usernames ?? [];

    const activeEntityFilters =
      entityFilters.length > 0 ? entityFilters : entityFilter ? [entityFilter] : [];

    if (
      (activeEntityFilters.length === 0 && opponentFilters.length === 0) ||
      usernames.length === 0
    ) {
      return {
        baseFilteredGames,
        filteredGames: baseFilteredGames,
        parsedRangeStart,
        parsedRangeEnd,
      };
    }

    const filteredGames = baseFilteredGames.filter((game) => {
      const role = resolveUserRole(game, usernames);
      if (!role) return false;
      const opponentRole = role === "runner" ? "corp" : "runner";
      let matchesPlayer = activeEntityFilters.length === 0;
      if (activeEntityFilters.length > 0) {
        matchesPlayer = activeEntityFilters.some((filter) => {
          if (filter.type === "side") {
            return role === filter.value;
          }
          if (filter.type === "identity") {
            return game[role].identity === filter.value;
          }
          const identityName = game[role].identity;
          const faction = (identityName && IDENTITY_MAP.get(identityName)) ?? "UNKNOWN";
          return faction === filter.value;
        });
      }
      let matchesOpponent = opponentFilters.length === 0;
      if (opponentFilters.length > 0) {
        matchesOpponent = opponentFilters.some((filter) => {
          if (filter.type === "side") {
            return opponentRole === filter.value;
          }
          if (filter.type === "identity") {
            return game[opponentRole].identity === filter.value;
          }
          const identityName = game[opponentRole].identity;
          const faction = (identityName && IDENTITY_MAP.get(identityName)) ?? "UNKNOWN";
          return faction === filter.value;
        });
      }
      return matchesPlayer && matchesOpponent;
    });

    return {
      baseFilteredGames,
      filteredGames,
      parsedRangeStart,
      parsedRangeEnd,
    };
  }, [
    entityFilter,
    entityFilters,
    filterFormat,
    games,
    opponentFilters,
    profile,
    rangeEnd,
    rangeStart,
  ]);
}

export function useDifferentialPoints(games: GameRecord[]) {
  const profile = useStatsStore((state) => state.profile);
  return useMemo<DifferentialPoint[]>(() => {
    const usernames = profile?.usernames ?? [];
    if (!usernames.length) return [];
    return buildDifferentialTimeline(games, usernames, IDENTITY_MAP);
  }, [games, profile]);
}

export function useClampedRange(date: Date | null) {
  const { min, max } = useDataBounds();
  return useMemo(() => {
    if (!date) return null;
    return clampDateToBounds(date, min, max);
  }, [date, max, min]);
}
