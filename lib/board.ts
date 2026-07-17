import type { SupabaseClient } from "@supabase/supabase-js";

export const BOARD_COLUMNS = [
  "queue",
  "up_next",
  "playing",
  "done",
] as const;

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export const BOARD_COLUMN_LABELS: Record<BoardColumn, string> = {
  queue: "Queue",
  up_next: "Up Next",
  playing: "Playing",
  done: "Done",
};

export const COLLAPSIBLE_BOARD_COLUMNS = ["queue", "done"] as const;

export type CollapsibleBoardColumn = (typeof COLLAPSIBLE_BOARD_COLUMNS)[number];

export type BoardRailCollapseState = Record<CollapsibleBoardColumn, boolean>;

export const DEFAULT_BOARD_RAIL_COLLAPSE: BoardRailCollapseState = {
  queue: true,
  done: true,
};

export function isCollapsibleBoardColumn(
  column: BoardColumn,
): column is CollapsibleBoardColumn {
  return COLLAPSIBLE_BOARD_COLUMNS.some(
    (collapsibleColumn) => collapsibleColumn === column,
  );
}

export function isCollapsedBoardRail(
  column: BoardColumn,
  railCollapse: BoardRailCollapseState,
): boolean {
  return isCollapsibleBoardColumn(column) && railCollapse[column];
}

export function toggleBoardRailCollapse(
  state: BoardRailCollapseState,
  column: CollapsibleBoardColumn,
): BoardRailCollapseState {
  return { ...state, [column]: !state[column] };
}

export type BoardCard = {
  id: number;
  appId: number;
  name: string;
  headerImageUrl: string;
  iconImageUrl: string;
  playtimeForever: number;
};

export type BoardSnapshot = {
  columns: Record<BoardColumn, BoardCard[]>;
  libraryCount: number;
  keptCount: number;
};

type GameRow = {
  app_id: number;
  name: string;
  header_image_url: string;
  icon_image_url: string;
};

export type BoardRow = {
  id: number;
  board_column: BoardColumn;
  board_position: number;
  playtime_forever: number;
  games: GameRow | GameRow[];
};

export type BoardPlacementUpdate = {
  id: number;
  board_column: BoardColumn;
  board_position: number;
};

export type BoardMoveMutation = {
  entryId: number;
  targetColumn: BoardColumn;
  targetIndex: number;
};

function emptyColumns<T>(): Record<BoardColumn, T[]> {
  return Object.fromEntries(
    BOARD_COLUMNS.map((column) => [column, [] as T[]]),
  ) as Record<BoardColumn, T[]>;
}

function clampInsertIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length));
}

function findEntryLocation(
  columns: Record<BoardColumn, number[]>,
  entryId: number,
): { column: BoardColumn; index: number } | null {
  for (const column of BOARD_COLUMNS) {
    const index = columns[column].indexOf(entryId);
    if (index !== -1) {
      return { column, index };
    }
  }
  return null;
}

export function locateBoardCard(
  columns: Record<BoardColumn, BoardCard[]>,
  entryId: number,
): { column: BoardColumn; index: number } | null {
  for (const column of BOARD_COLUMNS) {
    const index = columns[column].findIndex((entry) => entry.id === entryId);
    if (index !== -1) {
      return { column, index };
    }
  }
  return null;
}

export function buildBoardSnapshot(
  rows: BoardRow[],
  libraryCount: number,
): BoardSnapshot {
  function toCard(row: BoardRow): BoardCard {
    const game = Array.isArray(row.games) ? row.games[0] : row.games;
    if (!game) throw new Error(`Library entry ${row.id} has no game`);

    return {
      id: row.id,
      appId: game.app_id,
      name: game.name,
      headerImageUrl: game.header_image_url,
      iconImageUrl: game.icon_image_url,
      playtimeForever: row.playtime_forever,
    };
  }

  const rowsByColumn = emptyColumns<BoardRow>();

  for (const row of rows) {
    rowsByColumn[row.board_column].push(row);
  }

  const columns = Object.fromEntries(
    BOARD_COLUMNS.map((column) => [
      column,
      rowsByColumn[column]
        .sort((a, b) => a.board_position - b.board_position)
        .map(toCard),
    ]),
  ) as Record<BoardColumn, BoardCard[]>;

  return {
    columns,
    libraryCount,
    keptCount: rows.length,
  };
}

