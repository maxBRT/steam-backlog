import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  entryIdsToMarkRemoved,
  libraryEntryUpsertPayload,
  parseSteamId,
  syncLibrary,
} from "../lib/steam/library-sync.ts";
import {
  GameDetailsHiddenError,
  PrivateGamesError,
  type OwnedGame,
} from "../lib/steam/owned-games.ts";
import { AchievementsUnavailableError } from "../lib/steam/achievements.ts";

describe("library sync helpers", () => {
  it("upsert payload omits triage and board fields", () => {
    const game: OwnedGame = {
      appId: 570,
      name: "Dota 2",
      playtimeForever: 100,
      playtime2Weeks: 10,
      lastPlayedAt: new Date("2026-01-01T00:00:00.000Z"),
      headerImageUrl: "https://example.com/h.jpg",
    };
    const row = libraryEntryUpsertPayload("profile-1", 42, game);
    assert.deepEqual(row, {
      steam_profile_id: "profile-1",
      game_id: 42,
      playtime_forever: 100,
      playtime_2weeks: 10,
      last_played_at: "2026-01-01T00:00:00.000Z",
      removed_at: null,
    });
    assert.equal("triage_status" in row, false);
    assert.equal("board_column" in row, false);
    assert.equal("board_position" in row, false);
    assert.equal("progress_tracking" in row, false);
  });

  it("marks missing owned games for removed_at", () => {
    const ids = entryIdsToMarkRemoved(
      [
        { id: 1, game_id: 10 },
        { id: 2, game_id: 20 },
        { id: 3, game_id: 30 },
      ],
      new Set([10, 30]),
    );
    assert.deepEqual(ids, [2]);
  });

  it("parseSteamId keeps full precision from strings", () => {
    assert.equal(
      parseSteamId("76561198002516729").toString(),
      "76561198002516729",
    );
  });

  it("parseSteamId rejects numbers (precision already lost)", () => {
    assert.throws(() => parseSteamId(76561198002516729), /number/);
  });
});

type Profile = {
  id: string;
  steam_id: string | null;
  sync_status: string;
  last_synced_at: string | null;
};

type Game = {
  id: number;
  app_id: number;
  name: string;
  header_image_url: string;
  icon_image_url: string;
};

type LibraryEntry = {
  id: number;
  steam_profile_id: string;
  game_id: number;
  triage_status: string;
  board_column: string | null;
  board_position: number | null;
  playtime_forever: number;
  playtime_2weeks: number;
  last_played_at: string | null;
  removed_at: string | null;
  progress_tracking: boolean;
  progress_unlocked: number | null;
  progress_total: number | null;
  progress_fetched_at: string | null;
};

type AchievementRow = {
  id: number;
  game_id: number;
  api_name: string;
  display_name: string;
  description: string;
  icon_url: string;
  icon_gray_url: string;
  hidden: boolean;
};

type UnlockRow = {
  id: number;
  steam_profile_game_id: number;
  achievement_id: number;
  unlocked: boolean;
  unlocked_at: string | null;
};

