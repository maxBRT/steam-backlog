"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ERROR_COPY: Record<string, string> = {
  private: "Your Steam game library is private. Make it public and try again.",
  hidden: "Steam hid your game details. Check privacy settings and try again.",
  failed: "Library sync failed. Try again.",
  not_linked: "Link your Steam account first.",
  unauthorized: "Sign in again to sync your library.",
};

type Props = {
  syncStatus: "idle" | "syncing" | "failed";
  lastSyncedAt: string | null;
};

export function LibrarySyncControls({ syncStatus, lastSyncedAt }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = pending || syncStatus === "syncing";

  async function refresh() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/steam/sync", { method: "POST" });
      const body = (await res.json()) as {
        ok: boolean;
        error?: string;
        detail?: string;
        skipped?: boolean;
      };
      if (!body.ok && body.error) {
        setError(
          body.detail
            ? `${ERROR_COPY[body.error] ?? ERROR_COPY.failed} (${body.detail})`
            : (ERROR_COPY[body.error] ?? ERROR_COPY.failed),
        );
      }
    } catch {
      setError(ERROR_COPY.failed);
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  let statusLabel = "Not synced yet";
  if (syncStatus === "syncing" || pending) {
    statusLabel = "Syncing…";
  } else if (syncStatus === "failed") {
    statusLabel = "Last sync failed";
  } else if (lastSyncedAt) {
    statusLabel = `Last synced ${new Date(lastSyncedAt).toLocaleString()}`;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{statusLabel}</p>
      {syncStatus === "failed" && !error ? (
        <p className="text-sm text-destructive" role="alert">
          Library sync failed. Try refreshing.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={busy}
        onClick={refresh}
      >
        {busy ? "Syncing…" : "Refresh library"}
      </Button>
    </div>
  );
}
