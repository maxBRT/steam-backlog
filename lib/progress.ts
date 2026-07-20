import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardColumn } from "./board.ts";
import type { TriageStatus } from "./triage.ts";
import type { GameAchievements } from "./steam/achievements.ts";

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

export type ProgressRefreshEligibilityInput = {
  progressTracking: boolean;
  progressFetchedAt: string | null;
  storedPlaytimeForever: number;
  storedLastPlayedAt: string | null;
  newPlaytimeForever: number;
  newLastPlayedAt: string | null;
};

/** Whether Library sync should fetch achievements for this tracked entry. */
export function isProgressRefreshEligible(
  input: ProgressRefreshEligibilityInput,
): boolean {
  if (!input.progressTracking) return false;
  if (input.progressFetchedAt === null) return true;
  if (input.storedPlaytimeForever !== input.newPlaytimeForever) return true;
  if (input.storedLastPlayedAt !== input.newLastPlayedAt) return true;
  return false;
}

export type ProgressSummary = {
  unlocked: number | null;
  total: number | null;
};

/** Derive Progress from unlocks; empty set is unknown (no fake 0%). */
export function progressSummaryFromUnlocks(
  unlocks: ReadonlyArray<{ unlocked: boolean }>,
): ProgressSummary {
  if (unlocks.length === 0) {
    return { unlocked: null, total: null };
  }
  return {
    unlocked: unlocks.filter((u) => u.unlocked).length,
    total: unlocks.length,
  };
}

export type PersistProgressRefreshInput = {
  libraryEntryId: number;
  gameId: number;
  achievements: GameAchievements;
  fetchedAt?: string;
};

/** Persist Achievement catalog, unlocks, and Progress summary after a successful refresh. */
export async function persistProgressRefresh(
  supabase: SupabaseClient,
  input: PersistProgressRefreshInput,
): Promise<void> {
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  const { definitions, unlocks } = input.achievements;
  const summary = progressSummaryFromUnlocks(unlocks);

  if (definitions.length > 0) {
    const { data: catalog, error: catalogError } = await supabase
      .from("achievements")
      .upsert(
        definitions.map((d) => ({
          game_id: input.gameId,
          api_name: d.apiName,
          display_name: d.displayName,
          description: d.description,
          icon_url: d.iconUrl,
          icon_gray_url: d.iconGrayUrl,
          hidden: d.hidden,
        })),
        { onConflict: "game_id,api_name" },
      )
      .select("id, api_name, game_id");
    if (catalogError) throw new Error(catalogError.message);

    const apiNameToId = new Map<string, number>();
    for (const row of catalog ?? []) {
      apiNameToId.set(row.api_name as string, row.id as number);
    }

    const unlockRows = unlocks
      .map((u) => {
        const achievementId = apiNameToId.get(u.apiName);
        if (achievementId === undefined) return null;
        return {
          steam_profile_game_id: input.libraryEntryId,
          achievement_id: achievementId,
          unlocked: u.unlocked,
          unlocked_at: u.unlockedAt?.toISOString() ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (unlockRows.length > 0) {
      const { error: unlockError } = await supabase
        .from("achievement_unlocks")
        .upsert(unlockRows, {
          onConflict: "steam_profile_game_id,achievement_id",
        });
      if (unlockError) throw new Error(unlockError.message);
    }
  }

  const { error: entryError } = await supabase
    .from("steam_profile_games")
    .update({
      progress_unlocked: summary.unlocked,
      progress_total: summary.total,
      progress_fetched_at: fetchedAt,
    })
    .eq("id", input.libraryEntryId);
  if (entryError) throw new Error(entryError.message);
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