function createMemorySupabase(seed: {
  profile: Profile;
  games?: Game[];
  entries?: LibraryEntry[];
  achievements?: AchievementRow[];
  unlocks?: UnlockRow[];
}) {
  const profiles = new Map<string, Profile>([[seed.profile.id, { ...seed.profile }]]);
  const games = [...(seed.games ?? [])];
  const entries = [...(seed.entries ?? [])];
  const achievements = [...(seed.achievements ?? [])];
  const unlocks = [...(seed.unlocks ?? [])];
  let nextGameId = Math.max(0, ...games.map((g) => g.id)) + 1;
  let nextEntryId = Math.max(0, ...entries.map((e) => e.id)) + 1;
  let nextAchievementId = Math.max(0, ...achievements.map((a) => a.id)) + 1;
  let nextUnlockId = Math.max(0, ...unlocks.map((u) => u.id)) + 1;

  const client = {
    from(table: string) {
      if (table === "steam_profiles") {
        return {
          select() {
            return {
              eq(_col: string, id: string) {
                return {
                  async maybeSingle() {
                    return { data: profiles.get(id) ?? null, error: null };
                  },
                };
              },
            };
          },
          update(values: Partial<Profile>) {
            return {
              async eq(_col: string, id: string) {
                const row = profiles.get(id);
                if (row) Object.assign(row, values);
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "games") {
        return {
          upsert(rows: Array<Omit<Game, "id">>) {
            const list = Array.isArray(rows) ? rows : [rows];
            const upserted: Game[] = [];
            for (const row of list) {
              let existing = games.find((g) => g.app_id === row.app_id);
              if (existing) {
                existing.name = row.name;
                existing.header_image_url = row.header_image_url;
                existing.icon_image_url = row.icon_image_url;
              } else {
                existing = { id: nextGameId++, ...row };
                games.push(existing);
              }
              upserted.push(existing);
            }
            return {
              async select() {
                return { data: upserted.map((g) => ({ id: g.id, app_id: g.app_id })), error: null };
              },
            };
          },
        };
      }

      if (table === "steam_profile_games") {
        return {
          upsert(rows: Array<Partial<LibraryEntry> & { steam_profile_id: string; game_id: number }>) {
            const list = Array.isArray(rows) ? rows : [rows];
            for (const row of list) {
              const existing = entries.find(
                (e) =>
                  e.steam_profile_id === row.steam_profile_id &&
                  e.game_id === row.game_id,
              );
              if (existing) {
                if (row.playtime_forever !== undefined) {
                  existing.playtime_forever = row.playtime_forever;
                }
                if (row.playtime_2weeks !== undefined) {
                  existing.playtime_2weeks = row.playtime_2weeks;
                }
                if (row.last_played_at !== undefined) {
                  existing.last_played_at = row.last_played_at;
                }
                if (row.removed_at !== undefined) {
                  existing.removed_at = row.removed_at;
                }
                if (row.progress_unlocked !== undefined) {
                  existing.progress_unlocked = row.progress_unlocked;
                }
                if (row.progress_total !== undefined) {
                  existing.progress_total = row.progress_total;
                }
                if (row.progress_fetched_at !== undefined) {
                  existing.progress_fetched_at = row.progress_fetched_at;
                }
                // triage/board left alone on purpose
              } else {
                entries.push({
                  id: nextEntryId++,
                  steam_profile_id: row.steam_profile_id,
                  game_id: row.game_id,
                  triage_status: "unreviewed",
                  board_column: null,
                  board_position: null,
                  playtime_forever: row.playtime_forever ?? 0,
                  playtime_2weeks: row.playtime_2weeks ?? 0,
                  last_played_at: row.last_played_at ?? null,
                  removed_at: row.removed_at ?? null,
                  progress_tracking: row.progress_tracking ?? false,
                  progress_unlocked: row.progress_unlocked ?? null,
                  progress_total: row.progress_total ?? null,
                  progress_fetched_at: row.progress_fetched_at ?? null,
                });
              }
            }
            return Promise.resolve({ error: null });
          },
          select() {
            return {
              eq(_col: string, profileId: string) {
                const matching = entries.filter(
                  (e) => e.steam_profile_id === profileId,
                );
                const builder = {
                  async is(col: string, value: null) {
                    const data = matching.filter(
                      (e) => col !== "removed_at" || e.removed_at === value,
                    );
                    return {
                      data: data.map((e) => ({ id: e.id, game_id: e.game_id })),
                      error: null,
                    };
                  },
                  then(
                    resolve: (value: {
                      data: Array<{
                        id: number;
                        game_id: number;
                        progress_tracking: boolean;
                        progress_fetched_at: string | null;
                        playtime_forever: number;
                        last_played_at: string | null;
                      }>;
                      error: null;
                    }) => unknown,
                    reject?: (reason: unknown) => unknown,
                  ) {
                    return Promise.resolve({
                      data: matching.map((e) => ({
                        id: e.id,
                        game_id: e.game_id,
                        progress_tracking: e.progress_tracking,
                        progress_fetched_at: e.progress_fetched_at,
                        playtime_forever: e.playtime_forever,
                        last_played_at: e.last_played_at,
                      })),
                      error: null,
                    }).then(resolve, reject);
                  },
                };
                return builder;
              },
            };
          },
          update(values: Partial<LibraryEntry>) {
            return {
              async in(_col: string, ids: number[]) {
                for (const entry of entries) {
                  if (ids.includes(entry.id)) Object.assign(entry, values);
                }
                return { error: null };
              },
              async eq(_col: string, id: number) {
                const entry = entries.find((e) => e.id === id);
                if (entry) Object.assign(entry, values);
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "achievements") {
        return {
          upsert(
            rows: Array<{
              game_id: number;
              api_name: string;
              display_name: string;
              description: string;
              icon_url: string;
              icon_gray_url: string;
              hidden: boolean;
            }>,
          ) {
            const list = Array.isArray(rows) ? rows : [rows];
            const upserted: AchievementRow[] = [];
            for (const row of list) {
              let existing = achievements.find(
                (a) => a.game_id === row.game_id && a.api_name === row.api_name,
              );
              if (existing) {
                Object.assign(existing, row);
              } else {
                existing = { id: nextAchievementId++, ...row };
                achievements.push(existing);
              }
              upserted.push(existing);
            }
            return {
              async select() {
                return {
                  data: upserted.map((a) => ({
                    id: a.id,
                    api_name: a.api_name,
                    game_id: a.game_id,
                  })),
                  error: null,
                };
              },
            };
          },
        };
      }

      if (table === "achievement_unlocks") {
        return {
          upsert(
            rows: Array<{
              steam_profile_game_id: number;
              achievement_id: number;
              unlocked: boolean;
              unlocked_at: string | null;
            }>,
          ) {
            const list = Array.isArray(rows) ? rows : [rows];
            for (const row of list) {
              const existing = unlocks.find(
                (u) =>
                  u.steam_profile_game_id === row.steam_profile_game_id &&
                  u.achievement_id === row.achievement_id,
              );
              if (existing) {
                existing.unlocked = row.unlocked;
                existing.unlocked_at = row.unlocked_at;
              } else {
                unlocks.push({ id: nextUnlockId++, ...row });
              }
            }
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`unexpected table ${table}`);
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    profiles,
    games,
    entries,
    achievements,
    unlocks,
  };
}

describe("syncLibrary", () => {
  it("preserves triage and board on re-sync and updates playtime", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
      games: [{ id: 1, app_id: 570, name: "Dota 2", header_image_url: "", icon_image_url: "" }],
      entries: [
        {
          id: 1,
          steam_profile_id: "p1",
          game_id: 1,
          triage_status: "kept",
          board_column: "queue",
          board_position: 0,
          playtime_forever: 10,
          playtime_2weeks: 0,
          last_played_at: null,
          removed_at: null,
          progress_tracking: false,
          progress_unlocked: null,
          progress_total: null,
          progress_fetched_at: null,
        },
      ],
    });

    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 570,
          name: "Dota 2",
          playtimeForever: 999,
          playtime2Weeks: 5,
          lastPlayedAt: null,
          headerImageUrl: "https://example.com/h.jpg",
        },
      ],
    });

    assert.equal(result.ok, true);
    const entry = db.entries[0];
    assert.equal(entry.triage_status, "kept");
    assert.equal(entry.board_column, "queue");
    assert.equal(entry.board_position, 0);
    assert.equal(entry.playtime_forever, 999);
    assert.equal(db.profiles.get("p1")?.sync_status, "idle");
    assert.ok(db.profiles.get("p1")?.last_synced_at);
  });

  it("sets removed_at when a game disappears from Steam", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
      games: [
        { id: 1, app_id: 570, name: "Dota 2", header_image_url: "", icon_image_url: "" },
        { id: 2, app_id: 440, name: "TF2", header_image_url: "", icon_image_url: "" },
      ],
      entries: [
        {
          id: 1,
          steam_profile_id: "p1",
          game_id: 1,
          triage_status: "someday",
          board_column: null,
          board_position: null,
          playtime_forever: 1,
          playtime_2weeks: 0,
          last_played_at: null,
          removed_at: null,
          progress_tracking: false,
          progress_unlocked: null,
          progress_total: null,
          progress_fetched_at: null,
        },
        {
          id: 2,
          steam_profile_id: "p1",
          game_id: 2,
          triage_status: "unreviewed",
          board_column: null,
          board_position: null,
          playtime_forever: 2,
          playtime_2weeks: 0,
          last_played_at: null,
          removed_at: null,
          progress_tracking: false,
          progress_unlocked: null,
          progress_total: null,
          progress_fetched_at: null,
        },
      ],
    });

    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 570,
          name: "Dota 2",
          playtimeForever: 1,
          playtime2Weeks: 0,
          lastPlayedAt: null,
        },
      ],
    });

    assert.equal(result.ok, true);
    assert.equal(db.entries[0].removed_at, null);
    assert.ok(db.entries[1].removed_at);
    assert.equal(db.entries[1].triage_status, "unreviewed");
  });

  it("turns Progress tracking off on Removed without wiping cached Progress", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
      games: [
        { id: 1, app_id: 570, name: "Dota 2", header_image_url: "", icon_image_url: "" },
        { id: 2, app_id: 440, name: "TF2", header_image_url: "", icon_image_url: "" },
      ],
      entries: [
        {
          id: 1,
          steam_profile_id: "p1",
          game_id: 1,
          triage_status: "kept",
          board_column: "playing",
          board_position: 0,
          playtime_forever: 1,
          playtime_2weeks: 0,
          last_played_at: null,
          removed_at: null,
          progress_tracking: false,
          progress_unlocked: null,
          progress_total: null,
          progress_fetched_at: null,
        },
        {
          id: 2,
          steam_profile_id: "p1",
          game_id: 2,
          triage_status: "kept",
          board_column: "playing",
          board_position: 1,
          playtime_forever: 2,
          playtime_2weeks: 0,
          last_played_at: null,
          removed_at: null,
          progress_tracking: true,
          progress_unlocked: 4,
          progress_total: 12,
          progress_fetched_at: "2026-07-01T00:00:00.000Z",
        },
      ],
    });

    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 570,
          name: "Dota 2",
          playtimeForever: 1,
          playtime2Weeks: 0,
          lastPlayedAt: null,
        },
      ],
    });

    assert.equal(result.ok, true);
    const removed = db.entries[1];
    assert.ok(removed.removed_at);
    assert.equal(removed.progress_tracking, false);
    assert.equal(removed.progress_unlocked, 4);
    assert.equal(removed.progress_total, 12);
    assert.equal(removed.progress_fetched_at, "2026-07-01T00:00:00.000Z");
    assert.equal(removed.board_column, "playing");
    assert.equal(removed.triage_status, "kept");
  });

  it("sets sync_status failed on private library", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
    });

    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => {
        throw new PrivateGamesError();
      },
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "private");
    assert.equal(db.profiles.get("p1")?.sync_status, "failed");
  });

  it("sets sync_status failed when game details are hidden", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
    });

    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => {
        throw new GameDetailsHiddenError();
      },
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "hidden");
    assert.equal(db.profiles.get("p1")?.sync_status, "failed");
  });

  it("persists icon_image_url from owned game iconImageUrl", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
    });

    const iconUrl =
      "https://media.steampowered.com/steamcommunity/public/images/apps/440/07385eb55b5ba974aebbe74d3c99626bda7920b8.jpg";

    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 440,
          name: "Team Fortress 2",
          playtimeForever: 10,
          playtime2Weeks: 0,
          lastPlayedAt: null,
          headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/440/header.jpg",
          iconImageUrl: iconUrl,
        },
      ],
    });

    assert.equal(result.ok, true);
    assert.equal(db.games.length, 1);
    assert.equal(db.games[0].app_id, 440);
    assert.equal(db.games[0].icon_image_url, iconUrl);
    assert.equal(
      db.games[0].header_image_url,
      "https://cdn.akamai.steamstatic.com/steam/apps/440/header.jpg",
    );
  });

  it("refreshes Progress for a tracking-on entry that was never fetched", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
      games: [
        { id: 1, app_id: 440, name: "TF2", header_image_url: "", icon_image_url: "" },
      ],
      entries: [
        {
          id: 10,
          steam_profile_id: "p1",
          game_id: 1,
          triage_status: "kept",
          board_column: "playing",
          board_position: 0,
          playtime_forever: 50,
          playtime_2weeks: 0,
          last_played_at: "2026-07-01T00:00:00.000Z",
          removed_at: null,
          progress_tracking: true,
          progress_unlocked: null,
          progress_total: null,
          progress_fetched_at: null,
        },
      ],
    });

    const fetchedAppIds: number[] = [];
    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 440,
          name: "TF2",
          playtimeForever: 50,
          playtime2Weeks: 0,
          lastPlayedAt: new Date("2026-07-01T00:00:00.000Z"),
        },
      ],
      fetchAchievementsForGame: async (_steamId, appId) => {
        fetchedAppIds.push(appId);
        return {
          definitions: [
            {
              apiName: "WIN_FIRST",
              displayName: "First Win",
              description: "Win once",
              iconUrl: "https://example.com/i.jpg",
              iconGrayUrl: "https://example.com/g.jpg",
              hidden: false,
            },
            {
              apiName: "WIN_TEN",
              displayName: "Ten Wins",
              description: "Win ten",
              iconUrl: "https://example.com/i2.jpg",
              iconGrayUrl: "https://example.com/g2.jpg",
              hidden: false,
            },
          ],
          unlocks: [
            {
              apiName: "WIN_FIRST",
              unlocked: true,
              unlockedAt: new Date("2026-06-01T00:00:00.000Z"),
            },
            {
              apiName: "WIN_TEN",
              unlocked: false,
              unlockedAt: null,
            },
          ],
        };
      },
    });

    assert.equal(result.ok, true);
    assert.deepEqual(fetchedAppIds, [440]);
    const entry = db.entries[0];
    assert.equal(entry.progress_unlocked, 1);
    assert.equal(entry.progress_total, 2);
    assert.ok(entry.progress_fetched_at);
    assert.equal(entry.triage_status, "kept");
    assert.equal(entry.board_column, "playing");
    assert.equal(entry.board_position, 0);
    assert.equal(db.achievements.length, 2);
    assert.equal(db.achievements[0].api_name, "WIN_FIRST");
    assert.equal(db.achievements[0].game_id, 1);
    assert.equal(db.unlocks.length, 2);
    assert.equal(db.unlocks[0].steam_profile_game_id, 10);
    assert.equal(db.unlocks.filter((u) => u.unlocked).length, 1);
  });

  it("does not fetch achievements for untracked entries even when playtime moves", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
      games: [
        { id: 1, app_id: 440, name: "TF2", header_image_url: "", icon_image_url: "" },
      ],
      entries: [
        {
          id: 10,
          steam_profile_id: "p1",
          game_id: 1,
          triage_status: "kept",
          board_column: "queue",
          board_position: 0,
          playtime_forever: 50,
          playtime_2weeks: 0,
          last_played_at: null,
          removed_at: null,
          progress_tracking: false,
          progress_unlocked: null,
          progress_total: null,
          progress_fetched_at: null,
        },
      ],
    });

    let fetchCount = 0;
    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 440,
          name: "TF2",
          playtimeForever: 999,
          playtime2Weeks: 10,
          lastPlayedAt: new Date("2026-07-15T00:00:00.000Z"),
        },
      ],
      fetchAchievementsForGame: async () => {
        fetchCount += 1;
        return { definitions: [], unlocks: [] };
      },
    });

    assert.equal(result.ok, true);
    assert.equal(fetchCount, 0);
    assert.equal(db.entries[0].playtime_forever, 999);
    assert.equal(db.entries[0].progress_fetched_at, null);
  });

  it("skips achievement fetch when tracking is on but playtime forever and last played are unchanged", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
      games: [
        { id: 1, app_id: 440, name: "TF2", header_image_url: "", icon_image_url: "" },
      ],
      entries: [
        {
          id: 10,
          steam_profile_id: "p1",
          game_id: 1,
          triage_status: "kept",
          board_column: "playing",
          board_position: 0,
          playtime_forever: 50,
          playtime_2weeks: 0,
          last_played_at: "2026-07-01T00:00:00.000Z",
          removed_at: null,
          progress_tracking: true,
          progress_unlocked: 1,
          progress_total: 2,
          progress_fetched_at: "2026-07-10T00:00:00.000Z",
        },
      ],
    });

    let fetchCount = 0;
    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 440,
          name: "TF2",
          playtimeForever: 50,
          playtime2Weeks: 0,
          lastPlayedAt: new Date("2026-07-01T00:00:00.000Z"),
        },
      ],
      fetchAchievementsForGame: async () => {
        fetchCount += 1;
        return { definitions: [], unlocks: [] };
      },
    });

    assert.equal(result.ok, true);
    assert.equal(fetchCount, 0);
    assert.equal(db.entries[0].progress_unlocked, 1);
    assert.equal(db.entries[0].progress_fetched_at, "2026-07-10T00:00:00.000Z");
  });

  it("refreshes Progress when playtime forever changes for a tracking-on entry", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
      games: [
        { id: 1, app_id: 440, name: "TF2", header_image_url: "", icon_image_url: "" },
      ],
      entries: [
        {
          id: 10,
          steam_profile_id: "p1",
          game_id: 1,
          triage_status: "kept",
          board_column: "playing",
          board_position: 0,
          playtime_forever: 50,
          playtime_2weeks: 0,
          last_played_at: "2026-07-01T00:00:00.000Z",
          removed_at: null,
          progress_tracking: true,
          progress_unlocked: 0,
          progress_total: 2,
          progress_fetched_at: "2026-07-10T00:00:00.000Z",
        },
      ],
    });

    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 440,
          name: "TF2",
          playtimeForever: 80,
          playtime2Weeks: 5,
          lastPlayedAt: new Date("2026-07-01T00:00:00.000Z"),
        },
      ],
      fetchAchievementsForGame: async () => ({
        definitions: [
          {
            apiName: "WIN_FIRST",
            displayName: "First Win",
            description: "",
            iconUrl: "",
            iconGrayUrl: "",
            hidden: false,
          },
          {
            apiName: "WIN_TEN",
            displayName: "Ten Wins",
            description: "",
            iconUrl: "",
            iconGrayUrl: "",
            hidden: false,
          },
        ],
        unlocks: [
          {
            apiName: "WIN_FIRST",
            unlocked: true,
            unlockedAt: new Date("2026-07-12T00:00:00.000Z"),
          },
          {
            apiName: "WIN_TEN",
            unlocked: true,
            unlockedAt: new Date("2026-07-14T00:00:00.000Z"),
          },
        ],
      }),
    });

    assert.equal(result.ok, true);
    assert.equal(db.entries[0].progress_unlocked, 2);
    assert.equal(db.entries[0].progress_total, 2);
    assert.ok(db.entries[0].progress_fetched_at);
    assert.notEqual(
      db.entries[0].progress_fetched_at,
      "2026-07-10T00:00:00.000Z",
    );
  });

  it("does not invent fake Progress when a game has no achievements", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
      games: [
        { id: 1, app_id: 440, name: "TF2", header_image_url: "", icon_image_url: "" },
      ],
      entries: [
        {
          id: 10,
          steam_profile_id: "p1",
          game_id: 1,
          triage_status: "kept",
          board_column: "playing",
          board_position: 0,
          playtime_forever: 50,
          playtime_2weeks: 0,
          last_played_at: null,
          removed_at: null,
          progress_tracking: true,
          progress_unlocked: null,
          progress_total: null,
          progress_fetched_at: null,
        },
      ],
    });

    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 440,
          name: "TF2",
          playtimeForever: 50,
          playtime2Weeks: 0,
          lastPlayedAt: null,
        },
      ],
      fetchAchievementsForGame: async () => ({
        definitions: [],
        unlocks: [],
      }),
    });

    assert.equal(result.ok, true);
    assert.equal(db.entries[0].progress_unlocked, null);
    assert.equal(db.entries[0].progress_total, null);
    assert.ok(db.entries[0].progress_fetched_at);
    assert.equal(db.achievements.length, 0);
    assert.equal(db.unlocks.length, 0);
  });

  it("leaves Progress untouched when Steam achievements are unavailable", async () => {
    const db = createMemorySupabase({
      profile: {
        id: "p1",
        steam_id: "76561198000000000",
        sync_status: "idle",
        last_synced_at: null,
      },
      games: [
        { id: 1, app_id: 440, name: "TF2", header_image_url: "", icon_image_url: "" },
      ],
      entries: [
        {
          id: 10,
          steam_profile_id: "p1",
          game_id: 1,
          triage_status: "kept",
          board_column: "playing",
          board_position: 0,
          playtime_forever: 50,
          playtime_2weeks: 0,
          last_played_at: null,
          removed_at: null,
          progress_tracking: true,
          progress_unlocked: 3,
          progress_total: 10,
          progress_fetched_at: "2026-07-01T00:00:00.000Z",
        },
      ],
    });

    const result = await syncLibrary(db.client, "p1", {
      fetchOwnedGames: async () => [
        {
          appId: 440,
          name: "TF2",
          playtimeForever: 90,
          playtime2Weeks: 5,
          lastPlayedAt: null,
        },
      ],
      fetchAchievementsForGame: async () => {
        throw new AchievementsUnavailableError("private stats");
      },
    });

    assert.equal(result.ok, true);
    assert.equal(db.entries[0].progress_unlocked, 3);
    assert.equal(db.entries[0].progress_total, 10);
    assert.equal(db.entries[0].progress_fetched_at, "2026-07-01T00:00:00.000Z");
    assert.equal(db.profiles.get("p1")?.sync_status, "idle");
  });
});