export async function loadBoardSnapshot(
  supabase: SupabaseClient,
  steamProfileId: string,
): Promise<BoardSnapshot> {
  const { count, error: countError } = await supabase
    .from("steam_profile_games")
    .select("id", { count: "exact", head: true })
    .eq("steam_profile_id", steamProfileId)
    .is("removed_at", null);

  if (countError) {
    throw new Error(`Could not load library count: ${countError.message}`);
  }

  const rows: BoardRow[] = [];
  const pageSize = 1_000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("steam_profile_games")
      .select(
        "id, board_column, board_position, playtime_forever, games!inner(app_id, name, header_image_url, icon_image_url)",
      )
      .eq("steam_profile_id", steamProfileId)
      .eq("triage_status", "kept")
      .not("board_column", "is", null)
      .not("board_position", "is", null)
      .is("removed_at", null)
      .order("board_position")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Could not load board: ${error.message}`);

    const page = (data ?? []) as unknown as BoardRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return buildBoardSnapshot(rows, count ?? 0);
}

export function applyBoardMove(
  columns: Record<BoardColumn, BoardCard[]>,
  entryId: number,
  targetColumn: BoardColumn,
  targetIndex: number,
): Record<BoardColumn, BoardCard[]> {
  const location = locateBoardCard(columns, entryId);
  if (!location) {
    throw new Error("Entry not on board");
  }

  const card = columns[location.column][location.index];
  if (!card) {
    throw new Error("Entry not on board");
  }

  const next = emptyColumns<BoardCard>();
  for (const column of BOARD_COLUMNS) {
    next[column] = [...columns[column]];
  }

  next[location.column] = next[location.column].filter(
    (entry) => entry.id !== entryId,
  );
  next[targetColumn].splice(
    clampInsertIndex(targetIndex, next[targetColumn].length),
    0,
    card,
  );
  return next;
}

export function planBoardMove(
  columns: Record<BoardColumn, number[]>,
  entryId: number,
  targetColumn: BoardColumn,
  targetIndex: number,
): BoardPlacementUpdate[] {
  const location = findEntryLocation(columns, entryId);
  if (!location) {
    throw new Error("Entry not on board");
  }

  const next = emptyColumns<number>();
  for (const column of BOARD_COLUMNS) {
    next[column] = [...columns[column]];
  }

  next[location.column].splice(location.index, 1);
  next[targetColumn].splice(
    clampInsertIndex(targetIndex, next[targetColumn].length),
    0,
    entryId,
  );

  const affected =
    location.column === targetColumn
      ? [targetColumn]
      : [location.column, targetColumn];

  const updates: BoardPlacementUpdate[] = [];
  for (const column of affected) {
    next[column].forEach((id, board_position) => {
      updates.push({ id, board_column: column, board_position });
    });
  }

  return updates;
}

export function resolveBoardDropTargetIndex(
  targetColumn: BoardColumn,
  targetIndex: number,
  isTargetColumnCollapsed: boolean,
): number {
  if (isTargetColumnCollapsed && isCollapsibleBoardColumn(targetColumn)) {
    return 0;
  }
  return targetIndex;
}

function isBoardColumn(value: unknown): value is BoardColumn {
  return (
    typeof value === "string" &&
    BOARD_COLUMNS.includes(value as BoardColumn)
  );
}

export function parseBoardMoveMutation(
  value: unknown,
): BoardMoveMutation | null {
  if (!value || typeof value !== "object") return null;

  const { entryId, targetColumn, targetIndex } = value as Record<
    string,
    unknown
  >;
  if (
    typeof entryId !== "number" ||
    !Number.isSafeInteger(entryId) ||
    entryId <= 0 ||
    !isBoardColumn(targetColumn) ||
    typeof targetIndex !== "number" ||
    !Number.isSafeInteger(targetIndex) ||
    targetIndex < 0
  ) {
    return null;
  }

  return { entryId, targetColumn, targetIndex };
}

export async function moveBoardEntry(
  supabase: SupabaseClient,
  entryId: number,
  targetColumn: BoardColumn,
  targetIndex: number,
): Promise<void> {
  // ponytail: one RPC transaction; refresh never sees staged positions.
  const { error } = await supabase.rpc("move_board_entry", {
    p_entry_id: entryId,
    p_target_column: targetColumn,
    p_target_index: targetIndex,
  });

  if (error) {
    throw new Error(`Could not save board move: ${error.message}`);
  }
}
