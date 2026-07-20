export type AchievementDefinition = {
  apiName: string;
  displayName: string;
  description: string;
  iconUrl: string;
  iconGrayUrl: string;
  hidden: boolean;
};

export type AchievementUnlockState = {
  apiName: string;
  unlocked: boolean;
  unlockedAt: Date | null;
};

export type GameAchievements = {
  definitions: AchievementDefinition[];
  unlocks: AchievementUnlockState[];
};

export class AchievementsUnavailableError extends Error {
  constructor(message = "Steam achievements are unavailable") {
    super(message);
    this.name = "AchievementsUnavailableError";
  }
}

type SchemaResponse = {
  game?: {
    availableGameStats?: {
      achievements?: Array<{
        name?: string;
        displayName?: string;
        description?: string;
        icon?: string;
        icongray?: string;
        hidden?: number;
      }>;
    };
  };
};

type PlayerAchievementsResponse = {
  playerstats?: {
    success?: boolean;
    achievements?: Array<{
      apiname?: string;
      achieved?: number;
      unlocktime?: number;
    }>;
    error?: string;
  };
};

/**
 * Fetches Achievement catalog definitions (schema-for-game) and Achievement unlocks.
 * Injectable fetch matches owned-games dependency style for Library sync.
 */
export async function fetchAchievementsForGame(
  steamId: bigint,
  appId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<GameAchievements> {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) throw new Error("STEAM_WEB_API_KEY is not set");

  const schemaUrl = new URL(
    "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/",
  );
  schemaUrl.searchParams.set("key", key);
  schemaUrl.searchParams.set("appid", String(appId));

  const playerUrl = new URL(
    "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
  );
  playerUrl.searchParams.set("key", key);
  playerUrl.searchParams.set("steamid", steamId.toString());
  playerUrl.searchParams.set("appid", String(appId));

  const [schemaRes, playerRes] = await Promise.all([
    fetchImpl(schemaUrl),
    fetchImpl(playerUrl),
  ]);

  if (!schemaRes.ok) {
    throw new AchievementsUnavailableError(
      `GetSchemaForGame failed: ${schemaRes.status}`,
    );
  }
  if (!playerRes.ok) {
    throw new AchievementsUnavailableError(
      `GetPlayerAchievements failed: ${playerRes.status}`,
    );
  }

  const schema = (await schemaRes.json()) as SchemaResponse;
  const player = (await playerRes.json()) as PlayerAchievementsResponse;

  if (player.playerstats?.success === false) {
    throw new AchievementsUnavailableError(
      player.playerstats.error ?? "GetPlayerAchievements reported failure",
    );
  }

  const schemaAchievements =
    schema.game?.availableGameStats?.achievements ?? [];
  const definitions: AchievementDefinition[] = schemaAchievements
    .filter((a) => a.name !== undefined && a.name.length > 0)
    .map((a) => ({
      apiName: a.name!,
      displayName: a.displayName ?? "",
      description: a.description ?? "",
      iconUrl: a.icon ?? "",
      iconGrayUrl: a.icongray ?? "",
      hidden: a.hidden === 1,
    }));

  const playerAchievements = player.playerstats?.achievements ?? [];
  const unlocks: AchievementUnlockState[] = playerAchievements
    .filter((a) => a.apiname !== undefined && a.apiname.length > 0)
    .map((a) => {
      const unlocked = a.achieved === 1;
      const unlocktime = a.unlocktime ?? 0;
      return {
        apiName: a.apiname!,
        unlocked,
        unlockedAt:
          unlocked && unlocktime > 0 ? new Date(unlocktime * 1000) : null,
      };
    });

  // Games with no achievements: empty definitions/unlocks (caller must not invent Progress).
  if (definitions.length === 0 && unlocks.length === 0) {
    return { definitions: [], unlocks: [] };
  }

  return { definitions, unlocks };
}
