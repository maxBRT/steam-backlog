import { notFound, redirect } from "next/navigation";
import { GameDetailView } from "@/components/game-detail-view";
import { loadGameDetail } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId: rawEntryId } = await params;
  const entryId = Number(rawEntryId);
  if (!Number.isSafeInteger(entryId) || entryId <= 0) {
    notFound();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const steamProfileId = data?.claims?.sub;

  if (error || !steamProfileId) {
    redirect("/auth/login");
  }

  const snapshot = await loadGameDetail(supabase, steamProfileId, entryId);
  if (!snapshot) {
    notFound();
  }

  return <GameDetailView initialSnapshot={snapshot} />;
}
