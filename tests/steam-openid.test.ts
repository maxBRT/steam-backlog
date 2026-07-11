import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertOpenIdResponse,
  parseSteamId,
  STEAM_OPENID_ENDPOINT,
} from "../lib/steam/openid.ts";

describe("parseSteamId", () => {
  it("parses https claimed id", () => {
    assert.equal(
      parseSteamId("https://steamcommunity.com/openid/id/76561198002516729"),
      BigInt("76561198002516729"),
    );
  });

  it("rejects non-steam claimed id", () => {
    assert.equal(
      parseSteamId("https://evil.example/openid/id/76561198002516729"),
      null,
    );
  });

  it("rejects short id", () => {
    assert.equal(
      parseSteamId("https://steamcommunity.com/openid/id/123"),
      null,
    );
  });
});

describe("assertOpenIdResponse", () => {
  const returnTo = "http://localhost:3000/api/steam/callback";
  const valid = {
    "openid.mode": "id_res",
    "openid.op_endpoint": STEAM_OPENID_ENDPOINT,
    "openid.return_to": returnTo,
    "openid.claimed_id":
      "https://steamcommunity.com/openid/id/76561198002516729",
  };

  it("returns steam id when valid", () => {
    assert.equal(
      assertOpenIdResponse(valid, returnTo),
      BigInt("76561198002516729"),
    );
  });

  it("rejects return_to mismatch", () => {
    assert.throws(
      () =>
        assertOpenIdResponse(
          { ...valid, "openid.return_to": "http://evil.example/cb" },
          returnTo,
        ),
      /return_to/,
    );
  });

  it("rejects bad claimed_id", () => {
    assert.throws(
      () =>
        assertOpenIdResponse(
          {
            ...valid,
            "openid.claimed_id": "https://evil.example/id/76561198002516729",
          },
          returnTo,
        ),
      /claimed_id/,
    );
  });
});
