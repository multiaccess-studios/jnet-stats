import { GlobalEntityFilter } from "../../lib/store";

interface AdvancedFiltersSummaryProps {
  playerFilters: GlobalEntityFilter[];
  opponentFilters: GlobalEntityFilter[];
  onPlayerRemove: (filter: GlobalEntityFilter) => void;
  onPlayerClear: () => void;
  onOpponentRemove: (filter: GlobalEntityFilter) => void;
  onOpponentClear: () => void;
}

export function AdvancedFiltersSummary({
  playerFilters,
  opponentFilters,
  onPlayerRemove,
  onPlayerClear,
  onOpponentRemove,
  onOpponentClear,
}: AdvancedFiltersSummaryProps) {
  if (playerFilters.length === 0 && opponentFilters.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-slate-200">
      <div className="flex flex-col gap-2">
        {playerFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.65rem] uppercase tracking-wide text-emerald-300">
              Advanced (You)
            </span>
            {playerFilters.map((filter) => (
              <button
                key={`chip-player-${filter.type}-${filter.value}`}
                type="button"
                onClick={() => onPlayerRemove(filter)}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-slate-900/80 px-2 py-1 text-[0.7rem] font-semibold text-emerald-100 transition hover:border-emerald-400 hover:text-white"
              >
                {filter.label}
                <span aria-hidden="true">&times;</span>
              </button>
            ))}
            <button
              type="button"
              onClick={onPlayerClear}
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
                onClick={() => onOpponentRemove(filter)}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-slate-900/80 px-2 py-1 text-[0.7rem] font-semibold text-emerald-100 transition hover:border-emerald-400 hover:text-white"
              >
                {filter.label}
                <span aria-hidden="true">&times;</span>
              </button>
            ))}
            <button
              type="button"
              onClick={onOpponentClear}
              className="text-[0.7rem] font-semibold text-emerald-200 underline decoration-dotted transition hover:text-white"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
