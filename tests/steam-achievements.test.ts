import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import {
  AchievementsUnavailableError,
  fetchAchievementsForGame,
} from "../lib/steam/achievements.ts";

describe("fetchAchievementsForGame", () => {
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

  it("returns Achievement definitions and unlocks from schema + GetPlayerAchievements", async () => {
    const mockFetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("GetSchemaForGame")) {
        return Response.json({
          game: {
            gameName: "Test Game",
            availableGameStats: {
              achievements: [
                {
                  name: "WIN_FIRST",
                  displayName: "First Win",
                  description: "Win once",
                  icon: "https://example.com/icon.jpg",
                  icongray: "https://example.com/gray.jpg",
                  hidden: 0,
                },
                {
                  name: "WIN_TEN",
                  displayName: "Ten Wins",
                  description: "Win ten times",
                  icon: "https://example.com/icon2.jpg",
                  icongray: "https://example.com/gray2.jpg",
                  hidden: 1,
                },
              ],
            },
          },
        });
      }
      if (url.includes("GetPlayerAchievements")) {
        return Response.json({
          playerstats: {
            success: true,
            achievements: [
              {
                apiname: "WIN_FIRST",
                achieved: 1,
                unlocktime: 1_720_000_000,
              },
              {
                apiname: "WIN_TEN",
                achieved: 0,
                unlocktime: 0,
              },
            ],
          },
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const result = await fetchAchievementsForGame(
      BigInt("76561198000000000"),
      440,
      mockFetch,
    );

    assert.deepEqual(result, {
      definitions: [
        {
          apiName: "WIN_FIRST",
          displayName: "First Win",
          description: "Win once",
          iconUrl: "https://example.com/icon.jpg",
          iconGrayUrl: "https://example.com/gray.jpg",
          hidden: false,
        },
        {
          apiName: "WIN_TEN",
          displayName: "Ten Wins",
          description: "Win ten times",
          iconUrl: "https://example.com/icon2.jpg",
          iconGrayUrl: "https://example.com/gray2.jpg",
          hidden: true,
        },
      ],
      unlocks: [
        {
          apiName: "WIN_FIRST",
          unlocked: true,
          unlockedAt: new Date(1_720_000_000 * 1000),
        },
        {
          apiName: "WIN_TEN",
          unlocked: false,
          unlockedAt: null,
        },
      ],
    });
  });

  it("throws AchievementsUnavailableError when Steam stats are private", async () => {
    const mockFetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("GetSchemaForGame")) {
        return Response.json({
          game: { availableGameStats: { achievements: [] } },
        });
      }
      if (url.includes("GetPlayerAchievements")) {
        return Response.json({
          playerstats: {
            success: false,
            error: "Profile is private",
          },
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    await assert.rejects(
      () =>
        fetchAchievementsForGame(BigInt("76561198000000000"), 440, mockFetch),
      AchievementsUnavailableError,
    );
  });
});
