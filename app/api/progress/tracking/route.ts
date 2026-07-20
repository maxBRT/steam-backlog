import {
  LibraryEntryNotFoundError,
  parseProgressTrackingMutation,
  ProgressTrackingNotAllowedError,
  setProgressTracking,
} from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  if (!input || typeof input !== "object") {
    return Response.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const { entryId, ...rest } = input as Record<string, unknown>;
  const mutation = parseProgressTrackingMutation(rest);
  if (
    typeof entryId !== "number" ||
    !Number.isSafeInteger(entryId) ||
    entryId <= 0 ||
    !mutation
  ) {
    return Response.json(
      { ok: false, error: "Invalid Progress tracking value." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const steamProfileId = data?.claims?.sub;
  if (error || !steamProfileId) {
    return Response.json(
      { ok: false, error: "Sign in again to continue." },
      { status: 401 },
    );
  }

  try {
    const result = await setProgressTracking(
      supabase,
      steamProfileId,
      entryId,
      mutation.progressTracking,
    );
    return Response.json({ ok: true, snapshot: result.snapshot });
  } catch (reason) {
    if (reason instanceof LibraryEntryNotFoundError) {
      return Response.json({ ok: false, error: reason.message }, { status: 404 });
    }
    if (reason instanceof ProgressTrackingNotAllowedError) {
      return Response.json({ ok: false, error: reason.message }, { status: 400 });
    }
    const message =
      reason instanceof Error
        ? reason.message
        : "Could not update Progress tracking.";
    console.error("[progress/tracking]", message);
    return Response.json(
      { ok: false, error: "Could not update Progress tracking." },
      { status: 500 },
    );
  }
}
