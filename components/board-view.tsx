"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { move } from "@dnd-kit/helpers";
import { CollisionPriority } from "@dnd-kit/abstract";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Gamepad2,
  GripVertical,
  Play,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import {
  applyBoardMove,
  BOARD_COLUMN_LABELS,
  BOARD_COLUMNS,
  DEFAULT_BOARD_RAIL_COLLAPSE,
  isCollapsedBoardRail,
  isCollapsibleBoardColumn,
  locateBoardCard,
  resolveBoardDropTargetIndex,
  toggleBoardRailCollapse,
  type BoardCard,
  type BoardColumn,
  type BoardRailCollapseState,
  type BoardSnapshot,
  type CollapsibleBoardColumn,
} from "@/lib/board";
import { playtimeLabel } from "@/lib/playtime";
import { cn } from "@/lib/utils";

const BOARD_PAGE_CLASS =
  "relative mx-auto h-[calc(100vh-72px)] w-full max-w-7xl flex-1 overflow-hidden";
const BOARD_PAGE_INNER_CLASS =
  "absolute inset-0 flex flex-col px-4 py-6 sm:px-6";
const COLUMN_SHELL_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/50";
/** Stacked: cap height so long lists scroll inside. Desktop: fill the board row. */
const COLUMN_OPEN_LAYOUT_CLASS =
  "max-h-[min(70vh,40rem)] w-full shrink-0 lg:max-h-none lg:min-h-0 lg:w-auto lg:flex-1 lg:basis-0";
const COLUMN_COLLAPSED_LAYOUT_CLASS =
  "h-14 w-full shrink-0 lg:h-auto lg:min-h-0 lg:w-14 lg:self-stretch";
const PRIMARY_LINK_CLASS =
  "inline-flex items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200";

const ITEM_TYPE = "item";

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

function BoardGameThumb({
  card,
  className,
  iconClassName = "size-8",
  preferIcon = false,
}: {
  card: BoardCard;
  className?: string;
  iconClassName?: string;
  preferIcon?: boolean;
}) {
  const imageUrl = preferIcon
    ? card.iconImageUrl || card.headerImageUrl
    : card.headerImageUrl;

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={cn("size-full object-cover", className)}
        draggable={false}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 text-zinc-500 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-400",
        className,
      )}
    >
      <Gamepad2 className={iconClassName} />
    </div>
  );
}

