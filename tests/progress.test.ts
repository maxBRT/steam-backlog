import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  boardProgressBar,
  buildGameDetailSnapshot,
  canSetProgressTracking,
  DEFAULT_PLAYING_AUTO_TRACK,
  isProgressRefreshEligible,
  loadGameDetail,
  parsePlayingAutoTrackMutation,
  parseProgressTrackingMutation,
  progressFieldsWhenRemoved,
  progressSummaryFromUnlocks,
  progressTrackingAfterBoardMove,
  setProgressTracking,
} from "../lib/progress.ts";
import { AchievementsUnavailableError } from "../lib/steam/achievements.ts";

describe("Progress tracking after board move", () => {
  it("turns Progress tracking on when moving into Playing with Playing auto-track on", () => {
    assert.equal(
      progressTrackingAfterBoardMove({
        previousColumn: "queue",
        nextColumn: "playing",
        playingAutoTrack: true,
        progressTracking: false,
      }),
      true,
    );
  });

  it("leaves Progress tracking unchanged when moving into Playing with Playing auto-track off", () => {
    assert.equal(
      progressTrackingAfterBoardMove({
        previousColumn: "queue",
        nextColumn: "playing",
        playingAutoTrack: false,
        progressTracking: false,
      }),
      false,
    );
  });

  it("keeps Progress tracking off while the entry stays in Playing even with Playing auto-track on", () => {
    assert.equal(
      progressTrackingAfterBoardMove({
        previousColumn: "playing",
        nextColumn: "playing",
        playingAutoTrack: true,
        progressTracking: false,
      }),
      false,
    );
  });

  it("turns Progress tracking on again when re-entering Playing with Playing auto-track on", () => {
    assert.equal(
      progressTrackingAfterBoardMove({
        previousColumn: "up_next",
        nextColumn: "playing",
        playingAutoTrack: true,
        progressTracking: false,
      }),
      true,
    );
  });

  it("leaves Progress tracking on when leaving Playing", () => {
    assert.equal(
      progressTrackingAfterBoardMove({
        previousColumn: "playing",
        nextColumn: "up_next",
        playingAutoTrack: true,
        progressTracking: true,
      }),
      true,
    );
  });
});

describe("Progress tracking when Removed", () => {
  it("turns Progress tracking off without wiping cached Progress summary", () => {
    const update = progressFieldsWhenRemoved({
      progressTracking: true,
      progressUnlocked: 3,
      progressTotal: 10,
      progressFetchedAt: "2026-07-01T00:00:00.000Z",
    });

    assert.deepEqual(update, { progress_tracking: false });
    assert.equal("progress_unlocked" in update, false);
    assert.equal("progress_total" in update, false);
    assert.equal("progress_fetched_at" in update, false);
  });
});

describe("Progress tracking toggle", () => {
  it("allows Progress tracking only for kept library entries that are not Removed", () => {
    assert.equal(
      canSetProgressTracking({ triageStatus: "kept", removedAt: null }),
      true,
    );
    assert.equal(
      canSetProgressTracking({ triageStatus: "someday", removedAt: null }),
      false,
    );
    assert.equal(
      canSetProgressTracking({
        triageStatus: "kept",
        removedAt: "2026-07-01T00:00:00.000Z",
      }),
      false,
    );
  });
});

describe("Playing auto-track preference", () => {
  it("defaults Playing auto-track on", () => {
    assert.equal(DEFAULT_PLAYING_AUTO_TRACK, true);
  });

  it("parses Playing auto-track mutation input", () => {
    assert.deepEqual(parsePlayingAutoTrackMutation({ playingAutoTrack: true }), {
      playingAutoTrack: true,
    });
    assert.deepEqual(parsePlayingAutoTrackMutation({ playingAutoTrack: false }), {
      playingAutoTrack: false,
    });
    assert.equal(parsePlayingAutoTrackMutation({ playingAutoTrack: "yes" }), null);
    assert.equal(parsePlayingAutoTrackMutation({}), null);
  });
});

