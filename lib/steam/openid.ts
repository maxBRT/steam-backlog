// Needs STEAM_WEB_API_KEY for GetPlayerSummaries (see player-summary.ts).

import { siteUrl } from "../site-url.ts";

export const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";

export function steamCallbackUrl(): string {
  return `${siteUrl()}/api/steam/callback`;
}

export function buildSteamLoginUrl(): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": steamCallbackUrl(),
    "openid.realm": siteUrl(),
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`;
}

export function parseSteamId(claimedId: string): bigint | null {
  const match =
    /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(claimedId);
  if (!match) return null;
  return BigInt(match[1]);
}

export type OpenIdParams = Record<string, string>;

export function openIdParamsFromSearchParams(
  searchParams: URLSearchParams,
): OpenIdParams {
  const params: OpenIdParams = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("openid.")) params[key] = value;
  }
  return params;
}

/** Local checks before hitting Steam. Throws on failure. */
export function assertOpenIdResponse(
  params: OpenIdParams,
  expectedReturnTo: string,
): bigint {
  if (params["openid.mode"] !== "id_res") {
    throw new Error("Invalid OpenID mode");
  }
  if (params["openid.op_endpoint"] !== STEAM_OPENID_ENDPOINT) {
    throw new Error("Invalid OpenID endpoint");
  }
  if (params["openid.return_to"] !== expectedReturnTo) {
    throw new Error("OpenID return_to mismatch");
  }
  const claimedId = params["openid.claimed_id"];
  if (!claimedId) throw new Error("Missing claimed_id");
  const steamId = parseSteamId(claimedId);
  if (steamId === null) throw new Error("Invalid claimed_id");
  return steamId;
}

export async function verifySteamOpenId(
  params: OpenIdParams,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const body = new URLSearchParams(params);
  body.set("openid.mode", "check_authentication");

  const res = await fetchImpl(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return false;
  const text = await res.text();
  return text.includes("is_valid:true");
}
