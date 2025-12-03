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
import { useStatsStore, type GlobalEntityFilter, type VisualizationKey } from "../lib/store";
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
    key: "identities",
    label: "Identity Performance",
    description: "Chart of each identity's win rate.",
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
  const filterFormat = useStatsStore((state) => state.filterFormat);
  const setFilterFormat = useStatsStore((state) => state.setFilterFormat);
  const entityFilter = useStatsStore((state) => state.entityFilter);
  const setEntityFilter = useStatsStore((state) => state.setEntityFilter);
  const entityQuery = useStatsStore((state) => state.entityQuery);
  const setEntityQuery = useStatsStore((state) => state.setEntityQuery);
  const rangeStart = useStatsStore((state) => state.rangeStart);
  const rangeEnd = useStatsStore((state) => state.rangeEnd);
  const setRangeStart = useStatsStore((state) => state.setRangeStart);
  const setRangeEnd = useStatsStore((state) => state.setRangeEnd);
  const visualizations = useStatsStore((state) => state.visualizations);
  const setVisualization = useStatsStore((state) => state.setVisualization);

  const { filteredGames, parsedRangeEnd, parsedRangeStart } = useFilteredGames();
  const { min: minDate, max: maxDate } = useDataBounds();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasData = games.length > 0;

  const playerHoverText = profile
    ? `${profile.totalGames.toLocaleString()} games | Runner ${profile.runnerGames.toLocaleString()} / Corp ${profile.corpGames.toLocaleString()}`
    : "No games loaded yet";
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
    for (const game of filteredGames) {
      const role = resolveUserRole(game, profile.username);
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
  }, [filteredGames, profile]);

  const filteredEntityOptions = useMemo(() => {
    if (!entityQuery) return entityFilterOptions;
    const lower = entityQuery.toLowerCase();
    return entityFilterOptions.filter((option) => option.label.toLowerCase().includes(lower));
  }, [entityFilterOptions, entityQuery]);

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
          <span title={playerHoverText}>{profile?.username ?? "Unknown Pilot"}</span>
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
          Visualizations
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
            nullable
          >
            <div className="relative">
              <Combobox.Input
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                displayValue={(option: GlobalEntityFilter | null) => option?.label ?? ""}
                onChange={(event) => setEntityQuery(event.target.value)}
                placeholder="All sides / factions / identities"
              />
              {entityFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setEntityFilter(null);
                    setEntityQuery("");
                  }}
                  className="absolute inset-y-0 right-2 text-xs text-slate-400 transition hover:text-white"
                >
                  Clear
                </button>
              )}
              {filteredEntityOptions.length > 0 && (
                <Combobox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-lg">
                  {filteredEntityOptions.map((option) => (
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
              {filteredEntityOptions.length === 0 && entityQuery && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 shadow-lg">
                  No matches
                </div>
              )}
            </div>
          </Combobox>
        </div>
      </div>

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
            <p className="text-sm font-semibold text-white">Choose visualizations</p>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="text-xs text-slate-400 transition hover:text-white"
            >
              Done
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {VISUALIZATION_OPTIONS.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 transition hover:border-emerald-500/60"
              >
                <input
                  type="checkbox"
                  checked={visualizations[option.key]}
                  onChange={(event) => handleVisualizationToggle(option.key, event.target.checked)}
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
        </div>
      )}
    </header>
  );
}
