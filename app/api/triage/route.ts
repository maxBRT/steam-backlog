import { createClient } from "@/lib/supabase/server";
import { parseTriageMutation, updateTriageEntry } from "@/lib/triage";

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

  const mutation = parseTriageMutation(input);
  if (!mutation) {
    return Response.json(
      { ok: false, error: "Invalid triage action." },
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
    await updateTriageEntry(
      supabase,
      steamProfileId,
      mutation.entryId,
      mutation.status,
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "That choice could not be saved. Try again." },
      { status: 500 },
    );
  }
}
