import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardColumn } from "./board.ts";
import type { TriageStatus } from "./triage.ts";

export const DEFAULT_PLAYING_AUTO_TRACK = true;

export type ProgressTrackingAfterBoardMoveInput = {
  previousColumn: BoardColumn;
  nextColumn: BoardColumn;
  playingAutoTrack: boolean;
  progressTracking: boolean;
};

export function progressTrackingAfterBoardMove(
  input: ProgressTrackingAfterBoardMoveInput,
): boolean {
  const enteredPlaying =
    input.previousColumn !== "playing" && input.nextColumn === "playing";
  if (enteredPlaying && input.playingAutoTrack) {
    return true;
  }
  return input.progressTracking;
}

export type ProgressCacheSnapshot = {
  progressTracking: boolean;
  progressUnlocked: number | null;
  progressTotal: number | null;
  progressFetchedAt: string | null;
};

/** Turns Progress tracking off; omits cache fields so callers keep Progress / unlocks. */
export function progressFieldsWhenRemoved(
  _entry: ProgressCacheSnapshot,
): { progress_tracking: false } {
  return { progress_tracking: false };
}

export function canSetProgressTracking(input: {
  triageStatus: TriageStatus;
  removedAt: string | null;
}): boolean {
  return input.triageStatus === "kept" && input.removedAt === null;
}

export type PlayingAutoTrackMutation = {
  playingAutoTrack: boolean;
};

export function parsePlayingAutoTrackMutation(
  value: unknown,
): PlayingAutoTrackMutation | null {
  if (!value || typeof value !== "object") return null;
  const { playingAutoTrack } = value as Record<string, unknown>;
  if (typeof playingAutoTrack !== "boolean") return null;
  return { playingAutoTrack };
}

export async function updatePlayingAutoTrack(
  supabase: SupabaseClient,
  steamProfileId: string,
  playingAutoTrack: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("steam_profiles")
    .update({ playing_auto_track: playingAutoTrack })
    .eq("id", steamProfileId);
  if (error) {
    throw new Error(`Could not save Playing auto-track: ${error.message}`);
  }
}
