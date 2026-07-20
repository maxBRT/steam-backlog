"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

type Props = {
  playingAutoTrack: boolean;
};

export function PlayingAutoTrackControls({ playingAutoTrack }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(playingAutoTrack);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/playing-auto-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playingAutoTrack: next }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) {
        setEnabled(previous);
        setError(body.error ?? "Could not save Playing auto-track.");
        return;
      }
      router.refresh();
    } catch {
      setEnabled(previous);
      setError("Could not save Playing auto-track.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <input
          id="playing-auto-track"
          type="checkbox"
          className="mt-1 size-4 accent-foreground"
          checked={enabled}
          disabled={pending}
          onChange={(event) => void onChange(event.target.checked)}
        />
        <div className="min-w-0">
          <Label htmlFor="playing-auto-track">Playing auto-track</Label>
          <p className="text-sm text-muted-foreground">
            When on, moving a library entry into Playing turns Progress tracking
            on. Turn Progress tracking off on Game detail anytime; Off sticks
            until the entry leaves and re-enters Playing.
          </p>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
