import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyBoardMove,
  buildBoardSnapshot,
  DEFAULT_BOARD_RAIL_COLLAPSE,
  isCollapsedBoardRail,
  isCollapsibleBoardColumn,
  loadBoardSnapshot,
  moveBoardEntry,
  parseBoardMoveMutation,
  planBoardMove,
  resolveBoardDropTargetIndex,
  toggleBoardRailCollapse,
  type BoardCard,
  type BoardRow,
} from "../lib/board.ts";

describe("board focus rails", () => {
  it("defaults Queue and Done to collapsed", () => {
    assert.deepEqual(DEFAULT_BOARD_RAIL_COLLAPSE, { queue: true, done: true });
  });

  it("toggles a collapsible column in session state", () => {
    const expandedQueue = toggleBoardRailCollapse(
      DEFAULT_BOARD_RAIL_COLLAPSE,
      "queue",
    );
    assert.deepEqual(expandedQueue, { queue: false, done: true });

    const expandedBoth = toggleBoardRailCollapse(expandedQueue, "done");
    assert.deepEqual(expandedBoth, { queue: false, done: false });
  });

  it("identifies collapsible board columns", () => {
    assert.equal(isCollapsibleBoardColumn("queue"), true);
    assert.equal(isCollapsibleBoardColumn("done"), true);
    assert.equal(isCollapsibleBoardColumn("up_next"), false);
    assert.equal(isCollapsibleBoardColumn("playing"), false);
  });

  it("detects collapsed Queue and Done rails", () => {
    assert.equal(
      isCollapsedBoardRail("queue", DEFAULT_BOARD_RAIL_COLLAPSE),
      true,
    );
    assert.equal(
      isCollapsedBoardRail("done", DEFAULT_BOARD_RAIL_COLLAPSE),
      true,
    );
    assert.equal(
      isCollapsedBoardRail("up_next", DEFAULT_BOARD_RAIL_COLLAPSE),
      false,
    );
    assert.equal(
      isCollapsedBoardRail(
        "queue",
        toggleBoardRailCollapse(DEFAULT_BOARD_RAIL_COLLAPSE, "queue"),
      ),
      false,
    );
  });
});

describe("board snapshot", () => {
  it("groups kept entries by column and orders by board position", () => {
    const rows: BoardRow[] = [
      {
        id: 1,
        board_column: "queue",
        board_position: 1,
        playtime_forever: 60,
        games: { app_id: 10, name: "Second", header_image_url: "b.jpg", icon_image_url: "" },
      },
      {
        id: 2,
        board_column: "queue",
        board_position: 0,
        playtime_forever: 0,
        games: { app_id: 20, name: "First", header_image_url: "a.jpg", icon_image_url: "" },
      },
      {
        id: 3,
        board_column: "playing",
        board_position: 0,
        playtime_forever: 120,
        games: { app_id: 30, name: "Active", header_image_url: "c.jpg", icon_image_url: "" },
      },
    ];

    const snapshot = buildBoardSnapshot(rows, 5);

    assert.equal(snapshot.libraryCount, 5);
    assert.equal(snapshot.keptCount, 3);
    assert.deepEqual(snapshot.columns.queue.map(({ id }) => id), [2, 1]);
    assert.deepEqual(snapshot.columns.up_next, []);
    assert.deepEqual(snapshot.columns.playing.map(({ name }) => name), [
      "Active",
    ]);
    assert.deepEqual(snapshot.columns.done, []);
  });

  it("loads kept entries with board placement", async () => {
    const filters: Array<[string, unknown]> = [];
    const boardQuery = {
      select() {
        return boardQuery;
      },
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return boardQuery;
      },
      not() {
        return boardQuery;
      },
      is() {
        return boardQuery;
      },
      order() {
        return boardQuery;
      },
      async range() {
        return {
          data: [
            {
              id: 7,
              board_column: "done",
              board_position: 0,
              playtime_forever: 30,
              games: {
                app_id: 440,
                name: "Team Fortress 2",
                header_image_url: "tf2.jpg",
                icon_image_url: "tf2-icon.jpg",
              },
            },
          ],
          error: null,
        };
      },
    };
    const countQuery = {
      select(_columns: string, _options?: unknown) {
        return countQuery;
      },
      eq() {
        return countQuery;
      },
      is() {
        return countQuery;
      },
      async then(
        resolve: (value: { count: number; error: null }) => unknown,
      ) {
        return resolve({ count: 12, error: null });
      },
    };
    let tableCalls = 0;
    const supabase = {
      from(table: string) {
        tableCalls += 1;
        assert.equal(table, "steam_profile_games");
        return tableCalls === 1 ? countQuery : boardQuery;
      },
    } as unknown as SupabaseClient;

    const snapshot = await loadBoardSnapshot(supabase, "profile-1");

    assert.equal(snapshot.libraryCount, 12);
    assert.equal(snapshot.keptCount, 1);
    assert.deepEqual(snapshot.columns.done, [
      {
        id: 7,
        appId: 440,
        name: "Team Fortress 2",
        headerImageUrl: "tf2.jpg",
        iconImageUrl: "tf2-icon.jpg",
        playtimeForever: 30,
      },
    ]);
    assert.ok(
      filters.some(
        ([column, value]) => column === "steam_profile_id" && value === "profile-1",
      ),
    );
    assert.ok(
      filters.some(
        ([column, value]) => column === "triage_status" && value === "kept",
      ),
    );
  });
});

