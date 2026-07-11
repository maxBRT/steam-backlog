import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSteamLoginUrl } from "@/lib/steam/openid";
import { siteUrl } from "@/lib/site-url";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.redirect(new URL("/auth/login", siteUrl()));
  }

  return NextResponse.redirect(buildSteamLoginUrl());
}
