import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSetProgressTracking,
  DEFAULT_PLAYING_AUTO_TRACK,
  isProgressRefreshEligible,
  parsePlayingAutoTrackMutation,
  progressFieldsWhenRemoved,
  progressSummaryFromUnlocks,
  progressTrackingAfterBoardMove,
} from "../lib/progress.ts";

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