function BoardQueueCard({
  card,
  index,
  expanded,
  onToggleExpand,
}: {
  card: BoardCard;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { ref, isDragging } = useSortable({
    id: card.id,
    index,
    type: ITEM_TYPE,
    accept: ITEM_TYPE,
    group: "queue",
  });

  if (expanded) {
    return (
      <article
        ref={ref}
        className={cn(
          "cursor-grab overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm transition-opacity active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900",
          isDragging && "opacity-40",
        )}
      >
        <div className="relative aspect-[460/215] overflow-hidden bg-zinc-200 dark:bg-zinc-800">
          <div className="absolute left-2 top-2 z-10 flex size-7 items-center justify-center rounded-md bg-black/45 text-white">
            <GripVertical className="size-4" aria-hidden="true" />
            <span className="sr-only">Drag to move {card.name}</span>
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md bg-black/45 text-white"
            aria-expanded={true}
            aria-label={`Collapse details for ${card.name}`}
          >
            <ChevronUp className="size-4" aria-hidden="true" />
          </button>
          <BoardGameThumb card={card} />
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-3 text-sm font-semibold leading-snug">
            <Link
              href={`/game/${card.id}`}
              onPointerDown={(event) => event.stopPropagation()}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              {card.name}
            </Link>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {playtimeLabel(card.playtimeForever)}
          </p>
          {card.progress ? <ProgressBar progress={card.progress} /> : null}
        </div>
      </article>
    );
  }

  return (
    <article
      ref={ref}
      className={cn(
        "cursor-grab overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm transition-opacity active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2 p-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-400">
          <GripVertical className="size-4" aria-hidden="true" />
          <span className="sr-only">Drag to move {card.name}</span>
        </div>
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={false}
          aria-label={`Expand details for ${card.name}`}
        >
          <div className="size-8 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
            <BoardGameThumb card={card} preferIcon iconClassName="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-sm font-semibold leading-snug">
              <Link
                href={`/game/${card.id}`}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
              >
                {card.name}
              </Link>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {playtimeLabel(card.playtimeForever)}
            </p>
            {card.progress ? (
              <ProgressBar progress={card.progress} className="mt-1" />
            ) : null}
          </div>
          <ChevronDown
            className="size-4 shrink-0 text-zinc-400"
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
  );
}

function BoardGameCard({
  card,
  index,
  column,
  showLaunch,
}: {
  card: BoardCard;
  index: number;
  column: BoardColumn;
  showLaunch: boolean;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: card.id,
    index,
    type: ITEM_TYPE,
    accept: ITEM_TYPE,
    group: column,
  });
  const dragWholeCard = column === "done";

  return (
    <article
      ref={ref}
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm transition-opacity dark:border-zinc-800 dark:bg-zinc-900",
        dragWholeCard && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <div
        ref={dragWholeCard ? undefined : handleRef}
        className={cn(
          "relative aspect-[460/215] overflow-hidden bg-zinc-200 dark:bg-zinc-800",
          !dragWholeCard && "cursor-grab active:cursor-grabbing",
        )}
      >
        <div className="absolute left-2 top-2 z-10 flex size-7 items-center justify-center rounded-md bg-black/45 text-white">
          <GripVertical className="size-4" aria-hidden="true" />
          <span className="sr-only">Drag to move {card.name}</span>
        </div>
        <BoardGameThumb card={card} />
      </div>
      <div className="space-y-3 p-3">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            <Link
              href={`/game/${card.id}`}
              onPointerDown={(event) => event.stopPropagation()}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              {card.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {playtimeLabel(card.playtimeForever)}
          </p>
          {card.progress ? (
            <ProgressBar progress={card.progress} className="mt-2" />
          ) : null}
        </div>
        {showLaunch ? (
          <a
            href={`steam://run/${card.appId}`}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(buttonVariants({ size: "sm" }), "h-9 w-full rounded-lg")}
          >
            <Play className="size-4" />
            Launch
          </a>
        ) : null}
      </div>
    </article>
  );
}

function boardRailCollapseIcons(column: BoardColumn) {
  const towardLayoutEnd = column === "done";

  return {
    collapse: towardLayoutEnd ? ChevronRight : ChevronLeft,
    expand: towardLayoutEnd ? ChevronLeft : ChevronRight,
  };
}

function BoardColumnShell({
  column,
  compact = false,
  collapsed = false,
  dropActive = false,
  count,
  onToggleCollapse,
  children,
}: {
  column: BoardColumn;
  compact?: boolean;
  collapsed?: boolean;
  dropActive?: boolean;
  count?: number;
  onToggleCollapse?: () => void;
  children: ReactNode;
}) {
  const label = BOARD_COLUMN_LABELS[column];
  const { collapse: CollapseIcon, expand: ExpandIcon } =
    boardRailCollapseIcons(column);

  if (collapsed && onToggleCollapse) {
    return (
      <section
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/60 p-2 dark:border-zinc-800 dark:bg-zinc-950/50 lg:p-3",
          "transition-[width,box-shadow] duration-300 ease-in-out",
          dropActive &&
            "border-zinc-400 bg-zinc-100/80 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/60",
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-full w-full items-center justify-between gap-2 rounded-xl px-2 py-1 text-left transition hover:bg-zinc-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 lg:flex-col lg:justify-between lg:px-0 lg:py-4 dark:hover:bg-zinc-900/60"
          aria-expanded={false}
          aria-label={`Expand ${label}, ${count ?? 0} games`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 lg:[writing-mode:vertical-rl] lg:rotate-180 dark:text-zinc-400">
            {label}
          </span>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {count ?? 0}
          </span>
          <ExpandIcon
            className="size-4 shrink-0 text-zinc-400 lg:mt-1"
            aria-hidden="true"
          />
        </button>
      </section>
    );
  }

  return (
    <section className={cn(COLUMN_SHELL_CLASS, compact && "min-h-48")}>
      <div className="flex shrink-0 items-start justify-between gap-2 px-1 pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </h2>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            aria-expanded={true}
            aria-label={`Collapse ${label}`}
          >
            <CollapseIcon className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {children}
      </div>
    </section>
  );
}

function BoardColumnSection({
  column,
  cards,
  compact = false,
  collapsed = false,
  nudged = false,
  expandedQueueCardId,
  onToggleQueueExpand,
  onToggleCollapse,
  layoutClassName,
}: {
  column: BoardColumn;
  cards: BoardCard[];
  compact?: boolean;
  collapsed?: boolean;
  nudged?: boolean;
  expandedQueueCardId?: number | null;
  onToggleQueueExpand?: (cardId: number) => void;
  onToggleCollapse?: () => void;
  layoutClassName?: string;
}) {
  // Collapsed rails need High so adjacent columns don't steal hits.
  const { ref, isDropTarget } = useDroppable({
    id: column,
    accept: ITEM_TYPE,
    collisionPriority: collapsed
      ? CollisionPriority.High
      : CollisionPriority.Low,
  });

  const usesCompactCards = column === "queue";
  const showLaunch = column !== "queue";

  function renderColumnBody(): ReactNode {
    if (collapsed) return null;
    if (cards.length === 0) {
      return <ColumnEmptyPlaceholder active={isDropTarget} />;
    }

    return (
      <div className={cn("flex flex-col", usesCompactCards ? "gap-2" : "gap-3")}>
        {cards.map((card, index) =>
          usesCompactCards ? (
            <BoardQueueCard
              key={card.id}
              card={card}
              index={index}
              expanded={expandedQueueCardId === card.id}
              onToggleExpand={() => onToggleQueueExpand?.(card.id)}
            />
          ) : (
            <BoardGameCard
              key={card.id}
              card={card}
              index={index}
              column={column}
              showLaunch={showLaunch}
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden",
        layoutClassName,
        // Keep a usable hit strip while collapsed; nudge widens it further.
        collapsed && (nudged ? "lg:min-w-28" : "lg:min-w-14"),
      )}
      data-drop-active={isDropTarget ? "true" : undefined}
    >
      <BoardColumnShell
        column={column}
        compact={compact}
        collapsed={collapsed}
        dropActive={isDropTarget}
        count={cards.length}
        onToggleCollapse={onToggleCollapse}
      >
        {renderColumnBody()}
      </BoardColumnShell>
    </div>
  );
}

function boardFocusColumnLayoutClass(
  column: BoardColumn,
  railCollapse: BoardRailCollapseState,
  dragNudgeRails: Partial<BoardRailCollapseState>,
) {
  const collapsible = isCollapsibleBoardColumn(column);
  const isCollapsed = collapsible && railCollapse[column];
  const isNudged = collapsible && Boolean(dragNudgeRails[column]);
  const bothRailsCollapsed = railCollapse.queue && railCollapse.done;
  const emphasizeCenterColumns = bothRailsCollapsed && !collapsible;

  return cn(
    "min-h-0 min-w-0 overflow-hidden transition-[flex,width] duration-300 ease-in-out",
    isCollapsed
      ? cn(
          COLUMN_COLLAPSED_LAYOUT_CLASS,
          isNudged ? "lg:w-28" : "lg:w-14",
        )
      : cn(
          COLUMN_OPEN_LAYOUT_CLASS,
          emphasizeCenterColumns && "lg:flex-[1.75]",
        ),
  );
}

function BoardColumnsLayout({
  children,
  railCollapse,
}: {
  children: ReactNode;
  railCollapse?: BoardRailCollapseState;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 gap-4",
        railCollapse
          ? "flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
          : "grid grid-cols-1 lg:grid-cols-4",
      )}
    >
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

      <BoardColumnsLayout>
        {BOARD_COLUMNS.map((column) => (
          <BoardColumnShell key={column} column={column} compact>
            <ColumnEmptyPlaceholder active={false} />
          </BoardColumnShell>
        ))}
      </BoardColumnsLayout>
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
  const [collapsedRails, setCollapsedRails] = useState(
    DEFAULT_BOARD_RAIL_COLLAPSE,
  );
  const [expandedQueueCardId, setExpandedQueueCardId] = useState<number | null>(
    null,
  );
  const [dragNudgeRails, setDragNudgeRails] = useState<
    Partial<BoardRailCollapseState>
  >({});
  const [error, setError] = useState<string | null>(null);
  const previousColumns = useRef(snapshot.columns);
  const collapsedRailsAtDragStart = useRef(collapsedRails);
  const moveInFlightRef = useRef(false);
  const columnsRef = useRef(columns);

  const toggleRailCollapse = useCallback((column: CollapsibleBoardColumn) => {
    setCollapsedRails((state) => {
      const next = toggleBoardRailCollapse(state, column);
      if (column === "queue" && next.queue) {
        setExpandedQueueCardId(null);
      }
      return next;
    });
  }, []);

  const toggleQueueExpand = useCallback((cardId: number) => {
    setExpandedQueueCardId((current) => (current === cardId ? null : cardId));
  }, []);

  const updateDragNudge = useCallback(
    (targetId: unknown) => {
      if (
        typeof targetId === "string" &&
        isCollapsibleBoardColumn(targetId as BoardColumn) &&
        collapsedRails[targetId as CollapsibleBoardColumn]
      ) {
        setDragNudgeRails({ [targetId]: true });
        return;
      }

      setDragNudgeRails({});
    },
    [collapsedRails],
  );

  const persistPlacement = useCallback(async (entryId: number) => {
    if (moveInFlightRef.current) return;

    const location = locateBoardCard(columnsRef.current, entryId);
    const previous = locateBoardCard(previousColumns.current, entryId);
    if (!location || !previous) return;

    const targetIndex = resolveBoardDropTargetIndex(
      location.column,
      location.index,
      isCollapsedBoardRail(location.column, collapsedRailsAtDragStart.current),
    );

    if (
      location.column === previous.column &&
      targetIndex === previous.index
    ) {
      return;
    }

    moveInFlightRef.current = true;
    setError(null);

    try {
      await persistMove(entryId, location.column, targetIndex);
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
        <div className={BOARD_PAGE_INNER_CLASS}>
          <EmptyBoard libraryCount={snapshot.libraryCount} />
        </div>
      </main>
    );
  }

  return (
    <main className={BOARD_PAGE_CLASS}>
      <div className={BOARD_PAGE_INNER_CLASS}>
        {error ? (
          <p
            className="mb-4 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <DragDropProvider
          onDragStart={() => {
            previousColumns.current = columnsRef.current;
            collapsedRailsAtDragStart.current = collapsedRails;
            setDragNudgeRails({});
            setError(null);
          }}
          onDragOver={(event) => {
            setColumns((items) => {
              const next = move(items, event);
              columnsRef.current = next;
              return next;
            });
            updateDragNudge(event.operation.target?.id);
          }}
          onDragEnd={(event) => {
            setDragNudgeRails({});

            if (event.canceled) {
              columnsRef.current = previousColumns.current;
              setColumns(previousColumns.current);
              return;
            }

            const entryId = event.operation.source?.id;
            if (typeof entryId !== "number") return;

            const location = locateBoardCard(columnsRef.current, entryId);
            if (
              location &&
              isCollapsedBoardRail(
                location.column,
                collapsedRailsAtDragStart.current,
              )
            ) {
              const next = applyBoardMove(
                columnsRef.current,
                entryId,
                location.column,
                0,
              );
              columnsRef.current = next;
              setColumns(next);
            }

            void persistPlacement(entryId);
          }}
        >
        <BoardColumnsLayout railCollapse={collapsedRails}>
          {BOARD_COLUMNS.map((column) => {
            const collapsible = isCollapsibleBoardColumn(column);
            const isCollapsed = collapsible && collapsedRails[column];
            const isNudged = collapsible && Boolean(dragNudgeRails[column]);

            return (
              <BoardColumnSection
                key={column}
                column={column}
                cards={columns[column]}
                collapsed={isCollapsed}
                nudged={isNudged}
                expandedQueueCardId={expandedQueueCardId}
                onToggleQueueExpand={toggleQueueExpand}
                onToggleCollapse={
                  collapsible ? () => toggleRailCollapse(column) : undefined
                }
                layoutClassName={boardFocusColumnLayoutClass(
                  column,
                  collapsedRails,
                  dragNudgeRails,
                )}
              />
            );
          })}
        </BoardColumnsLayout>
        </DragDropProvider>
      </div>
    </main>
  );
}
