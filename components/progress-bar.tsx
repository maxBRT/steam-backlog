import type { BoardProgressBar } from "@/lib/progress";
import { cn } from "@/lib/utils";

export function ProgressBar({
  progress,
  className,
}: {
  progress: BoardProgressBar;
  className?: string;
}) {
  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((progress.unlocked / progress.total) * 100))
      : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress ${progress.unlocked} of ${progress.total}`}
      >
        <div
          className="h-full rounded-full bg-zinc-800 transition-[width] dark:bg-zinc-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
        {progress.unlocked}/{progress.total}
      </p>
    </div>
  );
}
