"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Gamepad2, GripVertical, Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  BOARD_COLUMN_LABELS,
  BOARD_COLUMNS,
  locateBoardCard,
  type BoardCard,
  type BoardColumn,
  type BoardSnapshot,
} from "@/lib/board";
import { playtimeLabel } from "@/lib/playtime";
import { cn } from "@/lib/utils";

const BOARD_PAGE_CLASS =
  "mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6";
const COLUMN_SHELL_CLASS =
  "flex flex-col rounded-2xl border border-zinc-200/80 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/50";
const PRIMARY_LINK_CLASS =
  "inline-flex items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200";

const ITEM_TYPE = "item";
// ponytail: CollisionPriority.Low === 1; avoid @dnd-kit/abstract dep
const COLUMN_COLLISION_PRIORITY = 1;

async function persistMove(
  entryId: number,
  targetColumn: BoardColumn,
  targetIndex: number,
) {
  const response = await fetch("/api/board/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryId, targetColumn, targetIndex }),
  });
  const body = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "That move could not be saved. Try again.");
  }
}

function ColumnEmptyPlaceholder({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-8 text-center text-xs transition-colors",
        active
          ? "border-zinc-400 bg-zinc-100/80 text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300"
          : "border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500",
      )}
    >
      Empty
    </div>
  );
}

function BoardGameCard({
  card,
  index,
  column,
}: {
  card: BoardCard;
  index: number;
  column: BoardColumn;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: card.id,
    index,
    type: ITEM_TYPE,
    accept: ITEM_TYPE,
    group: column,
  });

  return (
    <article
      ref={ref}
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm transition-opacity dark:border-zinc-800 dark:bg-zinc-900",
        isDragging && "opacity-40",
      )}
    >
      <div
        ref={handleRef}
        className="relative aspect-[460/215] cursor-grab overflow-hidden bg-zinc-200 active:cursor-grabbing dark:bg-zinc-800"
      >
        <div className="absolute left-2 top-2 z-10 flex size-7 items-center justify-center rounded-md bg-black/45 text-white">
          <GripVertical className="size-4" aria-hidden="true" />
          <span className="sr-only">Drag to move {card.name}</span>
        </div>
        {card.headerImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.headerImageUrl}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 text-zinc-500 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-400">
            <Gamepad2 className="size-8" />
          </div>
        )}
      </div>
      <div className="space-y-3 p-3">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            {card.name}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {playtimeLabel(card.playtimeForever)}
          </p>
        </div>
        <a
          href={`steam://run/${card.appId}`}
          className={cn(buttonVariants({ size: "sm" }), "h-9 w-full rounded-lg")}
        >
          <Play className="size-4" />
          Launch
        </a>
      </div>
    </article>
  );
}

function BoardColumnShell({
  column,
  compact = false,
  ref,
  children,
}: {
  column: BoardColumn;
  compact?: boolean;
  ref?: (element: Element | null) => void;
  children: ReactNode;
}) {
  return (
    <section
      ref={ref}
      className={cn(COLUMN_SHELL_CLASS, compact ? "min-h-48" : "min-h-64")}
    >
      <h2 className="px-1 pb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {BOARD_COLUMN_LABELS[column]}
      </h2>
      {children}
    </section>
  );
}

function BoardColumnSection({
  column,
  cards,
  compact = false,
}: {
  column: BoardColumn;
  cards: BoardCard[];
  compact?: boolean;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: column,
    accept: ITEM_TYPE,
    collisionPriority: COLUMN_COLLISION_PRIORITY,
  });

  return (
    <BoardColumnShell column={column} compact={compact} ref={ref}>
      {cards.length === 0 ? (
        <ColumnEmptyPlaceholder active={isDropTarget} />
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          {cards.map((card, index) => (
            <BoardGameCard
              key={card.id}
              card={card}
              index={index}
              column={column}
            />
          ))}
        </div>
      )}
    </BoardColumnShell>
  );
}

function BoardColumnsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-4">
      {children}
    </div>
  );
}