describe("Progress refresh eligibility", () => {
  it("refreshes when Progress tracking is on and Progress was never successfully fetched", () => {
    assert.equal(
      isProgressRefreshEligible({
        progressTracking: true,
        progressFetchedAt: null,
        storedPlaytimeForever: 100,
        storedLastPlayedAt: "2026-07-01T00:00:00.000Z",
        newPlaytimeForever: 100,
        newLastPlayedAt: "2026-07-01T00:00:00.000Z",
      }),
      true,
    );
  });

  it("skips when Progress tracking is on, already fetched, and playtime forever / last played are unchanged", () => {
    assert.equal(
      isProgressRefreshEligible({
        progressTracking: true,
        progressFetchedAt: "2026-07-10T00:00:00.000Z",
        storedPlaytimeForever: 100,
        storedLastPlayedAt: "2026-07-01T00:00:00.000Z",
        newPlaytimeForever: 100,
        newLastPlayedAt: "2026-07-01T00:00:00.000Z",
      }),
      false,
    );
  });

  it("refreshes when Progress tracking is on and playtime forever changed", () => {
    assert.equal(
      isProgressRefreshEligible({
        progressTracking: true,
        progressFetchedAt: "2026-07-10T00:00:00.000Z",
        storedPlaytimeForever: 100,
        storedLastPlayedAt: "2026-07-01T00:00:00.000Z",
        newPlaytimeForever: 150,
        newLastPlayedAt: "2026-07-01T00:00:00.000Z",
      }),
      true,
    );
  });

  it("refreshes when Progress tracking is on and last played changed", () => {
    assert.equal(
      isProgressRefreshEligible({
        progressTracking: true,
        progressFetchedAt: "2026-07-10T00:00:00.000Z",
        storedPlaytimeForever: 100,
        storedLastPlayedAt: "2026-07-01T00:00:00.000Z",
        newPlaytimeForever: 100,
        newLastPlayedAt: "2026-07-15T00:00:00.000Z",
      }),
      true,
    );
  });

  it("skips when Progress tracking is off even if playtime forever changed", () => {
    assert.equal(
      isProgressRefreshEligible({
        progressTracking: false,
        progressFetchedAt: null,
        storedPlaytimeForever: 100,
        storedLastPlayedAt: null,
        newPlaytimeForever: 200,
        newLastPlayedAt: "2026-07-15T00:00:00.000Z",
      }),
      false,
    );
  });
});

describe("Progress summary from unlocks", () => {
  it("derives unlocked over total from achievement unlocks", () => {
    assert.deepEqual(
      progressSummaryFromUnlocks([
        { unlocked: true },
        { unlocked: false },
        { unlocked: true },
        { unlocked: false },
      ]),
      { unlocked: 2, total: 4 },
    );
  });

  it("does not invent fake Progress when there are no achievements", () => {
    assert.deepEqual(progressSummaryFromUnlocks([]), {
      unlocked: null,
      total: null,
    });
  });
});

describe("Board Progress bar fields", () => {
  it("includes Progress when tracking is on and Progress is known", () => {
    assert.deepEqual(
      boardProgressBar({
        progressTracking: true,
        progressUnlocked: 3,
        progressTotal: 10,
      }),
      { unlocked: 3, total: 10 },
    );
  });

  it("includes a real 0% Progress bar when achievements exist and none are unlocked", () => {
    assert.deepEqual(
      boardProgressBar({
        progressTracking: true,
        progressUnlocked: 0,
        progressTotal: 12,
      }),
      { unlocked: 0, total: 12 },
    );
  });

  it("omits the Progress bar when Progress tracking is off", () => {
    assert.equal(
      boardProgressBar({
        progressTracking: false,
        progressUnlocked: 3,
        progressTotal: 10,
      }),
      null,
    );
  });

  it("omits the Progress bar when Progress is unknown", () => {
    assert.equal(
      boardProgressBar({
        progressTracking: true,
        progressUnlocked: null,
        progressTotal: null,
      }),
      null,
    );
  });

  it("does not invent a fake 0% bar for games with no achievements", () => {
    assert.equal(
      boardProgressBar({
        progressTracking: true,
        progressUnlocked: null,
        progressTotal: null,
      }),
      null,
    );
  });
});

