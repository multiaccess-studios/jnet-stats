import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildCombinedProfile,
  detectUserProfile,
  parseGameHistoryText,
  type GameRecord,
  type UserProfile,
} from "../lib/dataProcessing";
import { BOOKMARKLET_CODE } from "../lib/staticData";
import { useStatsStore, type LoadedGamePayload, type PlayerSourceSummary } from "../lib/store";

type BrowserName = "chrome" | "firefox" | "safari" | "edge" | "other";

function detectBrowser(): BrowserName {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("chrome")) return "chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "safari";
  if (ua.includes("firefox")) return "firefox";
  return "other";
}

export function HistoryCollector() {
  const games = useStatsStore((state) => state.games);
  const profile = useStatsStore((state) => state.profile);
  const uploadError = useStatsStore((state) => state.uploadError);
  const collectorVisible = useStatsStore((state) => state.collectorVisible);
  const setGames = useStatsStore((state) => state.setGames);
  const setUploadError = useStatsStore((state) => state.setUploadError);
  const setActiveFileName = useStatsStore((state) => state.setActiveFileName);
  const setCollectorVisible = useStatsStore((state) => state.setCollectorVisible);
  const resetRange = useStatsStore((state) => state.resetRange);

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookmarkletFeedback, setBookmarkletFeedback] = useState<string | null>(null);
  const [showBookmarkletCode, setShowBookmarkletCode] = useState(false);
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const [browser, setBrowser] = useState<BrowserName>("other");

  const downloadDelayParam = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("downloadDelay");
  }, []);

  const bookmarkletHref = useMemo(() => {
    if (!BOOKMARKLET_CODE) return "";
    const base = BOOKMARKLET_CODE.trim();
    if (!downloadDelayParam) return `javascript:${base}`;
    const prefix = base.startsWith("(async()=>") ? "javascript:" : "javascript:";
    const injected = base.replace(
      "await e(1500)",
      `await e(${Number(downloadDelayParam) || 1500})`,
    );
    return `${prefix}${injected}`;
  }, [downloadDelayParam]);

  useEffect(() => {
    const link = bookmarkletRef.current;
    if (!link || !bookmarkletHref) return;
    link.setAttribute("href", bookmarkletHref);
    return () => {
      link.setAttribute("href", "#bookmarklet");
    };
  }, [bookmarkletHref]);

  useEffect(() => {
    setBrowser(detectBrowser());
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (isLoading || !files?.length) return;
      const fileArray = Array.from(files);
      try {
        setIsLoading(true);
        setUploadError(null);
        const uploads: ParsedUpload[] = [];
        for (const file of fileArray) {
          const text = await file.text();
          const parsedGames = parseGameHistoryText(text);
          uploads.push({
            fileName: file.name,
            games: parsedGames,
            profile: detectUserProfile(parsedGames),
          });
        }
        const payload = combineUploads(uploads);
        setGames(payload);
        setActiveFileName(
          fileArray.length === 1 ? fileArray[0].name : `${fileArray.length} files selected`,
        );
        setCollectorVisible(false);
        resetRange();
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Unable to read that file.");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, resetRange, setActiveFileName, setCollectorVisible, setGames, setUploadError],
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsDragging(false);
    handleFiles(event.dataTransfer?.files ?? null);
  };

  const onDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsDragging(false);
  };

  const handleCopyBookmarklet = async () => {
    if (!bookmarkletHref) return;
    try {
      await navigator.clipboard.writeText(bookmarkletHref);
      setBookmarkletFeedback("Copied bookmarklet code to your clipboard.");
    } catch {
      setBookmarkletFeedback("Copy failed. Select the code snippet below and copy it manually.");
    }
  };

  const unmatchedGames = profile?.unmatchedGames ?? 0;
  const hasData = games.length > 0;
  const showCollector = !hasData || collectorVisible;

  if (!showCollector) return null;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Collect your history</h2>
            </div>
            {hasData && (
              <button
                type="button"
                onClick={() => setCollectorVisible(false)}
                className="text-xs text-slate-400 transition hover:text-white"
              >
                Close
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Step 0</p>
              <p className="text-sm text-slate-200">
                Make sure your bookmarks bar is showing so you can drop the helper into it.
              </p>
              <p className="text-xs text-slate-300">
                {browser === "chrome" && (
                  <>
                    Chrome: Menu &rarr; Bookmarks &rarr; Show bookmarks bar (or Ctrl+Shift+B /
                    Cmd+Shift+B).
                  </>
                )}
                {browser === "firefox" && (
                  <>
                    Firefox: Right-click the top area &rarr; Bookmarks Toolbar &rarr; Always Show.
                  </>
                )}
                {browser === "safari" && (
                  <>Safari: View &rarr; Show Favorites Bar (or Shift+Cmd+B).</>
                )}
                {browser === "edge" && (
                  <>Edge: Menu &rarr; Favorites &rarr; Show favorites bar &rarr; Always.</>
                )}
                {browser === "other" &&
                  "Show your browser's bookmarks bar so you can drag a button into it."}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Step 1</p>
              <p className="text-sm text-slate-200">
                Drag the helper button to your bookmarks bar.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  ref={bookmarkletRef}
                  href="#bookmarklet"
                  onClick={(event) => event.preventDefault()}
                  className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                  draggable
                >
                  Download JNET stats
                </a>
                <button
                  type="button"
                  onClick={() => setShowBookmarkletCode((current) => !current)}
                  className="inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
                >
                  {showBookmarkletCode ? "Hide bookmarklet code" : "Show the code instead"}
                </button>
              </div>
              {showBookmarkletCode && (
                <div className="mt-3 space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopyBookmarklet}
                      className="inline-flex items-center rounded border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-white"
                    >
                      Copy code to clipboard
                    </button>
                    {bookmarkletFeedback && (
                      <p className="text-xs text-emerald-300">{bookmarkletFeedback}</p>
                    )}
                  </div>
                  <pre className="max-h-48 w-full overflow-auto rounded-lg border border-slate-800 bg-slate-950/90 p-4 text-xs text-slate-300 break-all whitespace-pre-wrap">
                    {bookmarkletHref || "Bookmarklet code loading."}
                  </pre>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Step 2</p>
              <p className="text-sm text-slate-200">
                Log in to{" "}
                <a
                  href="https://jinteki.net"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 underline"
                >
                  jinteki.net
                </a>{" "}
                and click the bookmark. Leave the tab open while it gathers your games.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Step 3</p>
              <p className="text-sm text-slate-200">
                When your browser offers to download{" "}
                <code className="rounded bg-slate-900/70 px-1">game_history.json</code>, choose
                <strong className="ml-1 text-slate-100">Save</strong>.
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-6 lg:flex lg:flex-col">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Step 4</p>
            <h3 className="text-xl font-semibold text-white">Drop the file here</h3>
          </div>
          <label
            htmlFor="history-upload"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex min-h-[200px] flex-grow flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
              isLoading
                ? "cursor-not-allowed border-slate-800 bg-slate-900/50 opacity-60"
                : isDragging
                  ? "cursor-pointer border-emerald-400 bg-emerald-500/10"
                  : "cursor-pointer border-slate-700 hover-border-emerald-400"
            }`}
          >
            <input
              id="history-upload"
              type="file"
              accept=".json"
              multiple
              className="hidden"
              disabled={isLoading}
              onChange={onFileChange}
            />
            <p className="text-sm font-semibold text-white">
              {isLoading ? (
                <>Loading game_history.json&hellip;</>
              ) : (
                <>Drop one or more game_history.json files or click to choose</>
              )}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {isLoading
                ? "Hang tight while we process your file."
                : "We only read the file in your browser, nothing gets uploaded."}
            </p>
          </label>
          {uploadError && <p className="text-sm text-rose-300">Upload error: {uploadError}</p>}
          {profile && unmatchedGames > 0 && (
            <p className="text-xs text-amber-300">
              {unmatchedGames.toLocaleString()} games did not include{" "}
              {profile.usernames.join(" / ")} as runner or corp. They were ignored for accuracy.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

type ParsedUpload = {
  fileName: string;
  games: GameRecord[];
  profile: UserProfile | null;
};

function combineUploads(uploads: ParsedUpload[]): LoadedGamePayload {
  const games = mergeGamesWithoutDuplicates(uploads);
  const sources: PlayerSourceSummary[] = uploads.map((upload) => ({
    name: upload.profile?.username ?? null,
    fileName: upload.fileName,
    totalGames: upload.games.length,
  }));
  const aliasCandidates = sources
    .map((source) => source.name)
    .filter((name): name is string => !!name);
  const primaryUpload = uploads.reduce<ParsedUpload | null>((best, current) => {
    if (!best || current.games.length > best.games.length) return current;
    return best;
  }, null);
  const primaryName = primaryUpload?.profile?.username ?? aliasCandidates[0] ?? null;
  const aliasList = primaryName
    ? [primaryName, ...aliasCandidates.filter((name) => name !== primaryName)]
    : aliasCandidates;
  const profile =
    aliasList.length > 0
      ? buildCombinedProfile(games, Array.from(new Set(aliasList)), primaryName)
      : null;
  return { games, profile, sources };
}

function mergeGamesWithoutDuplicates(uploads: ParsedUpload[]): GameRecord[] {
  const deduped = new Map<string, GameRecord>();
  let fallback = 0;
  for (const upload of uploads) {
    for (const game of upload.games) {
      const key =
        game.gameId ??
        `${game.runner.username ?? "runner"}-${game.corp.username ?? "corp"}-${
          game.completedAt?.toISOString() ?? "unknown"
        }-${fallback++}`;
      if (deduped.has(key)) continue;
      deduped.set(key, game);
    }
  }
  return Array.from(deduped.values());
}
