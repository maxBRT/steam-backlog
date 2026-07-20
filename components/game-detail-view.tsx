"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import type { GameDetailSnapshot } from "@/lib/progress";
import { cn } from "@/lib/utils";

export function GameDetailView({
  initialSnapshot,
}: {
  initialSnapshot: GameDetailSnapshot;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onToggleTracking(next: boolean) {
    const previous = snapshot;
    setSnapshot({ ...snapshot, progressTracking: next });
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/progress/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: snapshot.id,
          progressTracking: next,
        }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        error?: string;
        snapshot?: GameDetailSnapshot;
      };
      if (!body.ok || !body.snapshot) {
        setSnapshot(previous);
        setError(body.error ?? "Could not update Progress tracking.");
        return;
      }
      setSnapshot(body.snapshot);
      router.refresh();
    } catch {
      setSnapshot(previous);
      setError("Could not update Progress tracking.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <Link
          href="/kanban"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-4 -ml-2 gap-1.5 text-zinc-600 dark:text-zinc-300",
          )}
        >
          <ArrowLeft className="size-4" />
          Back to Board
        </Link>

        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="relative aspect-[460/215] bg-zinc-200 dark:bg-zinc-800">
            {snapshot.headerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={snapshot.headerImageUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 text-zinc-500 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-400">
                <Gamepad2 className="size-12" />
              </div>
            )}
          </div>
          <div className="space-y-2 p-5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {snapshot.name}
            </h1>
            {snapshot.progress ? (
              <ProgressBar progress={snapshot.progress} className="max-w-xs" />
            ) : null}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Progress tracking
        </h2>
        <div className="flex items-start gap-3">
          <input
            id="progress-tracking"
            type="checkbox"
            className="mt-1 size-4 accent-foreground"
            checked={snapshot.progressTracking}
            disabled={pending}
            onChange={(event) => void onToggleTracking(event.target.checked)}
          />
          <div className="min-w-0">
            <Label htmlFor="progress-tracking">Track Progress</Label>
            <p className="text-sm text-muted-foreground">
              Include this library entry in Progress refresh during Library
              sync.
            </p>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Achievements
        </h2>
        <AchievementsPanel snapshot={snapshot} />
      </section>
    </main>
  );
}

function AchievementsPanel({ snapshot }: { snapshot: GameDetailSnapshot }) {
  switch (snapshot.achievementsStatus) {
    case "error":
      return (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {snapshot.achievementsError ??
            "Steam could not load achievements for this game."}
        </p>
      );
    case "empty":
      return (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white/50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300">
          This game has no Achievements on Steam.
        </p>
      );
    case "unknown":
      return (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white/50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300">
          {snapshot.progressTracking
            ? "Progress has not been fetched yet. Turn Progress tracking off and on, or run Library sync."
            : "Turn on Progress tracking to load achievements."}
        </p>
      );
    case "ready":
      return (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {snapshot.achievements.map((achievement) => (
            <AchievementUnlockRow
              key={achievement.apiName}
              achievement={achievement}
            />
          ))}
        </ul>
      );
  }
}

function AchievementUnlockRow({
  achievement,
}: {
  achievement: GameDetailSnapshot["achievements"][number];
}): ReactNode {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={
          achievement.unlocked
            ? achievement.iconUrl || achievement.iconGrayUrl
            : achievement.iconGrayUrl || achievement.iconUrl
        }
        alt=""
        className={cn(
          "size-10 shrink-0 rounded-md bg-zinc-100 object-cover dark:bg-zinc-900",
          !achievement.unlocked && "opacity-50",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">
          {achievement.displayName || achievement.apiName}
        </p>
        {achievement.description ? (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {achievement.description}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-400">
          {achievement.unlocked ? "Unlocked" : "Locked"}
        </p>
      </div>
    </li>
  );
}
