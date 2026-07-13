"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  BookmarkPlus,
  CheckCircle2,
  Clock3,
  EyeOff,
  ExternalLink,
  Gamepad2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  sortTriageQueue,
  type TriageAction,
  type TriageDecision,
  type TriageGame,
  type TriageSnapshot,
} from "@/lib/triage";

const HINTS_KEY = "steamlog:triage-hints-seen";
const EXIT_DELAY_MS = 220;

const ACTIONS: Array<{
  status: TriageDecision;
  key: string;
  label: string;
  Icon: typeof EyeOff;
  className: string;
}> = [
  {
    status: "hidden",
    key: "H",
    label: "Hide",
    Icon: EyeOff,
    className:
      "border-zinc-300 bg-white/80 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800",
  },
  {
    status: "maybe",
    key: "M",
    label: "Maybe",
    Icon: Clock3,
    className:
      "border-amber-300 bg-amber-50/90 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100 dark:hover:bg-amber-900",
  },
  {
    status: "backlog",
    key: "B",
    label: "Backlog",
    Icon: BookmarkPlus,
    className:
      "border-emerald-300 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-100 dark:hover:bg-emerald-900",
  },
  {
    status: "done",
    key: "D",
    label: "Done",
    Icon: CheckCircle2,
    className:
      "border-sky-300 bg-sky-50/90 text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/80 dark:text-sky-100 dark:hover:bg-sky-900",
  },
];

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function subscribeToHints(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("triage-hints", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("triage-hints", callback);
  };
}

function getHintsSnapshot() {
  return localStorage.getItem(HINTS_KEY) !== "true";
}

async function persist(entryId: number, status: TriageAction) {
  const response = await fetch("/api/triage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryId, status }),
  });
  const body = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "That choice could not be saved. Try again.");
  }
}

