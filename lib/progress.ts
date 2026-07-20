import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardColumn } from "./board.ts";
import type { TriageStatus } from "./triage.ts";
import {
  AchievementsUnavailableError,
  fetchAchievementsForGame,
  type GameAchievements,
} from "./steam/achievements.ts";

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

export type BoardProgressBar = {
  unlocked: number;
  total: number;
};

/** Board bar fields only when Progress tracking is on and Progress is known. */
export function boardProgressBar(input: {
  progressTracking: boolean;
  progressUnlocked: number | null;
  progressTotal: number | null;
}): BoardProgressBar | null {
  if (!input.progressTracking) return null;
  if (input.progressUnlocked === null || input.progressTotal === null) {
    return null;
  }
  return {
    unlocked: input.progressUnlocked,
    total: input.progressTotal,
  };
}

export type GameDetailAchievementUnlock = {
  apiName: string;
  displayName: string;
  description: string;
  iconUrl: string;
  iconGrayUrl: string;
  hidden: boolean;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type GameDetailAchievementsStatus =
  | "unknown"
  | "empty"
  | "ready"
  | "error";

export type GameDetailEntry = {
  id: number;
  appId: number;
  name: string;
  headerImageUrl: string;
  iconImageUrl: string;
  progressTracking: boolean;
  progressUnlocked: number | null;
  progressTotal: number | null;
  progressFetchedAt: string | null;
};

export type GameDetailSnapshot = {
  id: number;
  appId: number;
  name: string;
  headerImageUrl: string;
  iconImageUrl: string;
  progressTracking: boolean;
  progress: BoardProgressBar | null;
  achievements: GameDetailAchievementUnlock[];
  achievementsStatus: GameDetailAchievementsStatus;
  achievementsError: string | null;
};

export function buildGameDetailSnapshot(input: {
  entry: GameDetailEntry;
  achievements: GameDetailAchievementUnlock[];
  achievementsError?: string | null;
}): GameDetailSnapshot {
  const { entry, achievements } = input;
  const achievementsError = input.achievementsError ?? null;

  let achievementsStatus: GameDetailAchievementsStatus;
  if (achievementsError) {
    achievementsStatus = "error";
  } else if (entry.progressFetchedAt === null) {
    achievementsStatus = "unknown";
  } else if (achievements.length === 0) {
    achievementsStatus = "empty";
  } else {
    achievementsStatus = "ready";
  }

  return {
    id: entry.id,
    appId: entry.appId,
    name: entry.name,
    headerImageUrl: entry.headerImageUrl,
    iconImageUrl: entry.iconImageUrl,
    progressTracking: entry.progressTracking,
    progress: boardProgressBar({
      progressTracking: entry.progressTracking,
      progressUnlocked: entry.progressUnlocked,
      progressTotal: entry.progressTotal,
    }),
    achievements,
    achievementsStatus,
    achievementsError,
  };
}

type GameDetailGameRow = {
  app_id: number;
  name: string;
  header_image_url: string;
  icon_image_url: string;
};

type GameDetailDbRow = {
  id: number;
  progress_tracking: boolean;
  progress_unlocked: number | null;
  progress_total: number | null;
  progress_fetched_at: string | null;
  games: GameDetailGameRow | GameDetailGameRow[];
};

type AchievementUnlockDbRow = {
  unlocked: boolean;
  unlocked_at: string | null;
  achievements:
    | {
        api_name: string;
        display_name: string;
        description: string;
        icon_url: string;
        icon_gray_url: string;
        hidden: boolean;
      }
    | Array<{
        api_name: string;
        display_name: string;
        description: string;
        icon_url: string;
        icon_gray_url: string;
        hidden: boolean;
      }>;
};

function gameDetailEntryFromRow(row: GameDetailDbRow): GameDetailEntry {
  const game = Array.isArray(row.games) ? row.games[0] : row.games;
  if (!game) throw new Error(`Library entry ${row.id} has no game`);
  return {
    id: row.id,
    appId: game.app_id,
    name: game.name,
    headerImageUrl: game.header_image_url,
    iconImageUrl: game.icon_image_url,
    progressTracking: row.progress_tracking,
    progressUnlocked: row.progress_unlocked,
    progressTotal: row.progress_total,
    progressFetchedAt: row.progress_fetched_at,
  };
}

function achievementUnlockFromRow(
  row: AchievementUnlockDbRow,
): GameDetailAchievementUnlock {
  const achievement = Array.isArray(row.achievements)
    ? row.achievements[0]
    : row.achievements;
  if (!achievement) {
    throw new Error("Achievement unlock is missing catalog data");
  }
  return {
    apiName: achievement.api_name,
    displayName: achievement.display_name,
    description: achievement.description,
    iconUrl: achievement.icon_url,
    iconGrayUrl: achievement.icon_gray_url,
    hidden: achievement.hidden,
    unlocked: row.unlocked,
    unlockedAt: row.unlocked_at,
  };
}

/** Load Game detail for one library entry scoped to the current steam profile. */
export async function loadGameDetail(
  supabase: SupabaseClient,
  steamProfileId: string,
  entryId: number,
): Promise<GameDetailSnapshot | null> {
  const { data, error } = await supabase
    .from("steam_profile_games")
    .select(
      "id, progress_tracking, progress_unlocked, progress_total, progress_fetched_at, games!inner(app_id, name, header_image_url, icon_image_url)",
    )
    .eq("steam_profile_id", steamProfileId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) throw new Error(`Could not load Game detail: ${error.message}`);
  if (!data) return null;

  const entry = gameDetailEntryFromRow(data as unknown as GameDetailDbRow);

  const { data: unlockRows, error: unlockError } = await supabase
    .from("achievement_unlocks")
    .select(
      "unlocked, unlocked_at, achievements!inner(api_name, display_name, description, icon_url, icon_gray_url, hidden)",
    )
    .eq("steam_profile_game_id", entryId);

  if (unlockError) {
    throw new Error(`Could not load achievement unlocks: ${unlockError.message}`);
  }

  const achievements = ((unlockRows ?? []) as unknown as AchievementUnlockDbRow[]).map(
    achievementUnlockFromRow,
  );

  return buildGameDetailSnapshot({ entry, achievements });
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

export type ProgressTrackingMutation = {
  progressTracking: boolean;
};

export function parseProgressTrackingMutation(
  value: unknown,
): ProgressTrackingMutation | null {
  if (!value || typeof value !== "object") return null;
  const { progressTracking } = value as Record<string, unknown>;
  if (typeof progressTracking !== "boolean") return null;
  return { progressTracking };
}

export type SetProgressTrackingDeps = {
  fetchAchievementsForGame?: typeof fetchAchievementsForGame;
};

type ProgressTrackingEntryRow = GameDetailDbRow & {
  game_id: number;
  triage_status: TriageStatus;
  removed_at: string | null;
};

/** Toggle Progress tracking; first fetch when turning on and Progress is unknown. */
export async function setProgressTracking(
  supabase: SupabaseClient,
  steamProfileId: string,
  entryId: number,
  progressTracking: boolean,
  deps: SetProgressTrackingDeps = {},
): Promise<{ snapshot: GameDetailSnapshot }> {
  const fetchAchievements =
    deps.fetchAchievementsForGame ?? fetchAchievementsForGame;

  const { data, error } = await supabase
    .from("steam_profile_games")
    .select(
      "id, game_id, triage_status, removed_at, progress_tracking, progress_unlocked, progress_total, progress_fetched_at, games!inner(app_id, name, header_image_url, icon_image_url)",
    )
    .eq("steam_profile_id", steamProfileId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load library entry: ${error.message}`);
  }
  if (!data) {
    throw new Error("Library entry not found");
  }

  const row = data as unknown as ProgressTrackingEntryRow;
  if (
    !canSetProgressTracking({
      triageStatus: row.triage_status,
      removedAt: row.removed_at,
    })
  ) {
    throw new Error("Progress tracking is only available for kept library entries");
  }

  const needsFirstFetch =
    progressTracking && row.progress_fetched_at === null;

  const { error: updateError } = await supabase
    .from("steam_profile_games")
    .update({ progress_tracking: progressTracking })
    .eq("id", entryId);
  if (updateError) {
    throw new Error(`Could not update Progress tracking: ${updateError.message}`);
  }

  if (needsFirstFetch) {
    const { data: profile, error: profileError } = await supabase
      .from("steam_profiles")
      .select("steam_id")
      .eq("id", steamProfileId)
      .maybeSingle();
    if (profileError) {
      throw new Error(`Could not load steam profile: ${profileError.message}`);
    }
    if (!profile?.steam_id || typeof profile.steam_id !== "string") {
      throw new Error("Steam is not linked");
    }

    const game = Array.isArray(row.games) ? row.games[0] : row.games;
    if (!game) throw new Error(`Library entry ${entryId} has no game`);

    try {
      const achievements = await fetchAchievements(
        BigInt(profile.steam_id),
        game.app_id,
      );
      await persistProgressRefresh(supabase, {
        libraryEntryId: entryId,
        gameId: row.game_id,
        achievements,
      });
    } catch (err) {
      if (err instanceof AchievementsUnavailableError) {
        const snapshot = await loadGameDetail(supabase, steamProfileId, entryId);
        if (!snapshot) throw new Error("Library entry not found");
        return {
          snapshot: {
            ...snapshot,
            achievementsStatus: "error",
            achievementsError: err.message,
          },
        };
      }
      throw err;
    }
  }

  const snapshot = await loadGameDetail(supabase, steamProfileId, entryId);
  if (!snapshot) throw new Error("Library entry not found");
  return { snapshot };
}
