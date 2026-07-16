import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyBoardMove,
  buildBoardSnapshot,
  loadBoardSnapshot,
  moveBoardEntry,
  parseBoardMoveMutation,
  planBoardMove,
  type BoardCard,
  type BoardRow,
} from "../lib/board.ts";

describe("board snapshot", () => {
  it("groups kept entries by column and orders by board position", () => {
    const rows: BoardRow[] = [
      {
        id: 1,
        board_column: "queue",
        board_position: 1,
        playtime_forever: 60,
        games: { app_id: 10, name: "Second", header_image_url: "b.jpg" },
      },
      {
        id: 2,
        board_column: "queue",
        board_position: 0,
        playtime_forever: 0,
        games: { app_id: 20, name: "First", header_image_url: "a.jpg" },
      },
      {
        id: 3,
        board_column: "playing",
        board_position: 0,
        playtime_forever: 120,
        games: { app_id: 30, name: "Active", header_image_url: "c.jpg" },
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

describe("board moves", () => {
  const card = (id: number): BoardCard => ({
    id,
    appId: id + 100,
    name: `Game ${id}`,
    headerImageUrl: "",
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

  it("persists a move with staged positions to avoid slot conflicts", async () => {
    const updates: Array<{ id: number; payload: unknown }> = [];
    let selectCalls = 0;
    const entryQuery = {
      eq() {
        return entryQuery;
      },
      not() {
        return entryQuery;
      },
      async maybeSingle() {
        return { data: { id: 2 }, error: null };
      },
    };
    const placementQuery = {
      eq() {
        return placementQuery;
      },
      not() {
        return placementQuery;
      },
      async then(
        resolve: (value: {
          data: Array<{
            id: number;
            board_column: string;
            board_position: number;
          }>;
          error: null;
        }) => unknown,
      ) {
        return resolve({
          data: [
            { id: 1, board_column: "queue", board_position: 0 },
            { id: 2, board_column: "queue", board_position: 1 },
            { id: 3, board_column: "playing", board_position: 0 },
          ],
          error: null,
        });
      },
    };
    const supabase = {
      from(table: string) {
        assert.equal(table, "steam_profile_games");
        return {
          select() {
            selectCalls += 1;
            return selectCalls === 1 ? entryQuery : placementQuery;
          },
          update(payload: unknown) {
            return {
              eq(column: string, value: unknown) {
                const entryId = column === "id" ? value : null;
                return {
                  eq() {
                    if (typeof entryId === "number") {
                      updates.push({ id: entryId, payload });
                    }
                    return Promise.resolve({ error: null });
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as SupabaseClient;

    await moveBoardEntry(supabase, "profile-1", 2, "playing", 0);

    assert.equal(updates.length, 6);
    assert.deepEqual(
      updates.filter(({ id }) => id === 2).map(({ payload }) => payload),
      [
        { board_column: "playing", board_position: 1_000_000 },
        { board_column: "playing", board_position: 0 },
      ],
    );
    assert.deepEqual(
      updates.filter(({ id }) => id === 1).map(({ payload }) => payload),
      [
        { board_column: "queue", board_position: 1_000_000 },
        { board_column: "queue", board_position: 0 },
      ],
    );
  });
});
