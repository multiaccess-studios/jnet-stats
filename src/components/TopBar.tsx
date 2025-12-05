import { Combobox } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";
import {
  formatRangeLabel,
  getKnownRanges,
  resolveUserRole,
  type GameRecord,
  type KnownRange,
} from "../lib/dataProcessing";
import {
  clampDateToBounds,
  formatFactionLabel,
  formatFormatLabel,
  sortAlpha,
  sortFactions,
} from "../lib/statsUtils";
import {
  useStatsStore,
  type GlobalEntityFilter,
  type PlayerSourceSummary,
  type VisualizationKey,
} from "../lib/store";
import { useDataBounds, useFilteredGames } from "../lib/hooks";
import { IDENTITY_MAP } from "../lib/staticMaps";
import { DateRangeSlider } from "./DateRangeSlider";

const VISUALIZATION_OPTIONS: {
  key: VisualizationKey;
  label: string;
  description: string;
}[] = [
  {
    key: "differential",
    label: "Win/Loss Differential",
    description: "Candlestick view of your cumulative record over time.",
  },
  {
    key: "rolling",
    label: "Rolling Win Rate",
    description: "Smoothed win rate based on the rolling window size.",
  },
  {
    key: "uniqueAccesses",
    label: "Unique accesses to win",
    description: "Runner-only stacked bars of wins and losses by unique accesses.",
  },
  {
    key: "corpAccesses",
    label: "Accesses faced as corp",
    description: "Runner accesses against you broken down by win/loss as corp.",
  },
  {
    key: "turns",
    label: "Turns to finish",
    description: "Histogram of how long your games last.",
  },
  {
    key: "monthlyTotals",
    label: "Monthly totals",
    description: "Games per month, split by wins and losses.",
  },
  {
    key: "identities",
    label: "Identity Performance",
    description: "Chart of each identity's win rate.",
  },
  {
    key: "opponents",
    label: "Opponent Performance",
    description: "Win rates broken down by the opposing identity.",
  },
];

interface RoleCounts {
  total: number;
  runner: number;
  corp: number;
}

function summarizeRoleCounts(games: GameRecord[], username: string | null): RoleCounts {
  if (!games.length) {
    return { total: 0, runner: 0, corp: 0 };
  }
  if (!username) {
    return { total: games.length, runner: 0, corp: 0 };
  }
  let runner = 0;
  let corp = 0;
  for (const game of games) {
    const role = resolveUserRole(game, username);
    if (role === "runner") runner++;
    if (role === "corp") corp++;
  }
  return { total: games.length, runner, corp };
}

interface TopBarProps {
  onReplaceFile: () => void;
}

