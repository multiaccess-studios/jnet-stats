import { useCallback, useEffect } from "react";
import "./index.css";
import { DifferentialSection } from "./components/DifferentialSection";
import { HistoryCollector } from "./components/HistoryCollector";
import { IdentityPerformanceSection } from "./components/IdentityPerformanceSection";
import { RollingWinRateSection } from "./components/RollingWinRateSection";
import { OpponentPerformanceSection } from "./components/OpponentPerformanceSection";
import { UniqueAccessesSection } from "./components/UniqueAccessesSection";
import { CorpAccessesSection } from "./components/CorpAccessesSection";
import { TurnsHistogramSection } from "./components/TurnsHistogramSection";
import { TopBar } from "./components/TopBar";
import { useStatsStore } from "./lib/store";
import { useDataBounds } from "./lib/hooks";

export function App() {
  const rangeStart = useStatsStore((state) => state.rangeStart);
  const rangeEnd = useStatsStore((state) => state.rangeEnd);
  const setRangeStart = useStatsStore((state) => state.setRangeStart);
  const setRangeEnd = useStatsStore((state) => state.setRangeEnd);
  const resetData = useStatsStore((state) => state.resetData);

  const { min: minDate, max: maxDate } = useDataBounds();

  useEffect(() => {
    if (!minDate || !maxDate) {
      if (rangeStart !== null) setRangeStart(null);
      if (rangeEnd !== null) setRangeEnd(null);
      return;
    }
    if (!rangeStart) {
      setRangeStart(minDate);
    }
    if (!rangeEnd) {
      setRangeEnd(maxDate);
    }
  }, [maxDate, minDate, rangeEnd, rangeStart, setRangeEnd, setRangeStart]);

  const handleReplaceFile = useCallback(() => {
    resetData();
  }, [resetData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <TopBar onReplaceFile={handleReplaceFile} />

        <HistoryCollector />

        <DifferentialSection />
        <RollingWinRateSection />
        <UniqueAccessesSection />
        <CorpAccessesSection />
        <TurnsHistogramSection />
        <IdentityPerformanceSection />
        <OpponentPerformanceSection />

        <div className="flex justify-center">
          <a
            href="https://github.com/multiaccess-studios/jnet-stats"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/60 p-3 text-white transition hover:border-emerald-300 hover:text-emerald-300"
            aria-label="View source on GitHub"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.37-3.88-1.37-.53-1.35-1.3-1.71-1.3-1.71-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.21 1.79 1.21 1.04 1.78 2.72 1.27 3.38.97.11-.76.41-1.27.75-1.56-2.55-.29-5.23-1.28-5.23-5.71 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.19.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.5 3.17-1.19 3.17-1.19.64 1.58.24 2.75.12 3.04.74.81 1.19 1.84 1.19 3.1 0 4.45-2.69 5.42-5.26 5.7.42.36.8 1.07.8 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.68.8.56A10.51 10.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
