import { KNOWN_RANGES as STATIC_KNOWN_RANGES } from "./staticData";

export type PlayerRole = "runner" | "corp";

export interface RoleSnapshot {
  username: string | null;
  identity: string | null;
}

export interface GameRecord {
  winner: PlayerRole | null;
  runner: RoleSnapshot;
  corp: RoleSnapshot;
  completedAt: Date | null;
  format: string | null;
}

export interface UserProfile {
  username: string;
  totalGames: number;
  runnerGames: number;
  corpGames: number;
  coverage: number;
  matchedGames: number;
  unmatchedGames: number;
}

type RawPlayer =
  | {
      username?: unknown;
    }
  | null
  | undefined;

type RawRoleSnapshot =
  | {
      player?: RawPlayer;
      identity?: unknown;
    }
  | null
  | undefined;

type RawGameRecord =
  | {
      winner?: unknown;
      runner?: RawRoleSnapshot;
      corp?: RawRoleSnapshot;
      format?: unknown;
      ["end-date"]?: unknown;
      ["start-date"]?: unknown;
      ["creation-date"]?: unknown;
    }
  | null
  | undefined;

export interface IdentityStat {
  role: PlayerRole;
  identity: string;
  faction: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export type IdentityMap = Map<string, string>;
export type FactionColourMap = Map<string, string>;
export type AggregationPeriod = "daily" | "weekly" | "monthly";

export interface DifferentialPoint {
  date: Date;
  cumulative: number;
  delta: number;
  didWin: boolean;
  role: PlayerRole;
}

export interface DifferentialCandle {
  start: Date;
  end: Date;
  open: number;
  close: number;
  high: number;
  low: number;
}

export interface RollingWinRatePoint {
  date: Date;
  winRate: number;
  wins: number;
  total: number;
}

export interface DifferentialFilters {
  format?: string;
  side?: PlayerRole;
  faction?: string;
  identity?: string;
}

export function parseGameHistoryText(raw: string): GameRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The uploaded file is not valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("game_history.json must contain an array of games.");
  }

  return parsed.map(normalizeGame);
}

export function detectUserProfile(games: GameRecord[]): UserProfile | null {
  if (!games.length) return null;

  const totals: Record<PlayerRole, Map<string, number>> = {
    runner: new Map(),
    corp: new Map(),
  };
  const overall = new Map<string, number>();

  for (const game of games) {
    for (const role of ["runner", "corp"] as const) {
      const username = game[role].username;
      if (!username) continue;
      const map = totals[role];
      map.set(username, (map.get(username) ?? 0) + 1);
      overall.set(username, (overall.get(username) ?? 0) + 1);
    }
  }

  const chosen = pickTop(overall);
  if (!chosen) return null;

  let matchedGames = 0;
  for (const game of games) {
    if (game.runner.username === chosen.username || game.corp.username === chosen.username) {
      matchedGames += 1;
    }
  }

  return {
    username: chosen.username,
    runnerGames: totals.runner.get(chosen.username) ?? 0,
    corpGames: totals.corp.get(chosen.username) ?? 0,
    coverage: matchedGames / games.length,
    totalGames: games.length,
    matchedGames,
    unmatchedGames: games.length - matchedGames,
  };
}

