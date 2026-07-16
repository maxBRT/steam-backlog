import type { SupabaseClient } from "@supabase/supabase-js";

export const TRIAGE_STATUSES = [
  "unreviewed",
  "hidden",
  "someday",
  "kept",
] as const;

export type TriageStatus = (typeof TRIAGE_STATUSES)[number];
export type TriageAction = TriageStatus | "done";
export type TriageDecision = Exclude<TriageAction, "unreviewed">;
type BoardPlacementAction = Extract<TriageAction, "done" | "kept">;

const BOARD_PLACEMENT = {
  done: { triage_status: "kept", board_column: "done" },
  kept: { triage_status: "kept", board_column: "queue" },
} as const satisfies Record<
  BoardPlacementAction,
  { triage_status: "kept"; board_column: "done" | "queue" }
>;

const BOARD_COLUMN_BY_ACTION: Record<BoardPlacementAction, "done" | "queue"> = {
  done: "done",
  kept: "queue",
};

function isBoardPlacementAction(
  action: TriageAction,
): action is BoardPlacementAction {
  return action === "done" || action === "kept";
}

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
  somedayQueue: TriageGame[];
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

  function queueForStatus(status: TriageStatus): TriageGame[] {
    return sortTriageQueue(
      rows.filter((row) => row.triage_status === status).map(toGame),
    );
  }

  const unreviewed = rows.filter((row) => row.triage_status === "unreviewed");

  return {
    queue: queueForStatus("unreviewed"),
    somedayQueue: queueForStatus("someday"),
    reviewed: rows.length - unreviewed.length,
    total: rows.length,
  };
}

export function triageUpdate(action: TriageAction, boardPosition?: number) {
  if (isBoardPlacementAction(action)) {
    if (boardPosition === undefined) {
      throw new Error(
        action === "done"
          ? "Done board position is required"
          : "Kept board position is required",
      );
    }

    return {
      ...BOARD_PLACEMENT[action],
      board_position: boardPosition,
    };
  }

  return {
    triage_status: action,
    board_column: null,
    board_position: null,
  };
}

async function nextBoardPosition(
  supabase: SupabaseClient,
  steamProfileId: string,
  boardColumn: "done" | "queue",
): Promise<number> {
  const { data, error } = await supabase
    .from("steam_profile_games")
    .select("board_position")
    .eq("steam_profile_id", steamProfileId)
    .eq("board_column", boardColumn)
    .order("board_position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load ${boardColumn} board position: ${error.message}`,
    );
  }

  return typeof data?.board_position === "number" ? data.board_position + 1 : 0;
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
  if (isBoardPlacementAction(action)) {
    boardPosition = await nextBoardPosition(
      supabase,
      steamProfileId,
      BOARD_COLUMN_BY_ACTION[action],
    );
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
