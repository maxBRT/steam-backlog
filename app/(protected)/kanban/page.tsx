import { redirect } from "next/navigation";
import { BoardView } from "@/components/board-view";
import { loadBoardSnapshot } from "@/lib/board";
import { createClient } from "@/lib/supabase/server";

export default async function KanbanPage() {
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
    loadBoardSnapshot(supabase, steamProfileId),
  ]);

  if (profileError) {
    throw new Error(`Could not load Steam profile: ${profileError.message}`);
  }

  return (
    <BoardView snapshot={snapshot} linked={Boolean(profile?.steam_id)} />
  );
}