export function buildIdentityStats(
  games: GameRecord[],
  username: string,
  role: PlayerRole,
  identityMap: IdentityMap,
): IdentityStat[] {
  const acc = new Map<
    string,
    {
      wins: number;
      total: number;
      faction: string;
    }
  >();

  for (const game of games) {
    const roleData = game[role];
    if (roleData.username !== username) continue;
    if (game.winner === null) continue;

    const identity = roleData.identity ?? "Unknown Identity";
    const faction = identityMap.get(identity) ?? "UNKNOWN";
    const bucket = acc.get(identity) ?? { wins: 0, total: 0, faction };
    bucket.total += 1;
    if (game.winner === role) {
      bucket.wins += 1;
    }
    bucket.faction = faction;
    acc.set(identity, bucket);
  }

  return Array.from(acc.entries())
    .map(([identity, data]) => ({
      role,
      identity,
      faction: data.faction,
      wins: data.wins,
      losses: data.total - data.wins,
      total: data.total,
      winRate: data.total ? data.wins / data.total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function buildOpponentIdentityStats(
  games: GameRecord[],
  username: string,
  role: PlayerRole,
  identityMap: IdentityMap,
): IdentityStat[] {
  const opponentRole: PlayerRole = role === "runner" ? "corp" : "runner";
  const acc = new Map<
    string,
    {
      wins: number;
      total: number;
      faction: string;
    }
  >();

  for (const game of games) {
    const playerRole = resolveUserRole(game, username);
    if (playerRole !== role) continue;
    if (game.winner === null) continue;

    const opponentIdentity = game[opponentRole].identity ?? "Unknown Identity";
    const faction = identityMap.get(opponentIdentity) ?? "UNKNOWN";
    const bucket = acc.get(opponentIdentity) ?? { wins: 0, total: 0, faction };
    bucket.total += 1;
    if (game.winner === role) {
      bucket.wins += 1;
    }
    bucket.faction = faction;
    acc.set(opponentIdentity, bucket);
  }

  return Array.from(acc.entries())
    .map(([identity, data]) => ({
      role: opponentRole,
      identity,
      faction: data.faction,
      wins: data.wins,
      losses: data.total - data.wins,
      total: data.total,
      winRate: data.total ? data.wins / data.total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function buildOpponentOverallStat(
  games: GameRecord[],
  username: string,
  role: PlayerRole,
): IdentityStat | null {
  const relevant = games.filter(
    (game) => game.winner !== null && resolveUserRole(game, username) === role,
  );
  if (!relevant.length) return null;
  const wins = relevant.reduce((sum, game) => sum + (game.winner === role ? 1 : 0), 0);
  const total = relevant.length;
  const opponentRole: PlayerRole = role === "runner" ? "corp" : "runner";
  return {
    role: opponentRole,
    identity: opponentRole === "corp" ? "Vs Corp Overall" : "Vs Runner Overall",
    faction: opponentRole === "corp" ? "neutral_corp" : "neutral_runner",
    wins,
    losses: total - wins,
    total,
    winRate: total ? wins / total : 0,
  };
}

export function buildCombinedOpponentStat(
  games: GameRecord[],
  username: string,
): IdentityStat | null {
  const relevant = games.filter(
    (game) =>
      game.winner !== null &&
      (game.runner.username === username || game.corp.username === username),
  );
  if (!relevant.length) return null;
  const wins = relevant.reduce((sum, game) => {
    const role = resolveUserRole(game, username);
    return sum + (role && game.winner === role ? 1 : 0);
  }, 0);
  const total = relevant.length;
  return {
    role: "runner",
    identity: "Vs Overall",
    faction: "neutral",
    wins,
    losses: total - wins,
    total,
    winRate: total ? wins / total : 0,
  };
}

function normalizeGame(rawGame: RawGameRecord): GameRecord {
  const completedAt = parseDate(
    rawGame?.["end-date"] ?? rawGame?.["start-date"] ?? rawGame?.["creation-date"],
  );
  return {
    winner: isRole(rawGame?.winner) ? rawGame.winner : null,
    runner: normalizeRole(rawGame?.runner),
    corp: normalizeRole(rawGame?.corp),
    completedAt,
    format: typeof rawGame?.format === "string" ? rawGame.format.trim().toLowerCase() : null,
  };
}

function normalizeRole(rawRole: RawRoleSnapshot): RoleSnapshot {
  if (!rawRole || typeof rawRole !== "object") {
    return { username: null, identity: null };
  }
  const rawPlayer = rawRole.player;
  const username =
    rawPlayer && typeof rawPlayer === "object" && typeof rawPlayer.username === "string"
      ? rawPlayer.username
      : null;
  const identity = typeof rawRole.identity === "string" ? rawRole.identity : null;
  return { username, identity };
}

function pickTop(map: Map<string, number>) {
  let top: { username: string; count: number } | null = null;
  for (const [username, count] of map.entries()) {
    if (!top || count > top.count) {
      top = { username, count };
    }
  }
  return top;
}

function isRole(value: unknown): value is PlayerRole {
  return value === "runner" || value === "corp";
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
}

export function buildDifferentialTimeline(
  games: GameRecord[],
  username: string,
  identityMap: IdentityMap,
  filters?: DifferentialFilters,
): DifferentialPoint[] {
  const relevant = games
    .filter((game) => {
      if (!game.completedAt || game.winner === null) {
        return false;
      }
      const role = resolveUserRole(game, username);
      if (!role) return false;
      if (filters?.format) {
        const targetFormat = filters.format.trim().toLowerCase();
        const gameFormat = game.format ?? "";
        if (gameFormat !== targetFormat) {
          return false;
        }
      }
      if (filters?.side && filters.side !== role) return false;
      const playerIdentity = game[role].identity;
      if (filters?.identity && playerIdentity !== filters.identity) {
        return false;
      }
      if (filters?.faction) {
        const faction = (playerIdentity && identityMap.get(playerIdentity)) ?? "UNKNOWN";
        if (faction !== filters.faction) return false;
      }
      return true;
    })
    .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime());

  let cumulative = 0;
  const timeline: DifferentialPoint[] = [];

  for (const game of relevant) {
    const role = resolveUserRole(game, username);
    if (!role) continue;
    const didWin = game.winner === role;
    const delta = didWin ? 1 : -1;
    cumulative += delta;
    timeline.push({
      date: game.completedAt!,
      cumulative,
      delta,
      didWin,
      role,
    });
  }

  return timeline;
}

export function resolveUserRole(game: GameRecord, username: string): PlayerRole | null {
  if (game.runner.username === username) return "runner";
  if (game.corp.username === username) return "corp";
  return null;
}

export function buildDifferentialCandles(
  points: DifferentialPoint[],
  options: { period: AggregationPeriod; start?: Date; end?: Date },
): DifferentialCandle[] {
  if (!points.length) return [];
  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());

  const defaultStart = sorted[0].date;
  const defaultEnd = sorted[sorted.length - 1].date;
  const rangeStart = (options.start ?? defaultStart).getTime();
  const rangeEnd = (options.end ?? defaultEnd).getTime();
  if (rangeStart > rangeEnd) return [];

  const period = options.period;
  let baseline = 0;
  for (const point of sorted) {
    if (point.date.getTime() < rangeStart) {
      baseline = point.cumulative;
    } else {
      break;
    }
  }

  const candles: DifferentialCandle[] = [];
  let current: DifferentialCandle | null = null;
  let prevValue = baseline;

  const commit = () => {
    if (current) {
      candles.push({ ...current });
    }
  };

  for (const point of sorted) {
    const time = point.date.getTime();
    if (time < rangeStart) {
      prevValue = point.cumulative;
      continue;
    }
    if (time > rangeEnd) {
      break;
    }

    const bucketStart = truncateToPeriod(point.date, period);
    const bucketEnd = addPeriod(bucketStart, period);

    if (!current || current.start.getTime() !== bucketStart.getTime()) {
      commit();
      current = {
        start: bucketStart,
        end: bucketEnd,
        open: prevValue,
        close: prevValue,
        high: prevValue,
        low: prevValue,
      };
    }

    const newValue = point.cumulative;
    current.high = Math.max(current.high, prevValue, newValue);
    current.low = Math.min(current.low, prevValue, newValue);
    current.close = newValue;
    prevValue = newValue;
  }

  commit();
  return candles;
}

export function buildRollingWinRate(
  points: DifferentialPoint[],
  windowSize: number,
): RollingWinRatePoint[] {
  if (!points.length) return [];
  const normalizedWindow = Math.max(1, Math.floor(windowSize));
  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const queue: DifferentialPoint[] = [];
  let wins = 0;
  const result: RollingWinRatePoint[] = [];
  for (const point of sorted) {
    queue.push(point);
    if (point.didWin) wins += 1;
    if (queue.length > normalizedWindow) {
      const removed = queue.shift();
      if (removed?.didWin) {
        wins -= 1;
      }
    }
    const total = queue.length;
    result.push({
      date: point.date,
      winRate: total ? wins / total : 0,
      wins,
      total,
    });
  }
  return result;
}

function truncateToPeriod(date: Date, period: AggregationPeriod) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  if (period === "weekly") {
    const day = result.getDay();
    const diff = day === 0 ? 6 : day - 1;
    result.setDate(result.getDate() - diff);
  } else if (period === "monthly") {
    result.setDate(1);
  }
  return result;
}

function addPeriod(date: Date, period: AggregationPeriod) {
  const result = new Date(date);
  if (period === "daily") {
    result.setDate(result.getDate() + 1);
  } else if (period === "weekly") {
    result.setDate(result.getDate() + 7);
  } else if (period === "monthly") {
    result.setMonth(result.getMonth() + 1);
  }
  return result;
}
type RawRange = { label: string; start: string; end: string };
type RawRangeMap = Record<string, RawRange[]>;

const KNOWN_RANGES: RawRangeMap = STATIC_KNOWN_RANGES as RawRangeMap;

export type KnownRange = {
  label: string;
  start: Date;
  end: Date;
};

export function getKnownRanges(format?: string | null): KnownRange[] {
  if (!format) return [];
  const normalized = format.trim().toLowerCase();
  const rows = KNOWN_RANGES[normalized];
  if (!rows) return [];
  return rows
    .map((entry) => ({
      label: entry.label,
      start: parseRangeDate(entry.start),
      end: parseRangeDate(entry.end),
    }))
    .filter((range): range is KnownRange => !!range.start && !!range.end);
}

export function formatRangeLabel(label: string) {
  return `"${label}"`;
}

function parseRangeDate(value: string) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}