export function TopBar({ onReplaceFile }: TopBarProps) {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const playerSources = useStatsStore((state) => state.playerSources);
  const filterFormat = useStatsStore((state) => state.filterFormat);
  const setFilterFormat = useStatsStore((state) => state.setFilterFormat);
  const entityFilter = useStatsStore((state) => state.entityFilter);
  const setEntityFilter = useStatsStore((state) => state.setEntityFilter);
  const entityFilters = useStatsStore((state) => state.entityFilters);
  const setEntityFilters = useStatsStore((state) => state.setEntityFilters);
  const entityQuery = useStatsStore((state) => state.entityQuery);
  const setEntityQuery = useStatsStore((state) => state.setEntityQuery);
  const opponentFilters = useStatsStore((state) => state.opponentFilters);
  const setOpponentFilters = useStatsStore((state) => state.setOpponentFilters);
  const opponentQuery = useStatsStore((state) => state.opponentQuery);
  const setOpponentQuery = useStatsStore((state) => state.setOpponentQuery);
  const rangeStart = useStatsStore((state) => state.rangeStart);
  const rangeEnd = useStatsStore((state) => state.rangeEnd);
  const setRangeStart = useStatsStore((state) => state.setRangeStart);
  const setRangeEnd = useStatsStore((state) => state.setRangeEnd);
  const visualizations = useStatsStore((state) => state.visualizations);
  const setVisualization = useStatsStore((state) => state.setVisualization);

  const { baseFilteredGames, filteredGames, parsedRangeEnd, parsedRangeStart } = useFilteredGames();
  const { min: minDate, max: maxDate } = useDataBounds();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasData = games.length > 0;

  const username = profile?.username ?? null;
  const loadedCounts = useMemo(() => summarizeRoleCounts(games, username), [games, username]);
  const filteredCounts = useMemo(
    () => summarizeRoleCounts(filteredGames, username),
    [filteredGames, username],
  );

  const formatOptions = useMemo(
    () =>
      sortAlpha(
        games.reduce((acc, game) => {
          if (game.format) acc.add(game.format);
          return acc;
        }, new Set<string>()),
      ).map((value) => ({ value, label: formatFormatLabel(value) })),
    [games],
  );

  const knownRanges = useMemo(() => {
    if (!minDate || !maxDate) return [];
    return getKnownRanges(filterFormat).filter(
      (range) => range.end >= minDate && range.start <= maxDate,
    );
  }, [filterFormat, maxDate, minDate]);

  const entityFilterOptions = useMemo<GlobalEntityFilter[]>(() => {
    const list: GlobalEntityFilter[] = [
      { type: "side", value: "runner", label: "Runner" },
      { type: "side", value: "corp", label: "Corp" },
    ];
    if (!profile) return list;
    const factions = new Set<string>();
    const identities = new Set<string>();
    for (const game of baseFilteredGames) {
      const role = resolveUserRole(game, profile.usernames);
      if (!role) continue;
      const identityName = game[role].identity;
      if (identityName) {
        identities.add(identityName);
        const faction = IDENTITY_MAP.get(identityName) ?? "UNKNOWN";
        factions.add(faction);
      }
    }
    for (const faction of sortFactions(factions)) {
      list.push({
        type: "faction",
        value: faction,
        label: formatFactionLabel(faction),
      });
    }
    for (const identity of sortAlpha(identities)) {
      list.push({
        type: "identity",
        value: identity,
        label: identity,
      });
    }
    return list;
  }, [baseFilteredGames, profile]);

  const advancedPlayerFiltersActive = entityFilters.length > 0;

  const simpleEntityOptions = useMemo(() => {
    if (!entityQuery) return entityFilterOptions;
    const lower = entityQuery.toLowerCase();
    return entityFilterOptions.filter((option) => option.label.toLowerCase().includes(lower));
  }, [entityFilterOptions, entityQuery]);

  const entityFilterKeys = useMemo(
    () => new Set(entityFilters.map((filter) => `${filter.type}-${filter.value}`)),
    [entityFilters],
  );
  const advancedEntityOptions = useMemo(() => {
    const available = entityFilterOptions.filter(
      (option) => !entityFilterKeys.has(`${option.type}-${option.value}`),
    );
    if (!entityQuery) return available;
    const lower = entityQuery.toLowerCase();
    return available.filter((option) => option.label.toLowerCase().includes(lower));
  }, [entityFilterKeys, entityFilterOptions, entityQuery]);

  const opponentFilterOptions = useMemo<GlobalEntityFilter[]>(() => {
    const list: GlobalEntityFilter[] = [
      { type: "side", value: "runner", label: "Runner" },
      { type: "side", value: "corp", label: "Corp" },
    ];
    if (!profile) return list;
    const factions = new Set<string>();
    const identities = new Set<string>();
    for (const game of baseFilteredGames) {
      const role = resolveUserRole(game, profile.usernames);
      if (!role) continue;
      const opponentRole = role === "runner" ? "corp" : "runner";
      const identityName = game[opponentRole].identity;
      if (identityName) {
        identities.add(identityName);
        const faction = IDENTITY_MAP.get(identityName) ?? "UNKNOWN";
        factions.add(faction);
      }
    }
    for (const faction of sortFactions(factions)) {
      list.push({
        type: "faction",
        value: faction,
        label: formatFactionLabel(faction),
      });
    }
    for (const identity of sortAlpha(identities)) {
      list.push({
        type: "identity",
        value: identity,
        label: identity,
      });
    }
    return list;
  }, [baseFilteredGames, profile]);

  const opponentFilterKeys = useMemo(
    () => new Set(opponentFilters.map((filter) => `${filter.type}-${filter.value}`)),
    [opponentFilters],
  );
  const filteredOpponentOptions = useMemo(() => {
    const available = opponentFilterOptions.filter(
      (option) => !opponentFilterKeys.has(`${option.type}-${option.value}`),
    );
    if (!opponentQuery) return available;
    const lower = opponentQuery.toLowerCase();
    return available.filter((option) => option.label.toLowerCase().includes(lower));
  }, [opponentFilterKeys, opponentFilterOptions, opponentQuery]);

  useEffect(() => {
    if (filterFormat && !formatOptions.some((option) => option.value === filterFormat)) {
      setFilterFormat("");
    }
  }, [filterFormat, formatOptions, setFilterFormat]);

  useEffect(() => {
    if (!entityFilter) return;
    const exists = entityFilterOptions.some(
      (option) => option.type === entityFilter.type && option.value === entityFilter.value,
    );
    if (!exists) {
      setEntityFilter(null);
      setEntityQuery("");
    }
  }, [entityFilter, entityFilterOptions, setEntityFilter, setEntityQuery]);

  useEffect(() => {
    if (!advancedPlayerFiltersActive) return;
    if (entityFilter) {
      setEntityFilter(null);
      setEntityQuery("");
    }
  }, [advancedPlayerFiltersActive, entityFilter, setEntityFilter, setEntityQuery]);

  useEffect(() => {
    if (entityFilters.length === 0) return;
    const validKeys = new Set(
      entityFilterOptions.map((option) => `${option.type}-${option.value}`),
    );
    const next = entityFilters.filter((filter) => validKeys.has(`${filter.type}-${filter.value}`));
    if (next.length !== entityFilters.length) {
      setEntityFilters(next);
      setEntityQuery("");
    }
  }, [entityFilterOptions, entityFilters, setEntityFilters, setEntityQuery]);

  useEffect(() => {
    if (opponentFilters.length === 0) return;
    const validKeys = new Set(
      opponentFilterOptions.map((option) => `${option.type}-${option.value}`),
    );
    const next = opponentFilters.filter((filter) =>
      validKeys.has(`${filter.type}-${filter.value}`),
    );
    if (next.length !== opponentFilters.length) {
      setOpponentFilters(next);
      setOpponentQuery("");
    }
  }, [opponentFilterOptions, opponentFilters, setOpponentFilters, setOpponentQuery]);

  const otherAccounts = useMemo(() => {
    if (playerSources.length <= 1) return [];
    const primary = playerSources.reduce<PlayerSourceSummary | null>((best, current) => {
      if (!best || current.totalGames > best.totalGames) return current;
      return best;
    }, null);
    return playerSources.filter((source) => source !== primary);
  }, [playerSources]);
  const otherAccountNames =
    otherAccounts.length > 0
      ? otherAccounts.map((source) => source.name ?? "Unknown player").join(", ")
      : null;

  if (!hasData) return null;

  const diffRangeInvalid =
    !!parsedRangeStart && !!parsedRangeEnd && parsedRangeStart.getTime() > parsedRangeEnd.getTime();

  const handleKnownRangeSelect = (range: KnownRange) => {
    if (!minDate || !maxDate) return;
    const nextStart = clampDateToBounds(range.start, minDate, maxDate);
    const nextEnd = clampDateToBounds(range.end, minDate, maxDate);
    setRangeStart(nextStart);
    setRangeEnd(nextEnd);
  };

  const handleVisualizationToggle = (key: VisualizationKey, checked: boolean) =>
    setVisualization(key, checked);

  const handleReplaceClick = () => {
    setSettingsOpen(false);
    onReplaceFile();
  };

  return (
    <header className="sticky top-0 z-20 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 text-xl font-semibold text-white">
          <span title={otherAccountNames ?? undefined}>
            {profile?.username ?? "Unknown Pilot"}
            {otherAccounts.length > 0 && <span>+</span>}
          </span>
          <button
            type="button"
            onClick={handleReplaceClick}
            title="Upload a different JSON file"
            className="text-lg transition hover:scale-110 cursor-pointer"
          >
            &#128259;
          </button>
        </div>
        <div className="flex-1 text-center text-[0.65rem] text-slate-400 lg:text-xs">
          <span className="font-semibold text-slate-100">
            Loaded {loadedCounts.total.toLocaleString()}
          </span>
          <span className="mx-2 text-slate-600" aria-hidden="true">
            &bull;
          </span>
          <span>R {loadedCounts.runner.toLocaleString()}</span>
          <span className="mx-1 text-slate-600">/</span>
          <span>C {loadedCounts.corp.toLocaleString()}</span>
          <span className="mx-3 text-slate-700" aria-hidden="true">
            &bull;
          </span>
          <span className="font-semibold text-slate-200">
            Filtered {filteredCounts.total.toLocaleString()}
          </span>
          <span className="mx-2 text-slate-700" aria-hidden="true">
            &bull;
          </span>
          <span>R {filteredCounts.runner.toLocaleString()}</span>
          <span className="mx-1 text-slate-700">/</span>
          <span>C {filteredCounts.corp.toLocaleString()}</span>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-white"
        >
          More Options
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <select
          value={filterFormat}
          onChange={(event) => setFilterFormat(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white lg:w-52"
        >
          <option value="">All formats</option>
          {formatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex-1">
          <DateRangeSlider
            minDate={minDate}
            maxDate={maxDate}
            valueStart={rangeStart}
            valueEnd={rangeEnd}
            onReset={() => {
              setRangeStart(null);
              setRangeEnd(null);
            }}
            onChange={(start, end) => {
              setRangeStart(start);
              setRangeEnd(end);
            }}
          />
        </div>
        <div className="w-full lg:w-72">
          <Combobox
            value={entityFilter}
            onChange={(option) => {
              setEntityFilter(option);
              setEntityQuery(option?.label ?? "");
            }}
            disabled={advancedPlayerFiltersActive}
            nullable
          >
            <div className="relative">
              <Combobox.Input
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  advancedPlayerFiltersActive
                    ? "border-slate-800 bg-slate-900 text-slate-500"
                    : "border-slate-700 bg-slate-900 text-white"
                }`}
                displayValue={(option: GlobalEntityFilter | null) => option?.label ?? ""}
                onChange={(event) => setEntityQuery(event.target.value)}
                placeholder="All sides / factions / identities"
                disabled={advancedPlayerFiltersActive}
              />
              {advancedPlayerFiltersActive && (
                <div className="absolute inset-0 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-slate-900/80 px-3 text-xs font-semibold text-emerald-300">
                  <span>Advanced filters active</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEntityFilters([]);
                      setEntityQuery("");
                    }}
                    className="text-xs font-semibold text-emerald-200 underline decoration-dotted transition hover:text-white focus:outline-none"
                  >
                    Clear
                  </button>
                </div>
              )}
              {!advancedPlayerFiltersActive && entityFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setEntityFilter(null);
                    setEntityQuery("");
                  }}
                  className="absolute inset-y-0 right-3 text-xs text-slate-400 transition hover:text-white"
                >
                  Clear
                </button>
              )}
              {!advancedPlayerFiltersActive && simpleEntityOptions.length > 0 && (
                <Combobox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-lg">
                  {simpleEntityOptions.map((option) => (
                    <Combobox.Option
                      key={`${option.type}-${option.value}`}
                      value={option}
                      className={({ active }) =>
                        `cursor-pointer px-3 py-2 ${
                          active ? "bg-emerald-500/20 text-white" : "text-slate-200"
                        }`
                      }
                    >
                      {option.label}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              )}
              {!advancedPlayerFiltersActive && simpleEntityOptions.length === 0 && entityQuery && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 shadow-lg">
                  No matches
                </div>
              )}
            </div>
          </Combobox>
        </div>
      </div>

      {(entityFilters.length > 0 || opponentFilters.length > 0) && (
        <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-slate-200">
          <div className="flex flex-col gap-2">
            {entityFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.65rem] uppercase tracking-wide text-emerald-300">
                  Advanced (You)
                </span>
                {entityFilters.map((filter) => (
                  <button
                    key={`chip-player-${filter.type}-${filter.value}`}
                    type="button"
                    onClick={() =>
                      setEntityFilters(
                        entityFilters.filter(
                          (current) =>
                            !(current.type === filter.type && current.value === filter.value),
                        ),
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-slate-900/80 px-2 py-1 text-[0.7rem] font-semibold text-emerald-100 transition hover:border-emerald-400 hover:text-white"
                  >
                    {filter.label}
                    <span aria-hidden="true">&times;</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEntityFilters([])}
                  className="text-[0.7rem] font-semibold text-emerald-200 underline decoration-dotted transition hover:text-white"
                >
                  Clear
                </button>
              </div>
            )}
            {opponentFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.65rem] uppercase tracking-wide text-emerald-300">
                  Advanced (Opponent)
                </span>
                {opponentFilters.map((filter) => (
                  <button
                    key={`chip-opponent-${filter.type}-${filter.value}`}
                    type="button"
                    onClick={() =>
                      setOpponentFilters(
                        opponentFilters.filter(
                          (current) =>
                            !(current.type === filter.type && current.value === filter.value),
                        ),
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-slate-900/80 px-2 py-1 text-[0.7rem] font-semibold text-emerald-100 transition hover:border-emerald-400 hover:text-white"
                  >
                    {filter.label}
                    <span aria-hidden="true">&times;</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setOpponentFilters([])}
                  className="text-[0.7rem] font-semibold text-emerald-200 underline decoration-dotted transition hover:text-white"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {knownRanges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {knownRanges.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => handleKnownRangeSelect(range)}
              className="rounded-full border border-slate-600 px-2 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-white"
            >
              {formatRangeLabel(range.label)}
            </button>
          ))}
        </div>
      )}

      {diffRangeInvalid && (
        <p className="text-sm text-amber-300">End date must be later than start date.</p>
      )}

      {settingsOpen && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">More options</p>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="text-xs text-slate-400 transition hover:text-white"
            >
              Done
            </button>
          </div>
          <div className="mt-4 space-y-5">
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Advanced filters
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Build filter pools with removable chips for yourself or your opponents.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
                    Your side / faction / identity
                  </p>
                  <div className="mt-2">
                    <Combobox
                      value={null}
                      onChange={(option: GlobalEntityFilter | null) => {
                        if (!option) return;
                        const key = `${option.type}-${option.value}`;
                        if (entityFilterKeys.has(key)) {
                          setEntityQuery("");
                          return;
                        }
                        setEntityFilters([...entityFilters, option]);
                        setEntityQuery("");
                      }}
                      nullable
                    >
                      <div className="relative">
                        <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 pr-10 py-2 text-sm text-white focus-within:border-emerald-500">
                          {entityFilters.map((filter) => (
                            <span
                              key={`advanced-player-${filter.type}-${filter.value}`}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-2 py-1 text-xs font-semibold text-slate-100"
                            >
                              {filter.label}
                              <button
                                type="button"
                                onClick={() =>
                                  setEntityFilters(
                                    entityFilters.filter(
                                      (current) =>
                                        !(
                                          current.type === filter.type &&
                                          current.value === filter.value
                                        ),
                                    ),
                                  )
                                }
                                className="text-[10px] text-slate-400 transition hover:text-white"
                                aria-label={`Remove ${filter.label}`}
                              >
                                x
                              </button>
                            </span>
                          ))}
                          <Combobox.Input
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none min-w-[80px]"
                            displayValue={() => ""}
                            onChange={(event) => setEntityQuery(event.target.value)}
                            onKeyDown={(event) => {
                              if (
                                event.key === "Backspace" &&
                                entityQuery.length === 0 &&
                                entityFilters.length > 0
                              ) {
                                event.preventDefault();
                                setEntityFilters(entityFilters.slice(0, -1));
                              }
                            }}
                            placeholder={
                              entityFilters.length === 0
                                ? "Add sides / factions / identities"
                                : undefined
                            }
                          />
                        </div>
                        {entityFilters.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEntityFilters([]);
                              setEntityQuery("");
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 transition hover:text-white"
                          >
                            Clear
                          </button>
                        )}
                        {advancedEntityOptions.length > 0 && (
                          <Combobox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-lg">
                            {advancedEntityOptions.map((option) => (
                              <Combobox.Option
                                key={`advanced-player-option-${option.type}-${option.value}`}
                                value={option}
                                className={({ active }) =>
                                  `cursor-pointer px-3 py-2 ${
                                    active ? "bg-emerald-500/20 text-white" : "text-slate-200"
                                  }`
                                }
                              >
                                {option.label}
                              </Combobox.Option>
                            ))}
                          </Combobox.Options>
                        )}
                        {advancedEntityOptions.length === 0 && entityQuery && (
                          <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 shadow-lg">
                            No matches
                          </div>
                        )}
                      </div>
                    </Combobox>
                  </div>
                </div>
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
                    Opponent side / faction / identity
                  </p>
                  <div className="mt-2">
                    <Combobox
                      value={null}
                      onChange={(option: GlobalEntityFilter | null) => {
                        if (!option) return;
                        const key = `${option.type}-${option.value}`;
                        if (opponentFilterKeys.has(key)) {
                          setOpponentQuery("");
                          return;
                        }
                        setOpponentFilters([...opponentFilters, option]);
                        setOpponentQuery("");
                      }}
                      nullable
                    >
                      <div className="relative">
                        <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 pr-10 py-2 text-sm text-white focus-within:border-emerald-500">
                          {opponentFilters.map((filter) => (
                            <span
                              key={`opponent-selected-${filter.type}-${filter.value}`}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-2 py-1 text-xs font-semibold text-slate-100"
                            >
                              {filter.label}
                              <button
                                type="button"
                                onClick={() =>
                                  setOpponentFilters(
                                    opponentFilters.filter(
                                      (current) =>
                                        !(
                                          current.type === filter.type &&
                                          current.value === filter.value
                                        ),
                                    ),
                                  )
                                }
                                className="text-[10px] text-slate-400 transition hover:text-white"
                                aria-label={`Remove ${filter.label}`}
                              >
                                x
                              </button>
                            </span>
                          ))}
                          <Combobox.Input
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none min-w-[80px]"
                            displayValue={() => ""}
                            onChange={(event) => setOpponentQuery(event.target.value)}
                            onKeyDown={(event) => {
                              if (
                                event.key === "Backspace" &&
                                opponentQuery.length === 0 &&
                                opponentFilters.length > 0
                              ) {
                                event.preventDefault();
                                setOpponentFilters(opponentFilters.slice(0, -1));
                              }
                            }}
                            placeholder={
                              opponentFilters.length === 0
                                ? "Add opponent sides / factions / identities"
                                : undefined
                            }
                          />
                        </div>
                        {opponentFilters.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpponentFilters([]);
                              setOpponentQuery("");
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 transition hover:text-white"
                          >
                            Clear
                          </button>
                        )}
                        {filteredOpponentOptions.length > 0 && (
                          <Combobox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-lg">
                            {filteredOpponentOptions.map((option) => (
                              <Combobox.Option
                                key={`opponent-${option.type}-${option.value}`}
                                value={option}
                                className={({ active }) =>
                                  `cursor-pointer px-3 py-2 ${
                                    active ? "bg-emerald-500/20 text-white" : "text-slate-200"
                                  }`
                                }
                              >
                                {option.label}
                              </Combobox.Option>
                            ))}
                          </Combobox.Options>
                        )}
                        {filteredOpponentOptions.length === 0 && opponentQuery && (
                          <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 shadow-lg">
                            No matches
                          </div>
                        )}
                      </div>
                    </Combobox>
                  </div>
                </div>
              </div>
            </section>
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Visualizations
              </p>
              <div className="mt-3 space-y-2">
                {VISUALIZATION_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 transition hover:border-emerald-500/60"
                  >
                    <input
                      type="checkbox"
                      checked={visualizations[option.key]}
                      onChange={(event) =>
                        handleVisualizationToggle(option.key, event.target.checked)
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="font-semibold text-white">{option.label}</span>
                      <br />
                      <span className="text-xs text-slate-400">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </header>
  );
}
