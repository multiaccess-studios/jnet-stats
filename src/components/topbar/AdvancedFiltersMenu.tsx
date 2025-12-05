import { Combobox } from "@headlessui/react";
import { GlobalEntityFilter } from "../../lib/store";

interface AdvancedFiltersMenuProps {
  playerFilters: GlobalEntityFilter[];
  playerOptions: GlobalEntityFilter[];
  playerQuery: string;
  onPlayerQueryChange: (value: string) => void;
  onPlayerAdd: (filter: GlobalEntityFilter) => void;
  onPlayerRemove: (filter: GlobalEntityFilter) => void;
  onPlayerClear: () => void;
  onPlayerBackspace: () => void;
  opponentFilters: GlobalEntityFilter[];
  opponentOptions: GlobalEntityFilter[];
  opponentQuery: string;
  onOpponentQueryChange: (value: string) => void;
  onOpponentAdd: (filter: GlobalEntityFilter) => void;
  onOpponentRemove: (filter: GlobalEntityFilter) => void;
  onOpponentClear: () => void;
  onOpponentBackspace: () => void;
}

export function AdvancedFiltersMenu({
  playerFilters,
  playerOptions,
  playerQuery,
  onPlayerQueryChange,
  onPlayerAdd,
  onPlayerRemove,
  onPlayerClear,
  onPlayerBackspace,
  opponentFilters,
  opponentOptions,
  opponentQuery,
  onOpponentQueryChange,
  onOpponentAdd,
  onOpponentRemove,
  onOpponentClear,
  onOpponentBackspace,
}: AdvancedFiltersMenuProps) {
  return (
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
                if (option) onPlayerAdd(option);
              }}
              nullable
            >
              <div className="relative">
                <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 pr-10 py-2 text-sm text-white focus-within:border-emerald-500">
                  {playerFilters.map((filter) => (
                    <span
                      key={`advanced-player-${filter.type}-${filter.value}`}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-2 py-1 text-xs font-semibold text-slate-100"
                    >
                      {filter.label}
                      <button
                        type="button"
                        onClick={() => onPlayerRemove(filter)}
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
                    onChange={(event) => onPlayerQueryChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Backspace" &&
                        playerQuery.length === 0 &&
                        playerFilters.length > 0
                      ) {
                        event.preventDefault();
                        onPlayerBackspace();
                      }
                    }}
                    placeholder={
                      playerFilters.length === 0 ? "Add sides / factions / identities" : undefined
                    }
                  />
                </div>
                {playerFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={onPlayerClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 transition hover:text-white"
                  >
                    Clear
                  </button>
                )}
                {playerOptions.length > 0 && (
                  <Combobox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-lg">
                    {playerOptions.map((option) => (
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
                {playerOptions.length === 0 && playerQuery && (
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
                if (option) onOpponentAdd(option);
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
                        onClick={() => onOpponentRemove(filter)}
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
                    onChange={(event) => onOpponentQueryChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Backspace" &&
                        opponentQuery.length === 0 &&
                        opponentFilters.length > 0
                      ) {
                        event.preventDefault();
                        onOpponentBackspace();
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
                    onClick={onOpponentClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 transition hover:text-white"
                  >
                    Clear
                  </button>
                )}
                {opponentOptions.length > 0 && (
                  <Combobox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-lg">
                    {opponentOptions.map((option) => (
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
                {opponentOptions.length === 0 && opponentQuery && (
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
  );
}
