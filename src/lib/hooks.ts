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
  const profile = useStatsStore((state) => state.profile);
  const username = profile?.username ?? null;

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

    if (!entityFilter || !username) {
      return {
        baseFilteredGames,
        filteredGames: baseFilteredGames,
        parsedRangeStart,
        parsedRangeEnd,
      };
    }

    const filteredGames = baseFilteredGames.filter((game) => {
      const role = resolveUserRole(game, username);
      if (!role) return false;
      if (entityFilter.type === "side") {
        return role === entityFilter.value;
      }
      if (entityFilter.type === "identity") {
        return game[role].identity === entityFilter.value;
      }
      if (entityFilter.type === "faction") {
        const identityName = game[role].identity;
        const faction = (identityName && IDENTITY_MAP.get(identityName)) ?? "UNKNOWN";
        return faction === entityFilter.value;
      }
      return true;
    });

    return {
      baseFilteredGames,
      filteredGames,
      parsedRangeStart,
      parsedRangeEnd,
    };
  }, [entityFilter, filterFormat, games, rangeEnd, rangeStart, username]);
}

export function useDifferentialPoints(games: GameRecord[]) {
  const profile = useStatsStore((state) => state.profile);
  const username = profile?.username ?? null;
  return useMemo<DifferentialPoint[]>(() => {
    if (!username) return [];
    return buildDifferentialTimeline(games, username, IDENTITY_MAP);
  }, [games, username]);
}

export function useClampedRange(date: Date | null) {
  const { min, max } = useDataBounds();
  return useMemo(() => {
    if (!date) return null;
    return clampDateToBounds(date, min, max);
  }, [date, max, min]);
}
