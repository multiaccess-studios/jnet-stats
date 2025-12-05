import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type AggregationPeriod,
  type GameRecord,
  type HistogramPeriod,
  type PlayerRole,
  type UserProfile,
} from "./dataProcessing";

export type GlobalEntityFilter =
  | { type: "side"; value: PlayerRole; label: string }
  | { type: "faction"; value: string; label: string }
  | { type: "identity"; value: string; label: string };

interface StatsState {
  games: GameRecord[];
  profile: UserProfile | null;
  playerSources: PlayerSourceSummary[];
  uploadError: string | null;
  activeFileName: string;
  collectorVisible: boolean;
  diffPeriod: AggregationPeriod;
  gamesPlayedPeriod: HistogramPeriod;
  rollingWindow: number;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  filterFormat: string;
  entityFilter: GlobalEntityFilter | null;
  entityFilters: GlobalEntityFilter[];
  entityQuery: string;
  opponentFilters: GlobalEntityFilter[];
  opponentQuery: string;
  visualizations: Record<VisualizationKey, boolean>;
  uniqueAccessTopSegmentRunner: UniqueAccessTopSegment;
  uniqueAccessTopSegmentCorp: UniqueAccessTopSegment;
  turnTopSegment: UniqueAccessTopSegment;
  winRateSortOrder: WinRateSortOrder;
  setGames: (payload: LoadedGamePayload) => void;
  setUploadError: (message: string | null) => void;
  setActiveFileName: (name: string) => void;
  setCollectorVisible: (visible: boolean) => void;
  setRangeStart: (date: Date | null) => void;
  setRangeEnd: (date: Date | null) => void;
  resetRange: () => void;
  setDiffPeriod: (period: AggregationPeriod) => void;
  setGamesPlayedPeriod: (period: HistogramPeriod) => void;
  setRollingWindow: (count: number) => void;
  setFilterFormat: (format: string) => void;
  setEntityFilter: (filter: GlobalEntityFilter | null) => void;
  setEntityFilters: (filters: GlobalEntityFilter[]) => void;
  setEntityQuery: (query: string) => void;
  setOpponentFilters: (filters: GlobalEntityFilter[]) => void;
  setOpponentFilter: (filter: GlobalEntityFilter | null) => void;
  setOpponentQuery: (query: string) => void;
  setVisualization: (key: VisualizationKey, value: boolean) => void;
  toggleVisualization: (key: VisualizationKey) => void;
  setUniqueAccessTopSegmentRunner: (value: UniqueAccessTopSegment) => void;
  setUniqueAccessTopSegmentCorp: (value: UniqueAccessTopSegment) => void;
  setTurnTopSegment: (value: UniqueAccessTopSegment) => void;
  setWinRateSortOrder: (value: WinRateSortOrder) => void;
  resetData: () => void;
}

const INITIAL_FILE_NAME = "No file selected";
export interface PlayerSourceSummary {
  name: string | null;
  fileName: string;
  totalGames: number;
}
export interface LoadedGamePayload {
  games: GameRecord[];
  profile: UserProfile | null;
  sources: PlayerSourceSummary[];
}
export type VisualizationKey =
  | "differential"
  | "rolling"
  | "identities"
  | "opponents"
  | "uniqueAccesses"
  | "corpAccesses"
  | "turns"
  | "monthlyTotals";
export type UniqueAccessTopSegment = "wins" | "losses";
export type WinRateSortOrder = "games-desc" | "games-asc" | "winRate-desc" | "winRate-asc";

const DEFAULT_VISUALIZATION_SETTINGS: Record<VisualizationKey, boolean> = Object.freeze({
  differential: true,
  rolling: true,
  identities: true,
  opponents: true,
  uniqueAccesses: true,
  corpAccesses: false,
  turns: false,
  monthlyTotals: true,
});