describe("Game detail snapshot", () => {
  const baseEntry = {
    id: 42,
    appId: 570,
    name: "Dota 2",
    headerImageUrl: "dota.jpg",
    iconImageUrl: "dota-icon.jpg",
    progressTracking: true,
    progressUnlocked: 1,
    progressTotal: 2,
    progressFetchedAt: "2026-07-10T00:00:00.000Z",
  };

  it("shows Progress tracking, Progress when known, and achievement unlocks", () => {
    const snapshot = buildGameDetailSnapshot({
      entry: baseEntry,
      achievements: [
        {
          apiName: "FIRST_BLOOD",
          displayName: "First Blood",
          description: "Get a kill",
          iconUrl: "fb.png",
          iconGrayUrl: "fb-gray.png",
          hidden: false,
          unlocked: true,
          unlockedAt: "2026-07-01T12:00:00.000Z",
        },
        {
          apiName: "WIN_MATCH",
          displayName: "Victory",
          description: "Win a match",
          iconUrl: "win.png",
          iconGrayUrl: "win-gray.png",
          hidden: false,
          unlocked: false,
          unlockedAt: null,
        },
      ],
    });

    assert.equal(snapshot.progressTracking, true);
    assert.deepEqual(snapshot.progress, { unlocked: 1, total: 2 });
    assert.equal(snapshot.achievementsStatus, "ready");
    assert.equal(snapshot.achievements.length, 2);
    assert.equal(snapshot.achievements[0]?.unlocked, true);
    assert.equal(snapshot.achievements[1]?.unlocked, false);
    assert.equal(snapshot.name, "Dota 2");
    assert.equal(snapshot.appId, 570);
  });

  it("shows an explicit empty state when there are no Achievements", () => {
    const snapshot = buildGameDetailSnapshot({
      entry: {
        ...baseEntry,
        progressUnlocked: null,
        progressTotal: null,
        progressFetchedAt: "2026-07-10T00:00:00.000Z",
      },
      achievements: [],
    });

    assert.equal(snapshot.achievementsStatus, "empty");
    assert.equal(snapshot.progress, null);
    assert.deepEqual(snapshot.achievements, []);
  });

  it("shows an explicit error state when Steam cannot load achievements", () => {
    const snapshot = buildGameDetailSnapshot({
      entry: {
        ...baseEntry,
        progressUnlocked: null,
        progressTotal: null,
        progressFetchedAt: null,
      },
      achievements: [],
      achievementsError: "Steam achievements are unavailable",
    });

    assert.equal(snapshot.achievementsStatus, "error");
    assert.equal(snapshot.achievementsError, "Steam achievements are unavailable");
    assert.equal(snapshot.progress, null);
  });

  it("keeps Progress unknown until a successful fetch when tracking is on", () => {
    const snapshot = buildGameDetailSnapshot({
      entry: {
        ...baseEntry,
        progressUnlocked: null,
        progressTotal: null,
        progressFetchedAt: null,
      },
      achievements: [],
    });

    assert.equal(snapshot.achievementsStatus, "unknown");
    assert.equal(snapshot.progress, null);
  });

  it("loads Game detail only for the current steam profile", async () => {
    const filters: Array<[string, unknown]> = [];
    let unlockQueryFilters: Array<[string, unknown]> = [];

    const entryQuery = {
      select() {
        return entryQuery;
      },
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return entryQuery;
      },
      async maybeSingle() {
        return {
          data: {
            id: 42,
            progress_tracking: true,
            progress_unlocked: 1,
            progress_total: 2,
            progress_fetched_at: "2026-07-10T00:00:00.000Z",
            games: {
              app_id: 570,
              name: "Dota 2",
              header_image_url: "dota.jpg",
              icon_image_url: "dota-icon.jpg",
            },
          },
          error: null,
        };
      },
    };

    const unlockQuery = {
      select() {
        return unlockQuery;
      },
      eq(column: string, value: unknown) {
        unlockQueryFilters.push([column, value]);
        return unlockQuery;
      },
      async then(
        resolve: (value: {
          data: Array<{
            unlocked: boolean;
            unlocked_at: string | null;
            achievements: {
              api_name: string;
              display_name: string;
              description: string;
              icon_url: string;
              icon_gray_url: string;
              hidden: boolean;
            };
          }>;
          error: null;
        }) => unknown,
      ) {
        return resolve({
          data: [
            {
              unlocked: true,
              unlocked_at: "2026-07-01T12:00:00.000Z",
              achievements: {
                api_name: "FIRST_BLOOD",
                display_name: "First Blood",
                description: "Get a kill",
                icon_url: "fb.png",
                icon_gray_url: "fb-gray.png",
                hidden: false,
              },
            },
          ],
          error: null,
        });
      },
    };

    const supabase = {
      from(table: string) {
        if (table === "steam_profile_games") return entryQuery;
        if (table === "achievement_unlocks") return unlockQuery;
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as SupabaseClient;

    const snapshot = await loadGameDetail(supabase, "profile-1", 42);

    assert.ok(snapshot);
    assert.equal(snapshot.id, 42);
    assert.equal(snapshot.achievementsStatus, "ready");
    assert.deepEqual(snapshot.progress, { unlocked: 1, total: 2 });
    assert.ok(
      filters.some(
        ([column, value]) =>
          column === "steam_profile_id" && value === "profile-1",
      ),
    );
    assert.ok(
      filters.some(([column, value]) => column === "id" && value === 42),
    );
    assert.ok(
      unlockQueryFilters.some(
        ([column, value]) =>
          column === "steam_profile_game_id" && value === 42,
      ),
    );
  });

  it("returns null when Game detail is not in the current steam profile", async () => {
    const entryQuery = {
      select() {
        return entryQuery;
      },
      eq() {
        return entryQuery;
      },
      async maybeSingle() {
        return { data: null, error: null };
      },
    };
    const supabase = {
      from(table: string) {
        assert.equal(table, "steam_profile_games");
        return entryQuery;
      },
    } as unknown as SupabaseClient;

    assert.equal(await loadGameDetail(supabase, "profile-1", 99), null);
  });
});

describe("Progress tracking from Game detail", () => {
  it("parses Progress tracking mutation input", () => {
    assert.deepEqual(parseProgressTrackingMutation({ progressTracking: true }), {
      progressTracking: true,
    });
    assert.deepEqual(
      parseProgressTrackingMutation({ progressTracking: false }),
      { progressTracking: false },
    );
    assert.equal(parseProgressTrackingMutation({ progressTracking: "yes" }), null);
    assert.equal(parseProgressTrackingMutation({}), null);
  });

  it("turns Progress tracking on and performs a first Progress fetch when unknown", async () => {
    let progressTracking = false;
    let progressUnlocked: number | null = null;
    let progressTotal: number | null = null;
    let progressFetchedAt: string | null = null;
    let fetchedAppId: number | undefined;
    const unlockRows: Array<{
      unlocked: boolean;
      unlocked_at: string | null;
      achievements: {
        api_name: string;
        display_name: string;
        description: string;
        icon_url: string;
        icon_gray_url: string;
        hidden: boolean;
      };
    }> = [];

    function entryRow() {
      return {
        id: 42,
        game_id: 7,
        triage_status: "kept",
        removed_at: null,
        progress_tracking: progressTracking,
        progress_unlocked: progressUnlocked,
        progress_total: progressTotal,
        progress_fetched_at: progressFetchedAt,
        games: {
          app_id: 570,
          name: "Dota 2",
          header_image_url: "dota.jpg",
          icon_image_url: "dota-icon.jpg",
        },
      };
    }

    const supabase = {
      from(table: string) {
        if (table === "steam_profiles") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            async maybeSingle() {
              return { data: { steam_id: "76561198000000000" }, error: null };
            },
          };
        }
        if (table === "achievement_unlocks") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            upsert(rows: unknown[]) {
              for (const row of rows as Array<{
                unlocked: boolean;
                unlocked_at: string | null;
                achievement_id: number;
              }>) {
                const apiName =
                  row.achievement_id === 1 ? "FIRST_BLOOD" : "WIN";
                unlockRows.push({
                  unlocked: row.unlocked,
                  unlocked_at: row.unlocked_at,
                  achievements: {
                    api_name: apiName,
                    display_name: apiName === "FIRST_BLOOD" ? "First Blood" : "Win",
                    description: "",
                    icon_url: "",
                    icon_gray_url: "",
                    hidden: false,
                  },
                });
              }
              return Promise.resolve({ error: null });
            },
            then(
              resolve: (value: {
                data: typeof unlockRows;
                error: null;
              }) => unknown,
            ) {
              return Promise.resolve(resolve({ data: unlockRows, error: null }));
            },
          };
        }
        if (table === "achievements") {
          return {
            upsert() {
              return {
                select() {
                  return Promise.resolve({
                    data: [
                      { id: 1, api_name: "FIRST_BLOOD", game_id: 7 },
                      { id: 2, api_name: "WIN", game_id: 7 },
                    ],
                    error: null,
                  });
                },
              };
            },
          };
        }
        if (table === "steam_profile_games") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            update(values: Record<string, unknown>) {
              if ("progress_tracking" in values) {
                progressTracking = Boolean(values.progress_tracking);
              }
              if ("progress_unlocked" in values) {
                progressUnlocked = values.progress_unlocked as number | null;
              }
              if ("progress_total" in values) {
                progressTotal = values.progress_total as number | null;
              }
              if ("progress_fetched_at" in values) {
                progressFetchedAt = values.progress_fetched_at as string | null;
              }
              return {
                async eq() {
                  return { error: null };
                },
              };
            },
            async maybeSingle() {
              return { data: entryRow(), error: null };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as SupabaseClient;

    const result = await setProgressTracking(
      supabase,
      "profile-1",
      42,
      true,
      {
        fetchAchievementsForGame: async (_steamId, appId) => {
          fetchedAppId = appId;
          return {
            definitions: [
              {
                apiName: "FIRST_BLOOD",
                displayName: "First Blood",
                description: "",
                iconUrl: "",
                iconGrayUrl: "",
                hidden: false,
              },
              {
                apiName: "WIN",
                displayName: "Win",
                description: "",
                iconUrl: "",
                iconGrayUrl: "",
                hidden: false,
              },
            ],
            unlocks: [
              { apiName: "FIRST_BLOOD", unlocked: true, unlockedAt: null },
              { apiName: "WIN", unlocked: false, unlockedAt: null },
            ],
          };
        },
      },
    );

    assert.equal(progressTracking, true);
    assert.equal(fetchedAppId, 570);
    assert.equal(result.snapshot.progressTracking, true);
    assert.deepEqual(result.snapshot.progress, { unlocked: 1, total: 2 });
    assert.equal(result.snapshot.achievementsStatus, "ready");
  });

  it("surfaces an explicit error when the first Progress fetch fails", async () => {
    let progressTracking = false;
    const entryRow = {
      id: 42,
      game_id: 7,
      triage_status: "kept",
      removed_at: null,
      progress_tracking: false,
      progress_unlocked: null,
      progress_total: null,
      progress_fetched_at: null,
      games: {
        app_id: 570,
        name: "Dota 2",
        header_image_url: "dota.jpg",
        icon_image_url: "dota-icon.jpg",
      },
    };

    const supabase = {
      from(table: string) {
        if (table === "steam_profiles") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            async maybeSingle() {
              return { data: { steam_id: "76561198000000000" }, error: null };
            },
          };
        }
        if (table === "achievement_unlocks") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            then(
              resolve: (value: { data: unknown[]; error: null }) => unknown,
            ) {
              return Promise.resolve(resolve({ data: [], error: null }));
            },
          };
        }
        if (table === "steam_profile_games") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            update(values: Record<string, unknown>) {
              if ("progress_tracking" in values) {
                progressTracking = Boolean(values.progress_tracking);
                entryRow.progress_tracking = progressTracking;
              }
              return {
                async eq() {
                  return { error: null };
                },
              };
            },
            async maybeSingle() {
              return { data: { ...entryRow }, error: null };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as SupabaseClient;

    const result = await setProgressTracking(
      supabase,
      "profile-1",
      42,
      true,
      {
        fetchAchievementsForGame: async () => {
          throw new AchievementsUnavailableError(
            "Steam achievements are unavailable",
          );
        },
      },
    );

    assert.equal(result.snapshot.progressTracking, true);
    assert.equal(result.snapshot.achievementsStatus, "error");
    assert.equal(
      result.snapshot.achievementsError,
      "Steam achievements are unavailable",
    );
  });

  it("does not fetch Progress when turning tracking on and Progress is already known", async () => {
    let fetched = false;
    const entryRow = {
      id: 42,
      game_id: 7,
      triage_status: "kept",
      removed_at: null,
      progress_tracking: false,
      progress_unlocked: 3,
      progress_total: 10,
      progress_fetched_at: "2026-07-10T00:00:00.000Z",
      games: {
        app_id: 570,
        name: "Dota 2",
        header_image_url: "dota.jpg",
        icon_image_url: "dota-icon.jpg",
      },
    };

    const supabase = {
      from(table: string) {
        if (table === "achievement_unlocks") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            then(
              resolve: (value: {
                data: Array<{
                  unlocked: boolean;
                  unlocked_at: null;
                  achievements: {
                    api_name: string;
                    display_name: string;
                    description: string;
                    icon_url: string;
                    icon_gray_url: string;
                    hidden: boolean;
                  };
                }>;
                error: null;
              }) => unknown,
            ) {
              return Promise.resolve(
                resolve({
                  data: [
                    {
                      unlocked: true,
                      unlocked_at: null,
                      achievements: {
                        api_name: "A",
                        display_name: "A",
                        description: "",
                        icon_url: "",
                        icon_gray_url: "",
                        hidden: false,
                      },
                    },
                  ],
                  error: null,
                }),
              );
            },
          };
        }
        if (table === "steam_profile_games") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            update(values: Record<string, unknown>) {
              if ("progress_tracking" in values) {
                entryRow.progress_tracking = Boolean(values.progress_tracking);
              }
              return {
                async eq() {
                  return { error: null };
                },
              };
            },
            async maybeSingle() {
              return { data: { ...entryRow }, error: null };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as SupabaseClient;

    const result = await setProgressTracking(
      supabase,
      "profile-1",
      42,
      true,
      {
        fetchAchievementsForGame: async () => {
          fetched = true;
          return { definitions: [], unlocks: [] };
        },
      },
    );

    assert.equal(fetched, false);
    assert.deepEqual(result.snapshot.progress, { unlocked: 3, total: 10 });
  });
});
