import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTriageSnapshot,
  loadTriageSnapshot,
  parseTriageMutation,
  sortTriageQueue,
  triageUpdate,
  updateTriageEntry,
  type TriageGame,
  type TriageRow,
} from "../lib/triage.ts";

function game(
  id: number,
  playtimeForever: number,
  lastPlayedAt: string | null,
): TriageGame {
  return {
    id,
    appId: id + 100,
    name: `Game ${id}`,
    headerImageUrl: "",
    playtimeForever,
    lastPlayedAt,
  };
}

describe("triage queue", () => {
  it("sorts zero playtime, never played, then oldest", () => {
    const entries = [
      game(1, 60, "2025-01-01T00:00:00.000Z"),
      game(2, 0, null),
      game(3, 30, null),
      game(4, 90, "2020-01-01T00:00:00.000Z"),
      game(5, 0, "2026-01-01T00:00:00.000Z"),
    ];

    assert.deepEqual(
      sortTriageQueue(entries).map(({ id }) => id),
      [2, 5, 3, 4, 1],
    );
    assert.deepEqual(
      entries.map(({ id }) => id),
      [1, 2, 3, 4, 5],
      "sorting does not mutate the loaded queue",
    );
  });

  it("builds separate queues for unreviewed and Maybe games", () => {
    const rows: TriageRow[] = [
      {
        id: 1,
        triage_status: "hidden",
        playtime_forever: 0,
        last_played_at: null,
        games: { app_id: 10, name: "Hidden", header_image_url: "" },
      },
      {
        id: 2,
        triage_status: "unreviewed",
        playtime_forever: 20,
        last_played_at: null,
        games: [{ app_id: 20, name: "Next", header_image_url: "art.jpg" }],
      },
      {
        id: 3,
        triage_status: "maybe",
        playtime_forever: 60,
        last_played_at: "2025-01-01T00:00:00.000Z",
        games: { app_id: 30, name: "Maybe", header_image_url: "maybe.jpg" },
      },
    ];

    const snapshot = buildTriageSnapshot(rows);

    assert.equal(snapshot.reviewed, 2);
    assert.equal(snapshot.total, 3);
    assert.deepEqual(snapshot.queue, [
      {
        id: 2,
        appId: 20,
        name: "Next",
        headerImageUrl: "art.jpg",
        playtimeForever: 20,
        lastPlayedAt: null,
      },
    ]);
    assert.deepEqual(snapshot.maybeQueue, [
      {
        id: 3,
        appId: 30,
        name: "Maybe",
        headerImageUrl: "maybe.jpg",
        playtimeForever: 60,
        lastPlayedAt: "2025-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("loads libraries larger than the Supabase row limit", async () => {
    const ranges: Array<[number, number]> = [];
    const baseRow: TriageRow = {
      id: 1,
      triage_status: "unreviewed",
      playtime_forever: 0,
      last_played_at: null,
      games: { app_id: 10, name: "Game", header_image_url: "" },
    };
    const query = {
      select() {
        return query;
      },
      eq() {
        return query;
      },
      is() {
        return query;
      },
      order() {
        return query;
      },
      async range(from: number, to: number) {
        ranges.push([from, to]);
        const length = from === 0 ? 1_000 : 1;
        return {
          data: Array.from({ length }, (_, index) => ({
            ...baseRow,
            id: from + index + 1,
          })),
          error: null,
        };
      },
    };
    const supabase = {
      from(table: string) {
        assert.equal(table, "steam_profile_games");
        return query;
      },
    } as unknown as SupabaseClient;

    const snapshot = await loadTriageSnapshot(supabase, "profile-1");

    assert.equal(snapshot.total, 1_001);
    assert.equal(snapshot.queue.length, 1_001);
    assert.deepEqual(ranges, [
      [0, 999],
      [1_000, 1_999],
    ]);
  });
});

describe("triage updates", () => {
  it("clears board placement when leaving backlog", () => {
    assert.deepEqual(triageUpdate("hidden"), {
      triage_status: "hidden",
      board_column: null,
      board_position: null,
    });
    assert.deepEqual(triageUpdate("maybe"), {
      triage_status: "maybe",
      board_column: null,
      board_position: null,
    });
    assert.deepEqual(triageUpdate("unreviewed"), {
      triage_status: "unreviewed",
      board_column: null,
      board_position: null,
    });
  });

  it("does not invent board placement for backlog", () => {
    assert.deepEqual(triageUpdate("backlog"), {
      triage_status: "backlog",
    });
  });

  it("places completed games in the Done board column", () => {
    assert.deepEqual(triageUpdate("done", 3), {
      triage_status: "backlog",
      board_column: "done",
      board_position: 3,
    });
  });

  it("validates mutation input", () => {
    assert.deepEqual(parseTriageMutation({ entryId: 42, status: "maybe" }), {
      entryId: 42,
      status: "maybe",
    });
    assert.deepEqual(parseTriageMutation({ entryId: 42, status: "done" }), {
      entryId: 42,
      status: "done",
    });
    assert.equal(parseTriageMutation({ entryId: -1, status: "hidden" }), null);
    assert.equal(parseTriageMutation({ entryId: 1, status: "playing" }), null);
    assert.equal(parseTriageMutation(null), null);
  });

  it("scopes every update to the Steam profile", async () => {
    const filters: Array<[string, unknown]> = [];
    let payload: unknown;
    const query = {
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return query;
      },
      select() {
        return {
          async maybeSingle() {
            return { data: { id: 9 }, error: null };
          },
        };
      },
    };
    const supabase = {
      from(table: string) {
        assert.equal(table, "steam_profile_games");
        return {
          update(value: unknown) {
            payload = value;
            return query;
          },
        };
      },
    } as unknown as SupabaseClient;

    await updateTriageEntry(supabase, "profile-1", 9, "hidden");

    assert.deepEqual(payload, triageUpdate("hidden"));
    assert.deepEqual(filters, [
      ["id", 9],
      ["steam_profile_id", "profile-1"],
    ]);
  });

  it("appends completed games to the Done board column", async () => {
    const lookupFilters: Array<[string, unknown]> = [];
    let payload: unknown;
    const positionQuery = {
      eq(column: string, value: unknown) {
        lookupFilters.push([column, value]);
        return positionQuery;
      },
      order() {
        return positionQuery;
      },
      limit() {
        return positionQuery;
      },
      async maybeSingle() {
        return { data: { board_position: 2 }, error: null };
      },
    };
    const updateQuery = {
      eq() {
        return updateQuery;
      },
      select() {
        return {
          async maybeSingle() {
            return { data: { id: 9 }, error: null };
          },
        };
      },
    };
    const supabase = {
      from(table: string) {
        assert.equal(table, "steam_profile_games");
        return {
          select(columns: string) {
            assert.equal(columns, "board_position");
            return positionQuery;
          },
          update(value: unknown) {
            payload = value;
            return updateQuery;
          },
        };
      },
    } as unknown as SupabaseClient;

    await updateTriageEntry(supabase, "profile-1", 9, "done");

    assert.deepEqual(lookupFilters, [
      ["steam_profile_id", "profile-1"],
      ["board_column", "done"],
    ]);
    assert.deepEqual(payload, {
      triage_status: "backlog",
      board_column: "done",
      board_position: 3,
    });
  });

  it("rejects an entry outside the authenticated profile", async () => {
    const query = {
      eq() {
        return query;
      },
      select() {
        return {
          async maybeSingle() {
            return { data: null, error: null };
          },
        };
      },
    };
    const supabase = {
      from() {
        return {
          update() {
            return query;
          },
        };
      },
    } as unknown as SupabaseClient;

    await assert.rejects(
      updateTriageEntry(supabase, "profile-1", 9, "backlog"),
      /not found/,
    );
  });
});
