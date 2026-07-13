export type PlayerSummary = {
  displayName: string;
  avatarUrl: string;
};

type SteamPlayerSummariesResponse = {
  response?: {
    players?: Array<{
      personaname?: string;
      avatarfull?: string;
    }>;
  };
};

export async function fetchPlayerSummary(
  steamId: bigint,
  fetchImpl: typeof fetch = fetch,
): Promise<PlayerSummary> {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) throw new Error("STEAM_WEB_API_KEY is not set");

  const url = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
  );
  url.searchParams.set("key", key);
  url.searchParams.set("steamids", steamId.toString());

  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`GetPlayerSummaries failed: ${res.status}`);

  const data = (await res.json()) as SteamPlayerSummariesResponse;
  const player = data.response?.players?.[0];
  if (!player) throw new Error("Steam profile not found");

  return {
    displayName: player.personaname ?? "",
    avatarUrl: player.avatarfull ?? "",
  };
}
