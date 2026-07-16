---
linear: MXB-80
status: accepted
---

# Board

Spec from the Board grilling session. Complements [`CONTEXT.md`](../CONTEXT.md) and [data-model](data-model.md). Tracker copy: [MXB-80](https://linear.app/steam-backlog/issue/MXB-80). Implementation: MXB-77 → MXB-78 → MXB-79.

## Problem Statement

Steam libraries are huge. After triage, players still need a calm place to decide what to play next. Today the app can intake games (triage) but has no real Board: kept games do not reliably land on columns, the kanban route is a stub, and there is no way to rearrange or launch from a play surface.

## Solution

Ship the Board: a desktop-first kanban of kept library entries across Queue, Up Next, Playing, and Done. Triage language matches the glossary (`someday` / `kept`). Keeping a game places it on Queue (Done at triage places it in Done). Cards show art, name, playtime, and Launch. Players rearrange by drag-and-drop with optimistic saves. Empty states match triage when Steam is unlinked or the library was never synced.

## User Stories

1. As a signed-in player, I want a Board of games I kept, so that I can decide what to play without re-triaging my whole library.
2. As a player who just marked a game Kept in triage, I want it to appear at the end of Queue, so that every keep decision immediately shows up on the Board.
3. As a player who marks a game Done during triage, I want it to land in the Done column, so that already-finished games do not clog Queue.
4. As a player, I want Board columns Queue, Up Next, Playing, and Done, so that my intent to play is staged clearly.
5. As a player, I want each Board card to show the game’s header image, so that I recognize games visually.
6. As a player, I want each Board card to show the game’s name, so that I can identify it without relying on art alone.
7. As a player, I want each Board card to show playtime forever, so that I can see how much I’ve already invested.
8. As a player, I want a Launch action on each card that opens `steam://run/{appid}`, so that I can start the game from the Board.
9. As a desktop player, I want to drag cards between columns, so that I can update where a game sits in my play plan.
10. As a desktop player, I want to reorder cards within a column, so that priority inside a column is explicit.
11. As a player, I want moves to feel instant (optimistic), so that dragging does not wait on the network.
12. As a player, I want a failed save to put the card back and show a short error, so that I am not left with a lying UI.
13. As a player with Steam not linked, I want the Board to show the same Settings empty state as triage, so that I know to connect Steam first.
14. As a player who linked Steam but never synced, I want the same Settings empty state as triage, so that I know to sync my library.
15. As a player with a synced library but zero kept games, I want four empty columns and a CTA to triage, so that I know the next step without a dead-end page.
16. As a player, I want removed library entries hidden from the Board, so that games Steam no longer lists do not clutter my plan.
17. As a player, I want removed entries to keep their triage and board fields in the database, so that a later reappearance can restore context.
18. As a player, I do not want Hide or Someday actions on the Board for MVP, so that the Board stays focused on arranging what I kept.
19. As a player, I do not want a WIP soft limit on Playing for MVP, so that the Board stays simple.
20. As a player on touch devices, I accept best-effort dragging only, so that desktop quality ships first.
21. As a player, I want triage copy and statuses to say Someday and Kept (not Maybe and Backlog), so that the product language matches how we talk about the Board.
22. As a player who Hides a game in triage, I want it cleared from the Board, so that hidden games never appear as kept cards.
23. As a player who marks a game Someday in triage, I want it off the Board, so that only kept games appear in columns.
24. As a player refreshing the Board, I want card order to match what I last successfully saved, so that arrangement survives reload.
25. As a player with many kept games in one column, I want stable integer positions without duplicates, so that ordering stays consistent.
26. As a player opening Launch, I want the Steam client protocol URL for that app id, so that Steam handles starting the title.
27. As a player navigating from login or nav to the Board, I want `/kanban` to be the Board surface, so that the existing entry points keep working.
28. As a maintainer, I want glossary terms used in the product (`kept`, `someday`, Board, Launch), so that agents and humans share one language.
29. As a maintainer, I want enum values in the database renamed to match the glossary, so that schema and UI do not diverge.
30. As a player who already has `backlog`/`maybe` rows, I want a migration that renames them in place, so that existing data keeps working under the new names.
31. As a player arranging games, I want drag-and-drop only (no move menus) for MVP, so that there is one clear interaction.
32. As a player looking at an empty Queue but filled Playing, I want other columns still visible, so that the Board layout stays predictable.
33. As a player who completed triage for now, I want a clear path from triage’s caught-up state to the Board, so that keep decisions lead into arranging.
34. As a player, I want Board queries scoped to my steam profile only, so that I never see another profile’s cards.
35. As a player offline mid-drag save, I want revert + error rather than silent loss, so that I can retry.

## Implementation Decisions

- Glossary is source of truth: triage statuses are `unreviewed`, `hidden`, `someday`, `kept`. Avoid `maybe` and `backlog` as status names in product language.
- Migrate Postgres `triage_status` enum values `maybe`→`someday`, `backlog`→`kept`, and update application types, UI copy, API payloads, and tests accordingly.
- Invariant: board fields non-null only when status is kept; every kept entry is always placed.
- Triage Kept (non-Done): set `board_column = queue` and append next `board_position` in that column for the steam profile.
- Triage Done: set `triage_status = kept`, `board_column = done`, append position in Done (existing behavior under new names).
- Hide and Someday clear `board_column` and `board_position`.
- Board loads kept entries with board fields set, `removed_at` null, ordered by `board_position` within each column.
- Board columns left-to-right: queue, up_next, playing, done.
- Board card: header image, name, playtime forever, Launch via `steam://run/{appid}`.
- Board MVP actions: drag-and-drop between columns and reorder within column; Launch. No triage exits from the Board.
- Moves are optimistic; failed persistence reverts UI and shows a short error.
- Desktop pointer first; touch best-effort only.
- Empty states: unlinked or unsynced → same Settings CTA empty state as triage; linked library with zero kept → four empty columns + triage CTA.
- No WIP soft limit on Playing for MVP.
- No dedicated Someday or Hidden list pages in this spec.
- Extend the existing triage domain module for rename + kept placement.
- Add a board domain module (same style as triage) for snapshot building, move/reorder position rewrites, and move mutation parsing; HTTP/UI stay thin over it.
- Persist moves by updating `board_column` and rewriting contiguous integer `board_position` values in affected column(s) per steam profile (respect existing partial unique index).
- Implementation sliced as MXB-77 (rename + place), MXB-78 (read UI), MXB-79 (DnD persist), in that blocking order.

## Testing Decisions

- Prefer testing external behavior of domain modules, not React/DnD wiring or Supabase client internals.
- Good tests: given library-entry rows or a move intent, assert resulting snapshot shape, placement fields, or rewritten positions; with a mocked Supabase client, assert the update payload and scoping to the steam profile.
- Seam 1 (existing triage domain module): enum rename surface (`someday`/`kept`), Kept appends to queue, Done places in done, Hide/Someday clear board fields. Prior art: existing triage unit tests with pure helpers and mocked Supabase updates.
- Seam 2 (new board domain module): build board snapshot (column buckets, order, omit removed); apply move/reorder position rewrites; parse move mutations. Prior art: same testing style as triage domain tests (Node test runner, no browser).
- Do not require browser or end-to-end DnD tests for MVP; optimistic UI revert can stay thin at the UI layer if domain persistence behavior is covered.
- Run the repo’s existing `npm run test` (and typecheck if present) before considering a ticket done.

## Out of Scope

- WIP soft limit / Playing capacity nudge
- Hide or Someday actions from Board cards
- Dedicated Someday or Hidden browse/un-hide pages
- Polished touch/Steam Deck Board DnD
- Sale prices, HLTB, multi-platform import, billing, analytics, shareable profiles, and other canceled post-MVP ideas
- Postgres check constraints for triage/board invariants (app-layer only for MVP)
- Changing auth, Steam link, or library sync beyond what rename/placement requires

## Further Notes

- Thin predecessor Board issues were deleted and replaced by MXB-77/78/79.
- Published on Linear as [MXB-80](https://linear.app/steam-backlog/issue/MXB-80); keep this file in sync when the spec changes.
- Agents should treat CONTEXT.md, docs/data-model.md, and this spec as canonical for Board work.
