import { create } from "zustand";
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
  resetData: () => void;
}

const INITIAL_FILE_NAME = "No file selected";
export type VisualizationKey = "differential" | "rolling" | "identities";

export const useStatsStore = create<StatsState>()((set) => ({
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
  visualizations: {
    differential: true,
    rolling: true,
    identities: true,
  },
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
}));