describe("resolveBoardDropTargetIndex", () => {
  it("prepends drops onto collapsed Queue or Done", () => {
    assert.equal(resolveBoardDropTargetIndex("queue", 3, true), 0);
    assert.equal(resolveBoardDropTargetIndex("done", 2, true), 0);
  });

  it("keeps the caller index when Queue or Done is expanded", () => {
    assert.equal(resolveBoardDropTargetIndex("queue", 3, false), 3);
    assert.equal(resolveBoardDropTargetIndex("done", 1, false), 1);
  });

  it("keeps the caller index for Up Next and Playing regardless of collapse", () => {
    assert.equal(resolveBoardDropTargetIndex("up_next", 2, true), 2);
    assert.equal(resolveBoardDropTargetIndex("up_next", 2, false), 2);
    assert.equal(resolveBoardDropTargetIndex("playing", 0, true), 0);
    assert.equal(resolveBoardDropTargetIndex("playing", 4, false), 4);
  });
});

describe("board moves", () => {
  const card = (id: number): BoardCard => ({
    id,
    appId: id + 100,
    name: `Game ${id}`,
    headerImageUrl: "",
    iconImageUrl: "",
    playtimeForever: 0,
  });

  it("reorders within a column with contiguous positions", () => {
    const updates = planBoardMove(
      {
        queue: [1, 2, 3],
        up_next: [],
        playing: [],
        done: [],
      },
      3,
      "queue",
      0,
    );

    assert.deepEqual(updates, [
      { id: 3, board_column: "queue", board_position: 0 },
      { id: 1, board_column: "queue", board_position: 1 },
      { id: 2, board_column: "queue", board_position: 2 },
    ]);
  });

  it("moves between columns and rewrites both columns", () => {
    const updates = planBoardMove(
      {
        queue: [1, 2],
        up_next: [3],
        playing: [],
        done: [],
      },
      1,
      "up_next",
      1,
    );

    assert.deepEqual(updates, [
      { id: 2, board_column: "queue", board_position: 0 },
      { id: 3, board_column: "up_next", board_position: 0 },
      { id: 1, board_column: "up_next", board_position: 1 },
    ]);
  });

  it("applies optimistic card moves in the UI model", () => {
    const next = applyBoardMove(
      {
        queue: [card(1), card(2)],
        up_next: [card(3)],
        playing: [],
        done: [],
      },
      1,
      "up_next",
      0,
    );

    assert.deepEqual(next.queue.map(({ id }) => id), [2]);
    assert.deepEqual(next.up_next.map(({ id }) => id), [1, 3]);
  });

  it("validates move mutation input", () => {
    assert.deepEqual(
      parseBoardMoveMutation({ entryId: 4, targetColumn: "playing", targetIndex: 0 }),
      { entryId: 4, targetColumn: "playing", targetIndex: 0 },
    );
    assert.equal(parseBoardMoveMutation({ entryId: 4, targetColumn: "wip", targetIndex: 0 }), null);
    assert.equal(parseBoardMoveMutation({ entryId: -1, targetColumn: "queue", targetIndex: 0 }), null);
  });

  it("persists a move via move_board_entry RPC", async () => {
    let rpcArgs: unknown;
    const supabase = {
      from(table: string) {
        if (table === "steam_profile_games") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: {
                          board_column: "queue",
                          progress_tracking: false,
                          steam_profile_id: "profile-1",
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
            update() {
              return {
                async eq() {
                  return { error: null };
                },
              };
            },
          };
        }
        if (table === "steam_profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: { playing_auto_track: true },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
      async rpc(fn: string, args: unknown) {
        assert.equal(fn, "move_board_entry");
        rpcArgs = args;
        return { data: null, error: null };
      },
    } as unknown as SupabaseClient;

    await moveBoardEntry(supabase, 2, "playing", 0);

    assert.deepEqual(rpcArgs, {
      p_entry_id: 2,
      p_target_column: "playing",
      p_target_index: 0,
    });
  });

  it("turns Progress tracking on when moving into Playing with Playing auto-track on", async () => {
    let progressUpdate: unknown;
    const supabase = {
      from(table: string) {
        if (table === "steam_profile_games") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: {
                          board_column: "queue",
                          progress_tracking: false,
                          steam_profile_id: "profile-1",
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
            update(values: unknown) {
              return {
                async eq() {
                  progressUpdate = values;
                  return { error: null };
                },
              };
            },
          };
        }
        if (table === "steam_profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: { playing_auto_track: true },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
      async rpc() {
        return { data: null, error: null };
      },
    } as unknown as SupabaseClient;

    await moveBoardEntry(supabase, 9, "playing", 0);

    assert.deepEqual(progressUpdate, { progress_tracking: true });
  });

  it("does not change Progress tracking when Playing auto-track is off", async () => {
    let progressUpdate: unknown = "unset";
    const supabase = {
      from(table: string) {
        if (table === "steam_profile_games") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: {
                          board_column: "queue",
                          progress_tracking: false,
                          steam_profile_id: "profile-1",
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
            update(values: unknown) {
              return {
                async eq() {
                  progressUpdate = values;
                  return { error: null };
                },
              };
            },
          };
        }
        if (table === "steam_profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: { playing_auto_track: false },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
      async rpc() {
        return { data: null, error: null };
      },
    } as unknown as SupabaseClient;

    await moveBoardEntry(supabase, 9, "playing", 0);

    assert.equal(progressUpdate, "unset");
  });
});
