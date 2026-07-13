import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncLibrary, type SyncError } from "@/lib/steam/library-sync";

export type SyncRouteError = SyncError | "unauthorized";

const STATUS: Record<SyncRouteError, number> = {
  not_linked: 400,
  private: 403,
  hidden: 403,
  failed: 502,
  unauthorized: 401,
};

export async function POST() {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (authError || !userId) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" satisfies SyncRouteError },
      { status: STATUS.unauthorized },
    );
  }

  const result = await syncLibrary(supabase, userId);
  if (!result.ok) {
    return NextResponse.json(result, { status: STATUS[result.error] });
  }
  return NextResponse.json(result);
}
