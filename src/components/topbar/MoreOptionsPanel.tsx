import { AdvancedFiltersMenu } from "./AdvancedFiltersMenu";
import { VisualizationsMenu, type VisualizationOption } from "./VisualizationsMenu";
import { GlobalEntityFilter, VisualizationKey } from "../../lib/store";

interface MoreOptionsPanelProps {
  onClose: () => void;
  playerFilters: GlobalEntityFilter[];
  playerQuery: string;
  onPlayerQueryChange: (value: string) => void;
  onPlayerAdd: (filter: GlobalEntityFilter) => void;
  onPlayerRemove: (filter: GlobalEntityFilter) => void;
  onPlayerClear: () => void;
  onPlayerBackspace: () => void;
  playerOptions: GlobalEntityFilter[];
  opponentFilters: GlobalEntityFilter[];
  opponentQuery: string;
  onOpponentQueryChange: (value: string) => void;
  onOpponentAdd: (filter: GlobalEntityFilter) => void;
  onOpponentRemove: (filter: GlobalEntityFilter) => void;
  onOpponentClear: () => void;
  onOpponentBackspace: () => void;
  opponentOptions: GlobalEntityFilter[];
  visualizations: Record<VisualizationKey, boolean>;
  visualizationOptions: VisualizationOption[];
  onVisualizationToggle: (key: VisualizationKey, checked: boolean) => void;
}

export function MoreOptionsPanel({
  onClose,
  playerFilters,
  playerQuery,
  onPlayerQueryChange,
  onPlayerAdd,
  onPlayerRemove,
  onPlayerClear,
  onPlayerBackspace,
  playerOptions,
  opponentFilters,
  opponentQuery,
  onOpponentQueryChange,
  onOpponentAdd,
  onOpponentRemove,
  onOpponentClear,
  onOpponentBackspace,
  opponentOptions,
  visualizations,
  visualizationOptions,
  onVisualizationToggle,
}: MoreOptionsPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">More options</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 transition hover:text-white"
        >
          Done
        </button>
      </div>
      <div className="mt-4 space-y-5">
        <AdvancedFiltersMenu
          playerFilters={playerFilters}
          playerOptions={playerOptions}
          playerQuery={playerQuery}
          onPlayerQueryChange={onPlayerQueryChange}
          onPlayerAdd={onPlayerAdd}
          onPlayerRemove={onPlayerRemove}
          onPlayerClear={onPlayerClear}
          onPlayerBackspace={onPlayerBackspace}
          opponentFilters={opponentFilters}
          opponentOptions={opponentOptions}
          opponentQuery={opponentQuery}
          onOpponentQueryChange={onOpponentQueryChange}
          onOpponentAdd={onOpponentAdd}
          onOpponentRemove={onOpponentRemove}
          onOpponentClear={onOpponentClear}
          onOpponentBackspace={onOpponentBackspace}
        />
        <VisualizationsMenu
          options={visualizationOptions}
          visualizations={visualizations}
          onToggle={onVisualizationToggle}
        />
      </div>
    </div>
  );
}
