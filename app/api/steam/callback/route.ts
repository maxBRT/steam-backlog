import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertOpenIdResponse,
  openIdParamsFromSearchParams,
  steamCallbackUrl,
  verifySteamOpenId,
} from "@/lib/steam/openid";
import { fetchPlayerSummary } from "@/lib/steam/player-summary";
import { syncLibrary } from "@/lib/steam/library-sync";
import {
  SteamLinkError,
} from "@/lib/steam/link-errors";
import { siteUrl } from "@/lib/site-url";

function settingsRedirect(error?: SteamLinkError) {
  const url = new URL("/settings", siteUrl());
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (authError || !userId) {
    return NextResponse.redirect(new URL("/auth/login", siteUrl()));
  }

  const params = openIdParamsFromSearchParams(request.nextUrl.searchParams);

  let steamId: bigint;
  try {
    steamId = assertOpenIdResponse(params, steamCallbackUrl());
  } catch {
    return settingsRedirect(SteamLinkError.OpenIdInvalid);
  }

  const valid = await verifySteamOpenId(params);
  if (!valid) return settingsRedirect(SteamLinkError.OpenIdInvalid);

  let summary;
  try {
    summary = await fetchPlayerSummary(steamId);
  } catch {
    return settingsRedirect(SteamLinkError.SteamProfile);
  }

  const { error: updateError } = await supabase
    .from("steam_profiles")
    .update({
      steam_id: steamId.toString(),
      display_name: summary.displayName,
      avatar_url: summary.avatarUrl,
    })
    .eq("id", userId);

  if (updateError) {
    // unique_violation on steam_id
    if (updateError.code === "23505") {
      return settingsRedirect(SteamLinkError.SteamTaken);
    }
    return settingsRedirect(SteamLinkError.UpdateFailed);
  }

  // Failures leave sync_status=failed; Settings shows it.
  await syncLibrary(supabase, userId);

  return settingsRedirect();
}
