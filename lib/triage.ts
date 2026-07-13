import type { SupabaseClient } from "@supabase/supabase-js";

export const TRIAGE_STATUSES = [
  "unreviewed",
  "hidden",
  "maybe",
  "backlog",
] as const;

export type TriageStatus = (typeof TRIAGE_STATUSES)[number];
export type TriageAction = TriageStatus | "done";
export type TriageDecision = Exclude<TriageAction, "unreviewed">;

export type TriageGame = {
  id: number;
  appId: number;
  name: string;
  headerImageUrl: string;
  playtimeForever: number;
  lastPlayedAt: string | null;
};

export type TriageSnapshot = {
  queue: TriageGame[];
  maybeQueue: TriageGame[];
  reviewed: number;
  total: number;
};

type GameRow = {
  app_id: number;
  name: string;
  header_image_url: string;
};

export type TriageRow = {
  id: number;
  triage_status: TriageStatus;
  playtime_forever: number;
  last_played_at: string | null;
  games: GameRow | GameRow[];
};

export function isTriageStatus(value: unknown): value is TriageStatus {
  return (
    typeof value === "string" &&
    TRIAGE_STATUSES.includes(value as TriageStatus)
  );
}

export function isTriageAction(value: unknown): value is TriageAction {
  return value === "done" || isTriageStatus(value);
}

export function parseTriageMutation(
  value: unknown,
): { entryId: number; status: TriageAction } | null {
  if (!value || typeof value !== "object") return null;

  const { entryId, status } = value as Record<string, unknown>;
  if (
    typeof entryId !== "number" ||
    !Number.isSafeInteger(entryId) ||
    entryId <= 0 ||
    !isTriageAction(status)
  ) {
    return null;
  }

  return { entryId, status };
}

export function sortTriageQueue(entries: TriageGame[]): TriageGame[] {
  return [...entries].sort((a, b) => {
    const zeroPlaytime =
      Number(a.playtimeForever === 0) - Number(b.playtimeForever === 0);
    if (zeroPlaytime !== 0) return -zeroPlaytime;

    const neverPlayed =
      Number(a.lastPlayedAt === null) - Number(b.lastPlayedAt === null);
    if (neverPlayed !== 0) return -neverPlayed;

    if (a.lastPlayedAt && b.lastPlayedAt) {
      const lastPlayed =
        new Date(a.lastPlayedAt).getTime() -
        new Date(b.lastPlayedAt).getTime();
      if (lastPlayed !== 0) return lastPlayed;
    }

    return a.id - b.id;
  });
}

export function buildTriageSnapshot(rows: TriageRow[]): TriageSnapshot {
  function toGame(row: TriageRow): TriageGame {
    const game = Array.isArray(row.games) ? row.games[0] : row.games;
    if (!game) throw new Error(`Library entry ${row.id} has no game`);

    return {
      id: row.id,
      appId: game.app_id,
      name: game.name,
      headerImageUrl: game.header_image_url,
      playtimeForever: row.playtime_forever,
      lastPlayedAt: row.last_played_at,
    };
  }

  const queue = rows
    .filter((row) => row.triage_status === "unreviewed")
    .map(toGame);
  const maybeQueue = rows
    .filter((row) => row.triage_status === "maybe")
    .map(toGame);

  return {
    queue: sortTriageQueue(queue),
    maybeQueue: sortTriageQueue(maybeQueue),
    reviewed: rows.length - queue.length,
    total: rows.length,
  };
}

export function triageUpdate(action: TriageAction, boardPosition?: number) {
  if (action === "done") {
    if (boardPosition === undefined) {
      throw new Error("Done board position is required");
    }

    return {
      triage_status: "backlog" as const,
      board_column: "done" as const,
      board_position: boardPosition,
    };
  }

  if (action === "backlog") return { triage_status: action };

  return {
    triage_status: action,
    board_column: null,
    board_position: null,
  };
}

export async function loadTriageSnapshot(
  supabase: SupabaseClient,
  steamProfileId: string,
): Promise<TriageSnapshot> {
  const rows: TriageRow[] = [];
  const pageSize = 1_000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("steam_profile_games")
      .select(
        "id, triage_status, playtime_forever, last_played_at, games!inner(app_id, name, header_image_url)",
      )
      .eq("steam_profile_id", steamProfileId)
      .is("removed_at", null)
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Could not load triage: ${error.message}`);

    const page = (data ?? []) as unknown as TriageRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return buildTriageSnapshot(rows);
}

export async function updateTriageEntry(
  supabase: SupabaseClient,
  steamProfileId: string,
  entryId: number,
  action: TriageAction,
): Promise<void> {
  let boardPosition: number | undefined;
  if (action === "done") {
    const { data, error } = await supabase
      .from("steam_profile_games")
      .select("board_position")
      .eq("steam_profile_id", steamProfileId)
      .eq("board_column", "done")
      .order("board_position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load Done board position: ${error.message}`);
    }
    boardPosition =
      typeof data?.board_position === "number" ? data.board_position + 1 : 0;
  }

  const { data, error } = await supabase
    .from("steam_profile_games")
    .update(triageUpdate(action, boardPosition))
    .eq("id", entryId)
    .eq("steam_profile_id", steamProfileId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Could not update triage: ${error.message}`);
  if (!data) throw new Error("Library entry not found");
}
