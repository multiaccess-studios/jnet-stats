import { Combobox } from "@headlessui/react";
import { ReactNode } from "react";
import { DateRangeSlider } from "../DateRangeSlider";
import { formatRangeLabel, type KnownRange } from "../../lib/dataProcessing";
import { GlobalEntityFilter } from "../../lib/store";

export interface RoleCounts {
  total: number;
  runner: number;
  corp: number;
}

export interface FormatOption {
  value: string;
  label: string;
}

interface TopBarPrimarySectionProps {
  profileName: string;
  hasAdditionalAccounts: boolean;
  otherAccountNames: string | null;
  loadedCounts: RoleCounts;
  filteredCounts: RoleCounts;
  onReplaceFile: () => void;
  onToggleSettings: () => void;
  filterFormat: string;
  formatOptions: FormatOption[];
  onFormatChange: (value: string) => void;
  minDate: Date | null;
  maxDate: Date | null;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onRangeReset: () => void;
  onRangeChange: (start: Date | null, end: Date | null) => void;
  entityFilter: GlobalEntityFilter | null;
  entityQuery: string;
  onEntityQueryChange: (value: string) => void;
  onEntitySelect: (filter: GlobalEntityFilter | null) => void;
  simpleEntityOptions: GlobalEntityFilter[];
  advancedPlayerFiltersActive: boolean;
  onEntityClear: () => void;
  knownRanges: KnownRange[];
  onKnownRangeSelect: (range: KnownRange) => void;
  diffRangeInvalid: boolean;
  advancedSummary?: ReactNode;
}

export function TopBarPrimarySection({
  profileName,
  hasAdditionalAccounts,
  otherAccountNames,
  loadedCounts,
  filteredCounts,
  onReplaceFile,
  onToggleSettings,
  filterFormat,
  formatOptions,
  onFormatChange,
  minDate,
  maxDate,
  rangeStart,
  rangeEnd,
  onRangeReset,
  onRangeChange,
  entityFilter,
  entityQuery,
  onEntityQueryChange,
  onEntitySelect,
  simpleEntityOptions,
  advancedPlayerFiltersActive,
  onEntityClear,
  knownRanges,
  onKnownRangeSelect,
  diffRangeInvalid,
  advancedSummary,
}: TopBarPrimarySectionProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 text-xl font-semibold text-white">
          <span title={otherAccountNames ?? undefined}>
            {profileName}
            {hasAdditionalAccounts && <span>+</span>}
          </span>
          <button
            type="button"
            onClick={onReplaceFile}
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
          onClick={onToggleSettings}
          className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-white"
        >
          More Options
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <select
          value={filterFormat}
          onChange={(event) => onFormatChange(event.target.value)}
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
            onReset={onRangeReset}
            onChange={onRangeChange}
          />
        </div>
        <div className="w-full lg:w-72">
          <Combobox
            value={entityFilter}
            onChange={onEntitySelect}
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
                onChange={(event) => onEntityQueryChange(event.target.value)}
                placeholder="All sides / factions / identities"
                disabled={advancedPlayerFiltersActive}
              />
              {advancedPlayerFiltersActive && (
                <div className="absolute inset-0 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-slate-900/80 px-3 text-xs font-semibold text-emerald-300">
                  <span>Advanced filters active</span>
                  <button
                    type="button"
                    onClick={onEntityClear}
                    className="text-xs font-semibold text-emerald-200 underline decoration-dotted transition hover:text-white focus:outline-none"
                  >
                    Clear
                  </button>
                </div>
              )}
              {!advancedPlayerFiltersActive && entityFilter && (
                <button
                  type="button"
                  onClick={onEntityClear}
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

      {advancedSummary}

      {knownRanges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {knownRanges.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => onKnownRangeSelect(range)}
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
    </>
  );
}
