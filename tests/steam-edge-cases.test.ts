import { describe, it, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  fetchPlayerSummary,
  PrivateProfileError,
  CommunityVisibilityState,
} from "../lib/steam/player-summary.ts";
import {
  fetchOwnedGames,
  PrivateGamesError,
  GameDetailsHiddenError,
} from "../lib/steam/owned-games.ts";

describe("fetchPlayerSummary edge cases", () => {
  const originalApiKey = process.env.STEAM_WEB_API_KEY;

  before(() => {
    process.env.STEAM_WEB_API_KEY = "test_key_for_mocking";
  });

  after(() => {
    if (originalApiKey === undefined) {
      delete process.env.STEAM_WEB_API_KEY;
    } else {
      process.env.STEAM_WEB_API_KEY = originalApiKey;
    }
  });
  it("throws PrivateProfileError for private profile (visibility state 1)", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          players: [
            {
              steamid: "76561198002516729",
              communityvisibilitystate: 1,
              profilestate: 1,
              personaname: "TestUser",
              avatarfull: "https://example.com/avatar.jpg",
            },
          ],
        },
      }),
    );

    await assert.rejects(
      () => fetchPlayerSummary(BigInt("76561198002516729"), mockFetch),
      PrivateProfileError,
    );
  });

  it("succeeds for public profile (visibility state 3)", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          players: [
            {
              steamid: "76561198002516729",
              communityvisibilitystate: 3,
              profilestate: 1,
              personaname: "PublicUser",
              avatarfull: "https://example.com/avatar.jpg",
            },
          ],
        },
      }),
    );

    const result = await fetchPlayerSummary(
      BigInt("76561198002516729"),
      mockFetch,
    );
    assert.equal(result.displayName, "PublicUser");
    assert.equal(
      result.communityVisibilityState,
      CommunityVisibilityState.Public,
    );
  });

  it("treats missing visibility state as private", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          players: [
            {
              steamid: "76561198002516729",
              personaname: "TestUser",
              avatarfull: "https://example.com/avatar.jpg",
            },
          ],
        },
      }),
    );

    await assert.rejects(
      () => fetchPlayerSummary(BigInt("76561198002516729"), mockFetch),
      PrivateProfileError,
    );
  });

  it("handles profile not found", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          players: [],
        },
      }),
    );

    await assert.rejects(
      () => fetchPlayerSummary(BigInt("76561198002516729"), mockFetch),
      /Steam profile not found/,
    );
  });

  it("handles API error response", async () => {
    const mockFetch = mock.fn(async () => new Response(null, { status: 500 }));

    await assert.rejects(
      () => fetchPlayerSummary(BigInt("76561198002516729"), mockFetch),
      /GetPlayerSummaries failed: 500/,
    );
  });
});

