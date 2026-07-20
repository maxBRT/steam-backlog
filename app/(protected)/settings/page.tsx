import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LibrarySyncControls } from "@/components/library-sync-controls";
import { PlayingAutoTrackControls } from "@/components/playing-auto-track-controls";
import { DEFAULT_PLAYING_AUTO_TRACK } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { isSteamLinkError, SteamLinkError } from "@/lib/steam/link-errors";

const ERROR_MESSAGES: Record<SteamLinkError, string> = {
  [SteamLinkError.SteamTaken]:
    "That Steam account is already linked to another Steamlog account.",
  [SteamLinkError.OpenIdInvalid]:
    "Steam login could not be verified. Try again.",
  [SteamLinkError.SteamProfile]: "Could not load Steam profile. Try again.",
  [SteamLinkError.UpdateFailed]: "Could not save Steam link. Try again.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  const { data: profile } = userId
    ? await supabase
        .from("steam_profiles")
        .select(
          "steam_id, display_name, avatar_url, sync_status, last_synced_at, playing_auto_track",
        )
        .eq("id", userId)
        .maybeSingle()
    : { data: null };

  const linked = Boolean(profile?.steam_id);
  const errorMessage = error
    ? isSteamLinkError(error)
      ? ERROR_MESSAGES[error]
      : "Something went wrong."
    : null;

  const syncStatus =
    profile?.sync_status === "syncing" || profile?.sync_status === "failed"
      ? profile.sync_status
      : "idle";

  const playingAutoTrack =
    profile?.playing_auto_track ?? DEFAULT_PLAYING_AUTO_TRACK;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Steam account</CardTitle>
          <CardDescription>
            Link your Steam account so Steamlog can sync your library.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {linked ? (
            <>
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="size-12 rounded-full"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {profile?.display_name || "Steam linked"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile?.steam_id}
                  </p>
                </div>
              </div>
              <LibrarySyncControls
                syncStatus={syncStatus}
                lastSyncedAt={profile?.last_synced_at ?? null}
              />
            </>
          ) : (
            <a
              href="/api/steam/openid"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Connect Steam
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>
            Control when Progress tracking starts for games you move into
            Playing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlayingAutoTrackControls playingAutoTrack={playingAutoTrack} />
        </CardContent>
      </Card>
    </main>
  );
}
