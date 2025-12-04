import { Range, getTrackBackground } from "react-range";
import { useMemo } from "react";

interface DateRangeSliderProps {
  minDate?: Date | null;
  maxDate?: Date | null;
  onChange: (nextStart: Date | null, nextEnd: Date | null) => void;
  onReset?: () => void;
  valueStart: Date | null;
  valueEnd: Date | null;
}

const JNET_START = new Date("2017-11-17T00:00:00.000Z");
const STEP = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

export function DateRangeSlider({
  minDate,
  maxDate,
  onChange,
  onReset,
  valueStart,
  valueEnd,
}: DateRangeSliderProps) {
  const bounds = useMemo(() => {
    const minBase = minDate
      ? Math.max(minDate.getTime(), JNET_START.getTime())
      : JNET_START.getTime();
    const maxBase = maxDate ? maxDate.getTime() : Date.now();
    const min = new Date(minBase);
    const max = new Date(Math.max(minBase, maxBase));
    return { min, max };
  }, [maxDate, minDate]);

  const daySpan = Math.round((bounds.max.getTime() - bounds.min.getTime()) / DAY_MS);
  const sliderMax = Math.max(1, daySpan);

  const sliderStart = valueStart
    ? clamp(Math.floor((valueStart.getTime() - bounds.min.getTime()) / DAY_MS), 0, sliderMax)
    : 0;
  const sliderEnd = valueEnd
    ? clamp(Math.floor((valueEnd.getTime() - bounds.min.getTime()) / DAY_MS), 0, sliderMax)
    : sliderMax;

  const values: [number, number] = [sliderStart, sliderEnd];

  const handleChange = (next: number[]) => {
    const [rawStart, rawEnd] = next;
    const startDate = dateFromOffset(bounds.min, rawStart, bounds.max);
    const endDate = dateFromOffset(bounds.min, rawEnd, bounds.max);
    onChange(startDate, endDate);
  };

  const atMin = !valueStart || valueStart.getTime() <= bounds.min.getTime();
  const atMax = !valueEnd || valueEnd.getTime() >= bounds.max.getTime();
  const isFullRange = atMin && atMax;
  const showReset = typeof onReset === "function" && !isFullRange;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center text-xs text-slate-400">
        <span className="flex-none">{formatDateLabel(bounds.min)}</span>
        <div className="flex-1 text-center">
          {showReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] font-semibold text-emerald-300 underline-offset-2 hover:text-emerald-200 hover:underline"
            >
              Clear range
            </button>
          )}
        </div>
        <span className="flex-none text-right">{formatDateLabel(bounds.max)}</span>
      </div>
      <Range
        values={values}
        min={0}
        max={sliderMax}
        step={STEP}
        onChange={handleChange}
        renderTrack={({ props, children }) => {
          const { key, ...rest } = props;
          return (
            <div key={key} {...rest} className="w-full" style={{ ...rest.style }}>
              <div className="relative h-2 w-full rounded-full bg-slate-800">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: getTrackBackground({
                      values,
                      colors: ["transparent", "#34d399", "transparent"],
                      min: 0,
                      max: sliderMax,
                    }),
                  }}
                />
              </div>
              {children}
            </div>
          );
        }}
        renderThumb={({ props, index }) => {
          const { key, ...rest } = props;
          return (
            <div
              key={key}
              {...rest}
              className="group relative h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-white shadow outline-none"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-100 opacity-0 transition group-hover:opacity-100 whitespace-nowrap">
                {index === 0
                  ? formatDateLabel(valueStart ?? bounds.min)
                  : formatDateLabel(valueEnd ?? bounds.max)}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

function dateFromOffset(start: Date, offset: number, max: Date) {
  const next = new Date(start.getTime() + offset * DAY_MS);
  return next.getTime() > max.getTime() ? new Date(max) : next;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
