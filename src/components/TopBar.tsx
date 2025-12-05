import { useEffect, useMemo, useState } from "react";
import {
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
import { AdvancedFiltersSummary } from "./topbar/AdvancedFiltersSummary";
import { MoreOptionsPanel } from "./topbar/MoreOptionsPanel";
import {
  TopBarPrimarySection,
  type FormatOption,
  type RoleCounts,
} from "./topbar/TopBarPrimarySection";
import type { VisualizationOption } from "./topbar/VisualizationsMenu";

const VISUALIZATION_OPTIONS: VisualizationOption[] = [
  {
    key: "monthlyTotals",
    label: "Games played",
    description: "Games played over time, split by wins and losses.",
  },
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
    label: "Unique accesses",
    description: "Runner-only view of how many different cards you accessed before each result.",
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
    key: "identities",
    label: "Identity performance",
    description: "Bar height shows how often you win with that identity.",
  },
  {
    key: "opponents",
    label: "Opponent performance",
    description: "Bar height shows how often you defeat that opposing identity.",
  },
];

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

  const formatOptions = useMemo<FormatOption[]>(
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

  const simpleEntityOptions = useMemo<GlobalEntityFilter[]>(() => {
    if (!entityQuery) return entityFilterOptions;
    const lower = entityQuery.toLowerCase();
    return entityFilterOptions.filter((option) => option.label.toLowerCase().includes(lower));
  }, [entityFilterOptions, entityQuery]);

  const entityFilterKeys = useMemo(
    () => new Set(entityFilters.map((filter) => `${filter.type}-${filter.value}`)),
    [entityFilters],
  );
  const advancedEntityOptions = useMemo<GlobalEntityFilter[]>(() => {
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
  const filteredOpponentOptions = useMemo<GlobalEntityFilter[]>(() => {
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

  const handleEntitySelect = (option: GlobalEntityFilter | null) => {
    setEntityFilter(option);
    setEntityQuery(option?.label ?? "");
  };

  const handleEntityClear = () => {
    if (advancedPlayerFiltersActive) {
      setEntityFilters([]);
      setEntityQuery("");
    } else {
      setEntityFilter(null);
      setEntityQuery("");
    }
  };

  const handlePlayerFilterAdd = (filter: GlobalEntityFilter) => {
    const key = `${filter.type}-${filter.value}`;
    if (entityFilterKeys.has(key)) {
      setEntityQuery("");
      return;
    }
    setEntityFilters([...entityFilters, filter]);
    setEntityQuery("");
  };

  const handlePlayerFilterRemove = (filter: GlobalEntityFilter) => {
    setEntityFilters(
      entityFilters.filter(
        (current) => !(current.type === filter.type && current.value === filter.value),
      ),
    );
  };

  const handlePlayerFilterClear = () => {
    setEntityFilters([]);
    setEntityQuery("");
  };

  const handlePlayerBackspace = () => {
    if (entityFilters.length === 0) return;
    setEntityFilters(entityFilters.slice(0, -1));
  };

  const handleOpponentFilterAdd = (filter: GlobalEntityFilter) => {
    const key = `${filter.type}-${filter.value}`;
    if (opponentFilterKeys.has(key)) {
      setOpponentQuery("");
      return;
    }
    setOpponentFilters([...opponentFilters, filter]);
    setOpponentQuery("");
  };

  const handleOpponentFilterRemove = (filter: GlobalEntityFilter) => {
    setOpponentFilters(
      opponentFilters.filter(
        (current) => !(current.type === filter.type && current.value === filter.value),
      ),
    );
  };

  const handleOpponentFilterClear = () => {
    setOpponentFilters([]);
    setOpponentQuery("");
  };

  const handleOpponentBackspace = () => {
    if (opponentFilters.length === 0) return;
    setOpponentFilters(opponentFilters.slice(0, -1));
  };

  const advancedSummary = (
    <AdvancedFiltersSummary
      playerFilters={entityFilters}
      opponentFilters={opponentFilters}
      onPlayerRemove={handlePlayerFilterRemove}
      onPlayerClear={handlePlayerFilterClear}
      onOpponentRemove={handleOpponentFilterRemove}
      onOpponentClear={handleOpponentFilterClear}
    />
  );

  return (
    <header className="sticky top-0 z-20 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
      <TopBarPrimarySection
        profileName={profile?.username ?? "Unknown Pilot"}
        hasAdditionalAccounts={otherAccounts.length > 0}
        otherAccountNames={otherAccountNames}
        loadedCounts={loadedCounts}
        filteredCounts={filteredCounts}
        onReplaceFile={handleReplaceClick}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        filterFormat={filterFormat}
        formatOptions={formatOptions}
        onFormatChange={setFilterFormat}
        minDate={minDate}
        maxDate={maxDate}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onRangeReset={() => {
          setRangeStart(null);
          setRangeEnd(null);
        }}
        onRangeChange={(start, end) => {
          setRangeStart(start);
          setRangeEnd(end);
        }}
        entityFilter={entityFilter}
        entityQuery={entityQuery}
        onEntityQueryChange={setEntityQuery}
        onEntitySelect={handleEntitySelect}
        simpleEntityOptions={simpleEntityOptions}
        advancedPlayerFiltersActive={advancedPlayerFiltersActive}
        onEntityClear={handleEntityClear}
        knownRanges={knownRanges}
        onKnownRangeSelect={handleKnownRangeSelect}
        diffRangeInvalid={diffRangeInvalid}
        advancedSummary={advancedSummary}
      />

      {settingsOpen && (
        <MoreOptionsPanel
          onClose={() => setSettingsOpen(false)}
          playerFilters={entityFilters}
          playerQuery={entityQuery}
          onPlayerQueryChange={setEntityQuery}
          onPlayerAdd={handlePlayerFilterAdd}
          onPlayerRemove={handlePlayerFilterRemove}
          onPlayerClear={handlePlayerFilterClear}
          onPlayerBackspace={handlePlayerBackspace}
          playerOptions={advancedEntityOptions}
          opponentFilters={opponentFilters}
          opponentQuery={opponentQuery}
          onOpponentQueryChange={setOpponentQuery}
          onOpponentAdd={handleOpponentFilterAdd}
          onOpponentRemove={handleOpponentFilterRemove}
          onOpponentClear={handleOpponentFilterClear}
          onOpponentBackspace={handleOpponentBackspace}
          opponentOptions={filteredOpponentOptions}
          visualizations={visualizations}
          visualizationOptions={VISUALIZATION_OPTIONS}
          onVisualizationToggle={handleVisualizationToggle}
        />
      )}
    </header>
  );
}