function mergeVisualizationDefaults(
  overrides?: Partial<Record<VisualizationKey, boolean>> | null,
): Record<VisualizationKey, boolean> {
  return {
    ...DEFAULT_VISUALIZATION_SETTINGS,
    ...(overrides ?? {}),
  };
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      games: [],
      profile: null,
      playerSources: [],
      uploadError: null,
      activeFileName: INITIAL_FILE_NAME,
      collectorVisible: true,
      diffPeriod: "weekly",
      gamesPlayedPeriod: "monthly",
      rollingWindow: 100,
      rangeStart: null,
      rangeEnd: null,
      filterFormat: "",
      entityFilter: null,
      entityFilters: [],
      entityQuery: "",
      opponentFilters: [],
      opponentQuery: "",
      visualizations: mergeVisualizationDefaults(),
      uniqueAccessTopSegmentRunner: "wins",
      uniqueAccessTopSegmentCorp: "losses",
      turnTopSegment: "wins",
      winRateSortOrder: "games-desc",
      setGames: (payload) =>
        set(() => ({
          games: payload.games,
          profile: payload.profile,
          playerSources: payload.sources,
          filterFormat: "",
          entityFilter: null,
          entityFilters: [],
          entityQuery: "",
          opponentFilters: [],
          opponentQuery: "",
          rangeStart: null,
          rangeEnd: null,
        })),
      setUploadError: (message) => set({ uploadError: message }),
      setActiveFileName: (name) => set({ activeFileName: name }),
      setCollectorVisible: (visible) => set({ collectorVisible: visible }),
      setRangeStart: (date) => set({ rangeStart: date }),
      setRangeEnd: (date) => set({ rangeEnd: date }),
      resetRange: () => set({ rangeStart: null, rangeEnd: null }),
      setDiffPeriod: (period) => set({ diffPeriod: period }),
      setGamesPlayedPeriod: (period) => set({ gamesPlayedPeriod: period }),
      setRollingWindow: (count) => set({ rollingWindow: count }),
      setFilterFormat: (format) => set({ filterFormat: format }),
      setEntityFilter: (filter) => set({ entityFilter: filter }),
      setEntityFilters: (filters) => set({ entityFilters: filters }),
      setEntityQuery: (query) => set({ entityQuery: query }),
      setOpponentFilters: (filters) => set({ opponentFilters: filters }),
      setOpponentFilter: (filter) => set({ opponentFilters: filter ? [filter] : [] }),
      setOpponentQuery: (query) => set({ opponentQuery: query }),
      setVisualization: (key, value) =>
        set((state) => ({
          visualizations: { ...state.visualizations, [key]: value },
        })),
      toggleVisualization: (key) =>
        set((state) => ({
          visualizations: {
            ...state.visualizations,
            [key]: !state.visualizations[key],
          },
        })),
      setUniqueAccessTopSegmentRunner: (value) => set({ uniqueAccessTopSegmentRunner: value }),
      setUniqueAccessTopSegmentCorp: (value) => set({ uniqueAccessTopSegmentCorp: value }),
      setTurnTopSegment: (value) => set({ turnTopSegment: value }),
      setWinRateSortOrder: (value) => set({ winRateSortOrder: value }),
      resetData: () =>
        set(() => ({
          games: [],
          profile: null,
          playerSources: [],
          uploadError: null,
          activeFileName: INITIAL_FILE_NAME,
          collectorVisible: true,
          rangeStart: null,
          rangeEnd: null,
          filterFormat: "",
          entityFilter: null,
          entityFilters: [],
          entityQuery: "",
          opponentFilters: [],
          opponentQuery: "",
        })),
    }),
    {
      name: "jnet-stats-visualizations",
      partialize: (state) => ({
        visualizations: state.visualizations,
        uniqueAccessTopSegmentRunner: state.uniqueAccessTopSegmentRunner,
        uniqueAccessTopSegmentCorp: state.uniqueAccessTopSegmentCorp,
        turnTopSegment: state.turnTopSegment,
        winRateSortOrder: state.winRateSortOrder,
        gamesPlayedPeriod: state.gamesPlayedPeriod,
      }),
      merge: (persisted, current) => {
        const stored = persisted as
          | {
              visualizations?: Record<VisualizationKey, boolean>;
              uniqueAccessTopSegmentRunner?: UniqueAccessTopSegment;
              uniqueAccessTopSegmentCorp?: UniqueAccessTopSegment;
              turnTopSegment?: UniqueAccessTopSegment;
              winRateSortOrder?: WinRateSortOrder;
              gamesPlayedPeriod?: HistogramPeriod;
            }
          | undefined;
        return {
          ...current,
          visualizations: mergeVisualizationDefaults(stored?.visualizations),
          uniqueAccessTopSegmentRunner:
            stored?.uniqueAccessTopSegmentRunner ?? current.uniqueAccessTopSegmentRunner,
          uniqueAccessTopSegmentCorp:
            stored?.uniqueAccessTopSegmentCorp ?? current.uniqueAccessTopSegmentCorp,
          turnTopSegment: stored?.turnTopSegment ?? current.turnTopSegment,
          winRateSortOrder: stored?.winRateSortOrder ?? current.winRateSortOrder,
          gamesPlayedPeriod: stored?.gamesPlayedPeriod ?? current.gamesPlayedPeriod,
        };
      },
    },
  ),
);
