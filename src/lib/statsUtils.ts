export interface FactionClassMap {
  [faction: string]: {
    bar: string;
    text: string;
  };
}

export const COLOR_CLASS_MAP: Record<string, { bar: string; text: string }> = {
  red: { bar: "fill-red-500", text: "text-red-300" },
  blue: { bar: "fill-blue-500", text: "text-blue-300" },
  green: { bar: "fill-green-500", text: "text-green-300" },
  purple: { bar: "fill-purple-500", text: "text-purple-300" },
  orange: { bar: "fill-orange-500", text: "text-orange-300" },
  amber: { bar: "fill-amber-500", text: "text-amber-300" },
  emerald: { bar: "fill-emerald-500", text: "text-emerald-300" },
  rose: { bar: "fill-rose-500", text: "text-rose-300" },
  slate: { bar: "fill-slate-500", text: "text-slate-200" },
  stone: { bar: "fill-stone-500", text: "text-stone-200" },
  yellow: { bar: "fill-yellow-500", text: "text-yellow-300" },
  violet: { bar: "fill-violet-500", text: "text-violet-300" },
  neutral: { bar: "fill-zinc-500", text: "text-zinc-200" },
  emerald_contrast: { bar: "fill-emerald-600", text: "text-emerald-300" },
};

export const RUNNER_FACTIONS = [
  "criminal",
  "anarch",
  "shaper",
  "adam",
  "sunny_lebeau",
  "apex",
  "neutral_runner",
] as const;

export const CORP_FACTIONS = [
  "jinteki",
  "haas_bioroid",
  "nbn",
  "weyland_consortium",
  "neutral_corp",
] as const;

export const FACTION_LABELS: Record<string, string> = {
  criminal: "Criminal",
  anarch: "Anarch",
  shaper: "Shaper",
  adam: "Adam",
  sunny_lebeau: "Sunny",
  apex: "Apex",
  neutral_runner: "Neutral Runner",
  jinteki: "Jinteki",
  haas_bioroid: "Haas-Bioroid",
  nbn: "NBN",
  weyland_consortium: "Weyland",
  neutral_corp: "Neutral Corp",
  UNKNOWN: "Unknown",
};

export const FACTION_ORDER = [...RUNNER_FACTIONS, ...CORP_FACTIONS, "UNKNOWN"] as const;
const FACTION_RANK = new Map<string, number>(
  FACTION_ORDER.map((faction, index) => [faction, index]),
);

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function clampDateToBounds(date: Date, min?: Date | null, max?: Date | null) {
  const copy = new Date(date);
  if (min && copy < min) return new Date(min);
  if (max && copy > max) return new Date(max);
  return copy;
}

export function formatFormatLabel(format: string) {
  return titleize(format.replace(/[_-]+/g, " "));
}

export function formatFactionLabel(faction: string) {
  return FACTION_LABELS[faction] ?? titleize(faction.replace(/[_-]+/g, " "));
}

export function titleize(value: string) {
  return value
    .split(/\s+/)
    .flatMap((chunk) => chunk.split(/[_-]+/))
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function sortAlpha(values: Iterable<string>) {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export function sortFactions(values: Iterable<string>) {
  return Array.from(values).sort((a, b) => {
    const rankDiff = getFactionRank(a) - getFactionRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.localeCompare(b);
  });
}

export function getFactionRank(faction: string) {
  return FACTION_RANK.get(faction) ?? FACTION_ORDER.length;
}

export function createFactionClassMap(colourMap: Record<string, string>): FactionClassMap {
  const entries: [string, { bar: string; text: string }][] = [];
  for (const [faction, colour] of Object.entries(colourMap)) {
    const styles = COLOR_CLASS_MAP[colour] ?? COLOR_CLASS_MAP.neutral;
    entries.push([faction, styles]);
  }
  if (!colourMap["UNKNOWN"]) {
    entries.push(["UNKNOWN", COLOR_CLASS_MAP.neutral]);
  }
  return Object.fromEntries(entries);
}