describe("fetchOwnedGames edge cases", () => {
  const originalApiKey = process.env.STEAM_WEB_API_KEY;

  before(() => {
    process.env.STEAM_WEB_API_KEY = "test_key_for_mocking";
  });

  after(() => {
    if (originalApiKey === undefined) {
      delete process.env.STEAM_WEB_API_KEY;
    } else {
      process.env.STEAM_WEB_API_KEY = originalApiKey;
    }
  });
  it("fetches games successfully from public profile", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          game_count: 2,
          games: [
            {
              appid: 730,
              name: "Counter-Strike 2",
              playtime_forever: 1000,
              playtime_2weeks: 100,
              rtime_last_played: 1704672000,
            },
            {
              appid: 440,
              name: "Team Fortress 2",
              playtime_forever: 500,
            },
          ],
        },
      }),
    );

    const games = await fetchOwnedGames(
      BigInt("76561198002516729"),
      {},
      mockFetch,
    );
    assert.equal(games.length, 2);
    assert.equal(games[0].appId, 730);
    assert.equal(games[0].name, "Counter-Strike 2");
    assert.equal(games[0].playtimeForever, 1000);
    assert.equal(games[0].playtime2Weeks, 100);
    assert.notEqual(games[0].lastPlayedAt, null);
  });

  it("throws PrivateGamesError for 403 response", async () => {
    const mockFetch = mock.fn(async () => new Response(null, { status: 403 }));

    await assert.rejects(
      () => fetchOwnedGames(BigInt("76561198002516729"), {}, mockFetch),
      PrivateGamesError,
    );
  });

  it("throws PrivateGamesError when response is missing", async () => {
    const mockFetch = mock.fn(async () => Response.json({}));

    await assert.rejects(
      () => fetchOwnedGames(BigInt("76561198002516729"), {}, mockFetch),
      PrivateGamesError,
    );
  });

  it("throws GameDetailsHiddenError when game_count > 0 but no games returned", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          game_count: 100,
          games: [],
        },
      }),
    );

    await assert.rejects(
      () => fetchOwnedGames(BigInt("76561198002516729"), {}, mockFetch),
      GameDetailsHiddenError,
    );
  });

  it("returns empty array when game_count is 0", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          game_count: 0,
          games: [],
        },
      }),
    );

    const games = await fetchOwnedGames(
      BigInt("76561198002516729"),
      {},
      mockFetch,
    );
    assert.equal(games.length, 0);
  });

  it("includes unvetted apps when skip_unvetted_apps is false", async () => {
    const mockFetch = mock.fn(async (url: RequestInfo | URL) => {
      const parsedUrl = new URL(url.toString());
      const skipUnvetted = parsedUrl.searchParams.get("skip_unvetted_apps");
      assert.equal(skipUnvetted, "0");

      return Response.json({
        response: {
          game_count: 1,
          games: [
            {
              appid: 2403620,
              name: "Air Twister",
              playtime_forever: 50,
            },
          ],
        },
      });
    });

    const games = await fetchOwnedGames(
      BigInt("76561198002516729"),
      { skipUnvettedApps: false },
      mockFetch,
    );
    assert.equal(games.length, 1);
  });

  it("filters out games without appid", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          game_count: 2,
          games: [
            {
              appid: 730,
              name: "Counter-Strike 2",
              playtime_forever: 1000,
            },
            {
              name: "Invalid Game",
              playtime_forever: 500,
            },
          ],
        },
      }),
    );

    const games = await fetchOwnedGames(
      BigInt("76561198002516729"),
      {},
      mockFetch,
    );
    assert.equal(games.length, 1);
    assert.equal(games[0].appId, 730);
  });

  it("handles games with no playtime data", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          game_count: 1,
          games: [
            {
              appid: 730,
              name: "Counter-Strike 2",
            },
          ],
        },
      }),
    );

    const games = await fetchOwnedGames(
      BigInt("76561198002516729"),
      {},
      mockFetch,
    );
    assert.equal(games.length, 1);
    assert.equal(games[0].playtimeForever, 0);
    assert.equal(games[0].playtime2Weeks, 0);
    assert.equal(games[0].lastPlayedAt, null);
  });

  it("constructs correct header image URL", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          game_count: 1,
          games: [
            {
              appid: 730,
              name: "Counter-Strike 2",
              playtime_forever: 1000,
              img_icon_url: "some_icon_hash",
            },
          ],
        },
      }),
    );

    const games = await fetchOwnedGames(
      BigInt("76561198002516729"),
      {},
      mockFetch,
    );
    assert.equal(games.length, 1);
    assert.equal(
      games[0].headerImageUrl,
      "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
    );
  });

  it("constructs icon image URL from img_icon_url hash", async () => {
    const mockFetch = mock.fn(async () =>
      Response.json({
        response: {
          game_count: 1,
          games: [
            {
              appid: 440,
              name: "Team Fortress 2",
              playtime_forever: 100,
              img_icon_url: "07385eb55b5ba974aebbe74d3c99626bda7920b8",
            },
          ],
        },
      }),
    );

    const games = await fetchOwnedGames(
      BigInt("76561198002516729"),
      {},
      mockFetch,
    );
    assert.equal(games.length, 1);
    assert.equal(
      games[0].iconImageUrl,
      "https://media.steampowered.com/steamcommunity/public/images/apps/440/07385eb55b5ba974aebbe74d3c99626bda7920b8.jpg",
    );
  });
});
