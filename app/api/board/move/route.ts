import { moveBoardEntry, parseBoardMoveMutation } from "@/lib/board";
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

  const mutation = parseBoardMoveMutation(input);
  if (!mutation) {
    return Response.json(
      { ok: false, error: "Invalid board move." },
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
    await moveBoardEntry(
      supabase,
      mutation.entryId,
      mutation.targetColumn,
      mutation.targetIndex,
    );
    return Response.json({ ok: true });
  } catch (reason) {
    const message =
      reason instanceof Error
        ? reason.message
        : "That move could not be saved. Try again.";
    console.error("[board/move]", message);
    return Response.json(
      { ok: false, error: "That move could not be saved. Try again." },
      { status: 500 },
    );
  }
}
