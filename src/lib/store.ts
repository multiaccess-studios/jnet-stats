import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  detectUserProfile,
  type AggregationPeriod,
  type GameRecord,
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
  uploadError: string | null;
  activeFileName: string;
  collectorVisible: boolean;
  diffPeriod: AggregationPeriod;
  rollingWindow: number;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  filterFormat: string;
  entityFilter: GlobalEntityFilter | null;
  entityQuery: string;
  visualizations: Record<VisualizationKey, boolean>;
  uniqueAccessTopSegmentRunner: UniqueAccessTopSegment;
  uniqueAccessTopSegmentCorp: UniqueAccessTopSegment;
  turnTopSegment: UniqueAccessTopSegment;
  winRateSortOrder: WinRateSortOrder;
  setGames: (games: GameRecord[]) => void;
  setUploadError: (message: string | null) => void;
  setActiveFileName: (name: string) => void;
  setCollectorVisible: (visible: boolean) => void;
  setRangeStart: (date: Date | null) => void;
  setRangeEnd: (date: Date | null) => void;
  resetRange: () => void;
  setDiffPeriod: (period: AggregationPeriod) => void;
  setRollingWindow: (count: number) => void;
  setFilterFormat: (format: string) => void;
  setEntityFilter: (filter: GlobalEntityFilter | null) => void;
  setEntityQuery: (query: string) => void;
  setVisualization: (key: VisualizationKey, value: boolean) => void;
  toggleVisualization: (key: VisualizationKey) => void;
  setUniqueAccessTopSegmentRunner: (value: UniqueAccessTopSegment) => void;
  setUniqueAccessTopSegmentCorp: (value: UniqueAccessTopSegment) => void;
  setTurnTopSegment: (value: UniqueAccessTopSegment) => void;
  setWinRateSortOrder: (value: WinRateSortOrder) => void;
  resetData: () => void;
}

const INITIAL_FILE_NAME = "No file selected";
export type VisualizationKey =
  | "differential"
  | "rolling"
  | "identities"
  | "opponents"
  | "uniqueAccesses"
  | "corpAccesses"
  | "turns";
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
      uploadError: null,
      activeFileName: INITIAL_FILE_NAME,
      collectorVisible: true,
      diffPeriod: "weekly",
      rollingWindow: 100,
      rangeStart: null,
      rangeEnd: null,
      filterFormat: "",
      entityFilter: null,
      entityQuery: "",
      visualizations: mergeVisualizationDefaults(),
      uniqueAccessTopSegmentRunner: "wins",
      uniqueAccessTopSegmentCorp: "losses",
      turnTopSegment: "wins",
      winRateSortOrder: "games-desc",
      setGames: (games) =>
        set(() => ({
          games,
          profile: games.length ? detectUserProfile(games) : null,
          filterFormat: "",
          entityFilter: null,
          entityQuery: "",
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
      setRollingWindow: (count) => set({ rollingWindow: count }),
      setFilterFormat: (format) => set({ filterFormat: format }),
      setEntityFilter: (filter) => set({ entityFilter: filter }),
      setEntityQuery: (query) => set({ entityQuery: query }),
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
          uploadError: null,
          activeFileName: INITIAL_FILE_NAME,
          collectorVisible: true,
          rangeStart: null,
          rangeEnd: null,
          filterFormat: "",
          entityFilter: null,
          entityQuery: "",
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
      }),
      merge: (persisted, current) => {
        const stored = persisted as
          | {
              visualizations?: Record<VisualizationKey, boolean>;
              uniqueAccessTopSegmentRunner?: UniqueAccessTopSegment;
              uniqueAccessTopSegmentCorp?: UniqueAccessTopSegment;
              turnTopSegment?: UniqueAccessTopSegment;
              winRateSortOrder?: WinRateSortOrder;
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
        };
      },
    },
  ),
);
