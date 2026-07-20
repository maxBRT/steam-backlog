import {
  parsePlayingAutoTrackMutation,
  updatePlayingAutoTrack,
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

  const mutation = parsePlayingAutoTrackMutation(input);
  if (!mutation) {
    return Response.json(
      { ok: false, error: "Invalid Playing auto-track value." },
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
    await updatePlayingAutoTrack(
      supabase,
      steamProfileId,
      mutation.playingAutoTrack,
    );
    return Response.json({ ok: true });
  } catch (reason) {
    const message =
      reason instanceof Error
        ? reason.message
        : "Could not save Playing auto-track.";
    console.error("[settings/playing-auto-track]", message);
    return Response.json(
      { ok: false, error: "Could not save Playing auto-track." },
      { status: 500 },
    );
  }
}
