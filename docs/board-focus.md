---
linear: MXB-81
status: accepted
---

# Board focus

Spec from the Board focus grilling session. Complements [`CONTEXT.md`](../CONTEXT.md), [data-model](data-model.md), and [Board](board.md). Tracker copy: [MXB-81](https://linear.app/steam-backlog/issue/MXB-81).

## Problem Statement

After triage, the Board is supposed to help a player pick what to play next. With long Queue and Done columns of full-height cards beside Up Next and Playing, the surface is noisy and hard to scan. The decision columns do not get visual priority, so “tonight’s game” is buried in a full four-column inventory.

## Solution

Keep the four board columns and existing move persistence, but make the Board open as a calm shortlist: Queue and Done start collapsed as narrow rails so Up Next and Playing own the width. Queue uses compact, always-draggable rows (header thumb, name, playtime) with one-at-a-time expand for recognition and no Launch. Done keeps full cards with Launch when expanded. Collapsed rails stay drop targets: drag-over nudges them slightly open, drops prepend, then the rail shrinks back. Collapse/expand is session state only and resets on refresh.

## User Stories

1. As a signed-in player, I want the Board to open focused on Up Next and Playing, so that I can pick tonight’s game without scanning Queue and Done first.
2. As a player, I want Queue collapsed by default, so that a long kept list does not dominate the first view.
3. As a player, I want Done collapsed by default, so that finished games do not compete with what to play next.
4. As a player, I want collapsed Queue and Done to remain visible as narrow rails with a count, so that I still know the pipeline exists.
5. As a player, I want Up Next and Playing to receive most of the horizontal space when Queue and Done are collapsed, so that the shortlist is easy to read.
6. As a player, I want a short animation when collapsing or expanding Queue or Done, so that width handed to Up Next and Playing feels intentional rather than abrupt.
7. As a player, I want to expand Queue or Done on demand, so that I can arrange kept library entries when I am not just picking tonight’s game.
8. As a player, I want collapse and expand choices to last for the current visit only, so that every fresh Board load returns to the calm default.
9. As a player refreshing the Board, I want Queue and Done collapsed again, so that I do not inherit a noisy arranging layout from last time.
10. As a desktop player, I want to drop a card onto a collapsed Queue or Done rail, so that I can park or finish a game without fully opening that column.
11. As a desktop player dragging over a collapsed rail, I want the rail to nudge slightly open, so that I can tell it will accept the drop.
12. As a desktop player after dropping onto a nudged rail, I want the rail to shrink back, so that the Board returns to the calm shortlist layout.
13. As a desktop player dropping onto a collapsed rail, I want the card prepended in that column, so that freshly parked or finished games rise to the top.
14. As a desktop player with Queue expanded, I want precise reorder and cross-column moves as today, so that arranging still works when I open the noisy columns.
15. As a player looking at Queue, I want compact rows by default (header thumb, name, playtime), so that I can skim many kept games without full card height.
16. As a player, I want Queue compact rows to be draggable without expanding, so that promoting a game to Up Next stays one gesture.
17. As a player, I want an expand control on a Queue row, so that I can see fuller art and details when I am unsure.
18. As a player, I want only one Queue row expanded at a time, so that Queue height stays under control while I preview.
19. As a player, I do not want Launch on Queue compact or expanded cards, so that Queue stays for parking and promoting, not starting.
20. As a player looking at Up Next or Playing, I want full cards with header image, name, playtime forever, and Launch, so that the shortlist remains the play surface.
21. As a player looking at expanded Done, I want the same full card including Launch, so that I can revisit a finished game without a third card variant.
22. As a player, I want existing optimistic move persistence and revert-on-error behavior unchanged, so that calm layout work does not regress Board reliability.
23. As a player, I want Board queries and placement invariants unchanged (kept only, removed hidden, board fields only when kept), so that focus is a presentation and drop-target refinement, not a data model rewrite.
24. As a player with Steam unlinked or an empty library, I want existing empty states unchanged, so that onboarding paths stay consistent with triage.
25. As a player with zero kept games, I want the existing empty Board plus triage CTA unchanged, so that focus work does not invent a new empty path.
26. As a maintainer, I want glossary terms (Board, board column, library entry, Launch, kept) used in product copy for this work, so that agents and humans share one language.
27. As a maintainer, I want collapsed-drop prepend resolved in the board domain module, so that UI stays thin over a tested helper.
28. As a player on touch devices, I accept best-effort dragging for rails and compact rows, so that desktop quality ships first.
29. As a player, I do not want soft capacity limits on Up Next or Playing in this pass, so that we learn whether collapse alone is enough.
30. As a player, I do not want collapse preferences stored in the browser or on the server in this pass, so that the default calm view stays predictable.
31. As a player arranging games, I still want drag-and-drop as the only move interaction, so that menus are not introduced for rail drops.
32. As a player who expands Queue then collapses it, I want any expanded Queue row closed, so that reopening Queue starts compact again.
33. As a player, I want column order left-to-right to remain queue, up_next, playing, done, so that mental model from the Board spec stays intact.
34. As a player, I want Launch on Up Next, Playing, and Done to keep using `steam://run/{appid}`, so that Steam still starts the title.
35. As a player offline mid-save after a collapsed-rail drop, I want the same revert plus short error as other moves, so that a failed prepend does not leave a lying UI.

## Implementation Decisions

- Complements the accepted Board spec; does not replace column set, placement invariants, or move API shape.
- Primary Board job for this pass: pick tonight’s game from Up Next / Playing; Queue and Done are demoted.
- Queue and Done are collapsible; Up Next and Playing stay fully open.
- Default on load: Queue and Done collapsed; Up Next and Playing expanded.
- Collapsed columns render as narrow side rails (label + count) that still participate in the board layout order.
- When Queue and/or Done are collapsed, Up Next and Playing take most of the width; expand/collapse animates the width redistribution.
- Collapse/expand state is in-memory session state only; refresh resets to both Queue and Done collapsed.
- Collapsed rails remain drop targets.
- Drag-over a collapsed rail nudges it slightly open (affordance only; do not reveal the full card list); after drop or drag leave, shrink back to rail size unless the player has fully expanded that column.
- Drop onto a collapsed Queue or Done rail prepends (target index 0) via the existing board move mutation / RPC.
- Resolve collapsed-drop index in the existing board domain module (pure helper); HTTP and UI stay thin over it.
- Expanded Done uses the existing full Board card, including Launch.
- Expanded Queue uses the fuller card chrome for recognition but never shows Launch (compact or expanded).
- Queue default row: compact — header image thumb on the left, name, playtime underneath; always draggable; expand control for one-at-a-time preview.
- Only one Queue row may be expanded at a time; expanding another collapses the previous; collapsing the Queue column clears expanded row state.
- Up Next and Playing keep current full cards (header image, name, playtime forever, Launch).
- No soft WIP / capacity limits on Up Next or Playing in this pass.
- No schema changes; no new API routes; reuse existing board move persistence and optimistic UI revert.
- Desktop pointer first; touch best-effort only.
- Empty states from the Board spec unchanged.

## Testing Decisions

- Prefer testing external behavior of the board domain module, not React/DnD wiring, width animation, or Supabase client internals.
- Good tests: given a move onto a collapsed Queue or Done column, assert resolved target index is 0 and `applyBoardMove` / `planBoardMove` prepend; expanded-column moves keep explicit indexes.
- Seam (existing board domain module): collapsed-rail drop index resolution (prepend). Prior art: `tests/board.test.ts` with pure helpers and the same Node test runner style as triage/board domain tests.
- Do not require browser or end-to-end DnD tests for collapse animation, nudge affordance, or Queue expand chrome; keep those thin at the UI layer if domain prepend behavior is covered.
- Run the repo’s existing `npm run test` (and typecheck if present) before considering the ticket done.

## Out of Scope

- Soft limits or capacity nudges on Up Next or Playing
- Persisting collapse preferences across refresh, browsers, or devices
- Launch on Queue cards
- Hide or Someday actions from Board cards
- Dedicated Someday or Hidden browse pages
- Polished touch / Steam Deck Board DnD
- Schema or enum changes
- Changing triage placement rules (Kept → Queue append, Done → Done append)
- Changing auth, Steam link, or library sync

## Further Notes

- Published on Linear as [MXB-81](https://linear.app/steam-backlog/issue/MXB-81); keep this file in sync when the spec changes.
- Implementation: [MXB-82](https://linear.app/steam-backlog/issue/MXB-82) → [MXB-83](https://linear.app/steam-backlog/issue/MXB-83) → [MXB-84](https://linear.app/steam-backlog/issue/MXB-84) (82 and 83 in parallel; 84 blocked by both).
- Builds on [MXB-80](https://linear.app/steam-backlog/issue/MXB-80) / [docs/board.md](board.md).
- Agents should treat CONTEXT.md, docs/data-model.md, docs/board.md, and this spec as canonical for Board focus work.