function EmptyState({ linked }: { linked: boolean }) {
  const title = linked
    ? "Your library is ready for a refresh"
    : "Bring your Steam library along";
  const copy = linked
    ? "Sync your games in Settings and they'll appear here once you keep a few from Triage."
    : "Connect Steam first, then come back whenever you feel like sorting a few games.";

  return (
    <section className="relative z-10 mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-white/60 bg-white/80 px-8 py-14 text-center shadow-2xl shadow-zinc-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/75">
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg dark:bg-white dark:text-zinc-950">
        <Gamepad2 className="size-7" />
      </span>
      <h1 className="font-[family-name:var(--font-wordmark)] text-3xl font-bold tracking-tight">
        {title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {copy}
      </p>
      <Link
        href="/settings"
        className={cn(PRIMARY_LINK_CLASS, "mt-7 h-11 px-5")}
      >
        Open Settings
      </Link>
    </section>
  );
}

function EmptyBoard({ libraryCount }: { libraryCount: number }) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/50 px-5 py-4 text-center dark:border-zinc-700 dark:bg-zinc-950/40">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {libraryCount > 0
            ? "Nothing on the board yet. Keep a few games from Triage and they'll show up here."
            : "Your board is empty."}
        </p>
        <Link
          href="/triage"
          className={cn(PRIMARY_LINK_CLASS, "mt-3 h-10 px-4")}
        >
          Go to Triage
        </Link>
      </div>

      <BoardColumnsGrid>
        {BOARD_COLUMNS.map((column) => (
          <BoardColumnShell key={column} column={column} compact>
            <ColumnEmptyPlaceholder active={false} />
          </BoardColumnShell>
        ))}
      </BoardColumnsGrid>
    </div>
  );
}

export function BoardView({
  snapshot,
  linked,
}: {
  snapshot: BoardSnapshot;
  linked: boolean;
}) {
  const [columns, setColumns] = useState(snapshot.columns);
  const [error, setError] = useState<string | null>(null);
  const previousColumns = useRef(snapshot.columns);
  const moveInFlightRef = useRef(false);
  const columnsRef = useRef(columns);

  const persistPlacement = useCallback(async (entryId: number) => {
    if (moveInFlightRef.current) return;

    const location = locateBoardCard(columnsRef.current, entryId);
    const previous = locateBoardCard(previousColumns.current, entryId);
    if (!location || !previous) return;
    if (
      location.column === previous.column &&
      location.index === previous.index
    ) {
      return;
    }

    moveInFlightRef.current = true;
    setError(null);

    try {
      await persistMove(entryId, location.column, location.index);
      previousColumns.current = columnsRef.current;
    } catch (reason) {
      columnsRef.current = previousColumns.current;
      setColumns(previousColumns.current);
      setError(
        reason instanceof Error
          ? reason.message
          : "That move could not be saved. Try again.",
      );
    } finally {
      moveInFlightRef.current = false;
    }
  }, []);

  if (!linked || snapshot.libraryCount === 0) {
    return (
      <main className="flex min-h-[calc(100vh-72px)] flex-1 items-center justify-center px-4 py-10">
        <EmptyState linked={linked} />
      </main>
    );
  }

  if (snapshot.keptCount === 0) {
    return (
      <main className={BOARD_PAGE_CLASS}>
        <EmptyBoard libraryCount={snapshot.libraryCount} />
      </main>
    );
  }

  return (
    <main className={BOARD_PAGE_CLASS}>
      {error ? (
        <p
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <DragDropProvider
        onDragStart={() => {
          previousColumns.current = columnsRef.current;
          setError(null);
        }}
        onDragOver={(event) => {
          setColumns((items) => {
            const next = move(items, event);
            columnsRef.current = next;
            return next;
          });
        }}
        onDragEnd={(event) => {
          if (event.canceled) {
            columnsRef.current = previousColumns.current;
            setColumns(previousColumns.current);
            return;
          }
          const entryId = event.operation.source?.id;
          if (typeof entryId === "number") {
            void persistPlacement(entryId);
          }
        }}
      >
        <BoardColumnsGrid>
          {BOARD_COLUMNS.map((column) => (
            <BoardColumnSection
              key={column}
              column={column}
              cards={columns[column]}
            />
          ))}
        </BoardColumnsGrid>
      </DragDropProvider>
    </main>
  );
}
