import { redirect } from "next/navigation";
import { TriageDeck } from "@/components/triage-deck";
import { createClient } from "@/lib/supabase/server";
import { loadTriageSnapshot } from "@/lib/triage";

export default async function TriagePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const steamProfileId = data?.claims?.sub;

  if (error || !steamProfileId) {
    redirect("/auth/login");
  }

  const [{ data: profile, error: profileError }, snapshot] = await Promise.all([
    supabase
      .from("steam_profiles")
      .select("steam_id")
      .eq("id", steamProfileId)
      .maybeSingle(),
    loadTriageSnapshot(supabase, steamProfileId),
  ]);

  if (profileError) {
    throw new Error(`Could not load Steam profile: ${profileError.message}`);
  }

  return (
    <TriageDeck
      initialSnapshot={snapshot}
      linked={Boolean(profile?.steam_id)}
    />
  );
}