function playtimeLabel(minutes: number) {
  if (minutes === 0) return "No playtime";
  if (minutes < 60) return `${minutes} min played`;

  const hours = minutes / 60;
  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: hours < 10 ? 1 : 0,
  }).format(hours)} hr played`;
}

function lastPlayedLabel(value: string | null) {
  if (!value) return "Never played";
  return `Last played ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))}`;
}

function EmptyState({
  linked,
  hasLibrary,
  maybeCount,
  onReviewMaybe,
}: {
  linked: boolean;
  hasLibrary: boolean;
  maybeCount: number;
  onReviewMaybe: () => void;
}) {
  const title = !linked
    ? "Bring your Steam library along"
    : hasLibrary
      ? "You’re caught up for now"
      : "Your library is ready for a refresh";
  const copy = !linked
    ? "Connect Steam first, then come back whenever you feel like sorting a few games."
    : hasLibrary
      ? "Nothing else needs a decision. Your games will be here when you want another pass."
      : "Sync your games in Settings and they’ll appear here, one at a time.";
  const href = hasLibrary ? "/kanban" : "/settings";
  const action = hasLibrary ? "Go to Board" : "Open Settings";

  return (
    <section className="relative z-10 mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-white/60 bg-white/80 px-8 py-14 text-center shadow-2xl shadow-zinc-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/75">
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg dark:bg-white dark:text-zinc-950">
        <Gamepad2 className="size-7" />
      </span>
      <h1 className="font-[family-name:var(--font-wordmark)] text-3xl font-bold tracking-tight">
        {title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {copy}
      </p>
      {linked && maybeCount > 0 ? (
        <div className="mt-7 w-full rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/50">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Ready for another look?
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-10 w-full rounded-xl border-amber-300 bg-white/70 text-amber-950 dark:border-amber-800 dark:bg-black/20 dark:text-amber-100"
            onClick={onReviewMaybe}
          >
            <Clock3 />
            Review Maybe Games ({maybeCount})
          </Button>
        </div>
      ) : null}
      <Link
        href={href}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {action}
      </Link>
    </section>
  );
}

export function TriageDeck({
  initialSnapshot,
  linked,
}: {
  initialSnapshot: TriageSnapshot;
  linked: boolean;
}) {
  const [queue, setQueue] = useState(initialSnapshot.queue);
  const [maybeGames, setMaybeGames] = useState(initialSnapshot.maybeQueue);
  const [reviewingMaybe, setReviewingMaybe] = useState(false);
  const [reviewed, setReviewed] = useState(initialSnapshot.reviewed);
  const [pending, setPending] = useState(false);
  const [leaving, setLeaving] = useState<TriageDecision | null>(null);
  const [lastAction, setLastAction] = useState<{
    game: TriageGame;
    previousStatus: "unreviewed" | "maybe";
    decision: TriageDecision;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const showHints = useSyncExternalStore(
    subscribeToHints,
    getHintsSnapshot,
    () => false,
  );
  const current = queue[0];
  const next = queue[1];

  const decide = useCallback(
    async (status: TriageDecision) => {
      if (!current || pending || showHints) return;

      const previousStatus = reviewingMaybe ? "maybe" : "unreviewed";
      setPending(true);
      setError(null);
      setLeaving(status);
      const request = persist(current.id, status)
        .then(() => null)
        .catch((reason: unknown) => reason);

      await wait(EXIT_DELAY_MS);
      setQueue((games) => games.slice(1));
      if (previousStatus === "unreviewed") {
        setReviewed((count) => count + 1);
      }
      setLeaving(null);

      const reason = await request;
      if (!reason) {
        if (previousStatus === "unreviewed" && status === "maybe") {
          setMaybeGames((games) => sortTriageQueue([...games, current]));
        } else if (previousStatus === "maybe" && status !== "maybe") {
          setMaybeGames((games) =>
            games.filter((game) => game.id !== current.id),
          );
        }
        setLastAction({ game: current, previousStatus, decision: status });
      } else {
        setQueue((games) => [current, ...games]);
        if (previousStatus === "unreviewed") {
          setReviewed((count) => count - 1);
        }
        setError(
          reason instanceof Error
            ? reason.message
            : "That choice could not be saved. Try again.",
        );
      }
      setPending(false);
    },
    [current, pending, reviewingMaybe, showHints],
  );

  const undo = useCallback(async () => {
    if (!lastAction || pending || showHints) return;

    setPending(true);
    setError(null);
    try {
      await persist(lastAction.game.id, lastAction.previousStatus);
      setQueue((games) => [lastAction.game, ...games]);
      if (lastAction.previousStatus === "unreviewed") {
        setReviewed((count) => Math.max(0, count - 1));
        if (lastAction.decision === "maybe") {
          setMaybeGames((games) =>
            games.filter((game) => game.id !== lastAction.game.id),
          );
        }
      } else if (lastAction.decision !== "maybe") {
        setMaybeGames((games) =>
          sortTriageQueue([lastAction.game, ...games]),
        );
      }
      setLastAction(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "That choice could not be undone. Try again.",
      );
    } finally {
      setPending(false);
    }
  }, [lastAction, pending, showHints]);

  function beginMaybeReview() {
    setQueue(maybeGames);
    setReviewingMaybe(true);
    setLastAction(null);
    setError(null);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (showHints && event.key === "Escape") {
        localStorage.setItem(HINTS_KEY, "true");
        window.dispatchEvent(new Event("triage-hints"));
        return;
      }

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat ||
        pending ||
        showHints
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      const action = ACTIONS.find(
        ({ key }) => key.toLowerCase() === event.key.toLowerCase(),
      );
      if (action) {
        event.preventDefault();
        void decide(action.status);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [decide, pending, showHints]);

  function dismissHints() {
    localStorage.setItem(HINTS_KEY, "true");
    window.dispatchEvent(new Event("triage-hints"));
  }

  const exitClass =
    leaving === "hidden"
      ? "-translate-x-[120%] -rotate-3 opacity-0"
      : leaving === "maybe"
        ? "translate-y-14 scale-95 opacity-0"
        : leaving === "backlog"
          ? "translate-x-[120%] rotate-3 opacity-0"
          : leaving === "done"
            ? "translate-y-14 scale-95 opacity-0"
            : "";

  return (
    <main className="relative isolate flex min-h-[calc(100vh-72px)] flex-1 overflow-hidden px-4 pb-8 pt-3 sm:px-6 sm:pb-10">
      {current?.headerImageUrl ? (
        <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
          {/* Steam supplies a stable external CDN URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.headerImageUrl}
            alt=""
            aria-hidden="true"
            className="size-full scale-125 object-cover opacity-20 blur-3xl transition-opacity duration-500 dark:opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/85 to-zinc-100 dark:from-black/65 dark:via-zinc-950/85 dark:to-black" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_10%,rgba(120,113,108,0.18),transparent_55%)]" />
      )}

      <div
        className="mx-auto flex w-full max-w-4xl flex-col"
        inert={showHints ? true : undefined}
      >
        <header className="mb-4 flex min-h-9 items-center justify-between gap-4 px-1">
          <p
            className="text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400"
            aria-live="polite"
          >
            {reviewingMaybe
              ? "Reviewing Maybe games"
              : `${reviewed} / ${initialSnapshot.total} reviewed`}
          </p>
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-full px-3 text-zinc-600 dark:text-zinc-300"
            disabled={!lastAction || pending}
            onClick={() => void undo()}
          >
            <RotateCcw />
            Undo
          </Button>
        </header>

        {!current ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <EmptyState
              linked={linked}
              hasLibrary={initialSnapshot.total > 0}
              maybeCount={maybeGames.length}
              onReviewMaybe={beginMaybeReview}
            />
          </div>
        ) : (
          <section className="flex flex-1 flex-col justify-center">
            <div className="relative mx-auto w-full max-w-3xl">
              {next ? (
                <div
                  aria-hidden="true"
                  className="absolute inset-x-5 top-3 h-full rounded-[2rem] border border-white/50 bg-white/45 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/40"
                />
              ) : null}

              <article
                className={cn(
                  "relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-zinc-950/15 backdrop-blur-xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none dark:border-white/10 dark:bg-zinc-950/90",
                  exitClass,
                )}
              >
                <div className="relative aspect-[460/215] overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                  {current.headerImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.headerImageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 text-zinc-500 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-400">
                      <Gamepad2 className="size-12" />
                    </div>
                  )}
                </div>

                <div className="px-5 py-5 sm:px-7 sm:py-6">
                  <h1 className="text-balance font-[family-name:var(--font-wordmark)] text-2xl font-bold tracking-tight sm:text-4xl">
                    {current.name}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <span>{playtimeLabel(current.playtimeForever)}</span>
                    <span>{lastPlayedLabel(current.lastPlayedAt)}</span>
                  </div>
                  <a
                    href={`https://store.steampowered.com/app/${current.appId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    View on Steam
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              </article>
            </div>

            <div className="mx-auto mt-5 grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-4 sm:gap-3">
              {ACTIONS.map(({ status, key, label, Icon, className }) => (
                <Button
                  key={status}
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-12 justify-between rounded-xl px-4 text-sm shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5 motion-reduce:transform-none",
                    className,
                  )}
                  disabled={pending}
                  onClick={() => void decide(status)}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {label}
                  </span>
                  <kbd className="rounded-md border border-current/20 bg-white/40 px-1.5 py-0.5 font-mono text-[10px] dark:bg-black/20">
                    {key}
                  </kbd>
                </Button>
              ))}
            </div>

            <div className="min-h-9 pt-3 text-center">
              {error ? (
                <p
                  className="text-sm font-medium text-red-700 dark:text-red-300"
                  role="alert"
                >
                  {error}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Pick what feels right. You can always change it later.
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      {showHints && current ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="triage-hints-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-6 shadow-2xl dark:bg-zinc-950">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <Sparkles className="size-5" />
            </span>
            <h2
              id="triage-hints-title"
              className="mt-5 font-[family-name:var(--font-wordmark)] text-2xl font-bold"
            >
              Four keys. No wrong answers.
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Keep a hand on the keyboard or use the buttons. Triage as many or
              as few games as you want.
            </p>
            <div className="mt-5 grid gap-2">
              {ACTIONS.map(({ key, label, Icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl bg-zinc-100 px-3 py-2.5 dark:bg-zinc-900"
                >
                  <kbd className="flex size-8 items-center justify-center rounded-lg border border-zinc-300 bg-white font-mono text-xs font-bold shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    {key}
                  </kbd>
                  <Icon className="size-4 text-zinc-500" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="mt-6 h-11 w-full rounded-xl"
              onClick={dismissHints}
              autoFocus
            >
              Start sorting
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
