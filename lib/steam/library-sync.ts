import type { SupabaseClient } from "@supabase/supabase-js";
import { chunk } from "../utils.ts";
import {
  fetchOwnedGames,
  GameDetailsHiddenError,
  PrivateGamesError,
  type OwnedGame,
} from "./owned-games.ts";

export type SyncError = "not_linked" | "private" | "hidden" | "failed";

export type SyncResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: SyncError; detail?: string };

export type SyncLibraryDeps = {
  fetchOwnedGames?: typeof fetchOwnedGames;
};

const UPSERT_CHUNK = 100;

export function libraryEntryUpsertPayload(
  steamProfileId: string,
  gameId: number,
  game: OwnedGame,
) {
  return {
    steam_profile_id: steamProfileId,
    game_id: gameId,
    playtime_forever: game.playtimeForever,
    playtime_2weeks: game.playtime2Weeks,
    last_played_at: game.lastPlayedAt?.toISOString() ?? null,
    removed_at: null,
  };
}

export function entryIdsToMarkRemoved(
  existing: Array<{ id: number; game_id: number }>,
  ownedGameIds: Set<number>,
): number[] {
  return existing
    .filter((row) => !ownedGameIds.has(row.game_id))
    .map((row) => row.id);
}

/** Steam IDs must stay strings — JS number loses precision past 2^53-1. */
export function parseSteamId(value: unknown): bigint {
  if (typeof value === "number") {
    throw new Error(
      "steam_id arrived as number; store/read it as text to avoid precision loss",
    );
  }
  if (typeof value === "bigint") return value;
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  throw new Error("steam_id missing or invalid");
}

async function setSyncStatus(
  supabase: SupabaseClient,
  steamProfileId: string,
  values: { sync_status: string; last_synced_at?: string },
) {
  const { error } = await supabase
    .from("steam_profiles")
    .update(values)
    .eq("id", steamProfileId);
  if (error) throw new Error(error.message);
}

export async function syncLibrary(
  supabase: SupabaseClient,
  steamProfileId: string,
  deps: SyncLibraryDeps = {},
): Promise<SyncResult> {
  const fetchGames = deps.fetchOwnedGames ?? fetchOwnedGames;

  const { data: profile, error: profileError } = await supabase
    .from("steam_profiles")
    .select("steam_id, sync_status")
    .eq("id", steamProfileId)
    .maybeSingle();

  if (profileError) return { ok: false, error: "failed" };
  if (!profile?.steam_id) return { ok: false, error: "not_linked" };
  if (profile.sync_status === "syncing") return { ok: true, skipped: true };

  try {
    await setSyncStatus(supabase, steamProfileId, { sync_status: "syncing" });

    const owned = await fetchGames(parseSteamId(profile.steam_id));

    const gameRows = owned.map((game) => ({
      app_id: game.appId,
      name: game.name ?? `App ${game.appId}`,
      header_image_url: game.headerImageUrl ?? "",
      icon_image_url: game.iconImageUrl ?? "",
    }));

    const appIdToGameId = new Map<number, number>();

    for (const rows of chunk(gameRows, UPSERT_CHUNK)) {
      if (rows.length === 0) continue;
      const { data, error } = await supabase
        .from("games")
        .upsert(rows, { onConflict: "app_id" })
        .select("id, app_id");
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        appIdToGameId.set(row.app_id as number, row.id as number);
      }
    }

    const entryRows = owned.map((game) => {
      const gameId = appIdToGameId.get(game.appId);
      if (gameId === undefined) {
        throw new Error(`Missing game id for app_id ${game.appId}`);
      }
      return libraryEntryUpsertPayload(steamProfileId, gameId, game);
    });

    for (const rows of chunk(entryRows, UPSERT_CHUNK)) {
      if (rows.length === 0) continue;
      const { error } = await supabase
        .from("steam_profile_games")
        .upsert(rows, { onConflict: "steam_profile_id,game_id" });
      if (error) throw new Error(error.message);
    }

    const { data: existing, error: existingError } = await supabase
      .from("steam_profile_games")
      .select("id, game_id")
      .eq("steam_profile_id", steamProfileId)
      .is("removed_at", null);

    if (existingError) throw new Error(existingError.message);

    const ownedGameIds = new Set(appIdToGameId.values());
    const idsToRemove = entryIdsToMarkRemoved(
      (existing ?? []) as Array<{ id: number; game_id: number }>,
      ownedGameIds,
    );

    if (idsToRemove.length > 0) {
      const { error } = await supabase
        .from("steam_profile_games")
        .update({ removed_at: new Date().toISOString() })
        .in("id", idsToRemove);
      if (error) throw new Error(error.message);
    }

    await setSyncStatus(supabase, steamProfileId, {
      sync_status: "idle",
      last_synced_at: new Date().toISOString(),
    });

    return { ok: true };
  } catch (err) {
    await setSyncStatus(supabase, steamProfileId, {
      sync_status: "failed",
    }).catch(() => {});

    const detail = err instanceof Error ? err.message : String(err);

    if (err instanceof PrivateGamesError) {
      return { ok: false, error: "private", detail };
    }
    if (err instanceof GameDetailsHiddenError) {
      return { ok: false, error: "hidden", detail };
    }
    return { ok: false, error: "failed", detail };
  }
}
