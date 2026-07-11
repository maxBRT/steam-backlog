export type OwnedGame = {
  appId: number;
  name?: string;
  playtimeForever: number;
  playtime2Weeks: number;
  lastPlayedAt: Date | null;
  headerImageUrl?: string;
};

export class PrivateGamesError extends Error {
  constructor(message = "Game library is private or inaccessible") {
    super(message);
    this.name = "PrivateGamesError";
  }
}

export class GameDetailsHiddenError extends Error {
  constructor(message = "Game details are hidden by privacy settings") {
    super(message);
    this.name = "GameDetailsHiddenError";
  }
}

type SteamOwnedGamesResponse = {
  response?: {
    game_count?: number;
    games?: Array<{
      appid?: number;
      name?: string;
      playtime_forever?: number;
      playtime_2weeks?: number;
      rtime_last_played?: number;
      img_icon_url?: string;
    }>;
  };
};

export type FetchOwnedGamesOptions = {
  includeAppInfo?: boolean;
  includePlayedFreeGames?: boolean;
  skipUnvettedApps?: boolean;
};

export async function fetchOwnedGames(
  steamId: bigint,
  options: FetchOwnedGamesOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<OwnedGame[]> {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) throw new Error("STEAM_WEB_API_KEY is not set");

  const {
    includeAppInfo = true,
    includePlayedFreeGames = true,
    skipUnvettedApps = false,
  } = options;

  const url = new URL(
    "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
  );
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamId.toString());
  url.searchParams.set("include_appinfo", includeAppInfo ? "1" : "0");
  url.searchParams.set(
    "include_played_free_games",
    includePlayedFreeGames ? "1" : "0",
  );
  url.searchParams.set("skip_unvetted_apps", skipUnvettedApps ? "1" : "0");

  const res = await fetchImpl(url);
  if (!res.ok) {
    if (res.status === 403) {
      throw new PrivateGamesError();
    }
    throw new Error(`GetOwnedGames failed: ${res.status}`);
  }

  const data = (await res.json()) as SteamOwnedGamesResponse;

  if (!data.response) {
    throw new PrivateGamesError();
  }

  const games = data.response.games ?? [];
  const gameCount = data.response.game_count ?? 0;

  if (gameCount === 0) {
    return [];
  }

  if (games.length === 0 && gameCount > 0) {
    throw new GameDetailsHiddenError();
  }

  return games
    .filter((game) => game.appid !== undefined)
    .map((game) => {
      const appId = game.appid!;
      const lastPlayedAt =
        game.rtime_last_played && game.rtime_last_played > 0
          ? new Date(game.rtime_last_played * 1000)
          : null;

      const headerImageUrl = game.img_icon_url
        ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
        : undefined;

      return {
        appId,
        name: game.name,
        playtimeForever: game.playtime_forever ?? 0,
        playtime2Weeks: game.playtime_2weeks ?? 0,
        lastPlayedAt,
        headerImageUrl,
      };
    });
}
