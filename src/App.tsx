import { useCallback, useEffect } from "react";
import "./index.css";
import { DifferentialSection } from "./components/DifferentialSection";
import { HistoryCollector } from "./components/HistoryCollector";
import { IdentityPerformanceSection } from "./components/IdentityPerformanceSection";
import { RollingWinRateSection } from "./components/RollingWinRateSection";
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
        <IdentityPerformanceSection />
      </div>
    </div>
  );
}
