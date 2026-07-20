# Steam Backlog

A play-first organizer for bloated Steam libraries: triage what matters, kanban what you want to play.

## Language

**Steam profile**:
The Steam-linked identity for an authenticated account: steam id, display name, avatar, and library sync state.
_Avoid_: User, player, account, profile

**Game**:
A Steam app in the shared catalog, keyed by app id. Metadata (name, header image, icon image) is normalized here.
_Avoid_: Title, app

**Library entry**:
A steam profile's ownership of a game. Holds triage decisions, board placement, playtime from Steam, and removal state.
_Avoid_: steam_profile_game (table name only), owned game, user_game, player_game

**Triage status**:
Where a library entry sits in the review workflow: unreviewed, hidden, someday, or kept.
_Avoid_: status, disposition

**Board column**:
Where a kept library entry sits on the kanban: queue, up_next, playing, or done. Done includes games considered finished or good enough. Null when not on the board. Independent from triage status; only meaningful when triage status is kept.
_Avoid_: kanban status, pipeline stage

**Board position**:
Integer order within a board column (0, 1, 2…), scoped per steam profile per column. Null when not on the board.
_Avoid_: sort order, rank

**Removed**:
A library entry Steam no longer returns in GetOwnedGames. Tracked via removed_at; does not reset triage or board state.
_Avoid_: delisted, unowned, deleted

**Hide**:
Triage action that sets triage status to hidden and clears board column and position.
_Avoid_: dismiss, archive

**Library sync**:
Background job that refreshes a steam profile's owned games and playtime from Steam. Current status lives on the steam profile (sync status, last synced at); no sync history table for MVP.
_Avoid_: import, library sync run

**Invariant**:
A rule about valid library entry state (e.g. board fields only when triage status is kept). Enforced in the application layer for MVP, not Postgres check constraints.
_Avoid_: validation rule, constraint

**Progress**:
Steam achievement completion for a library entry, expressed as unlocked over total when known. Independent from the Done board column.
_Avoid_: completion %, percent complete, HLTB progress

**Progress tracking**:
Opt-in flag on a kept library entry that includes it in Progress refresh during Library sync. Only meaningful for kept entries; Removed turns it off while keeping cached Progress and achievement unlocks.
_Avoid_: watch, follow, sync achievements (as the flag name)

**Achievement**:
A Steam achievement definition in the shared Game catalog (name, identity, icons).
_Avoid_: trophy, badge

**Achievement unlock**:
Per library entry locked/unlocked state for an Achievement, owned by the steam profile.
_Avoid_: player achievement, user unlock

**Game detail**:
Protected Progress hub for one library entry, opened from the Board by clicking the game name. Shows Progress tracking, Progress, and achievement unlocks. Not a Steam store page.
_Avoid_: game page, store page, details drawer

**Playing auto-track**:
Steam profile preference (default on). When on, moving a library entry into the Playing board column turns Progress tracking on. Explicit Off sticks while the entry stays in Playing; re-entering Playing turns it on again if Playing auto-track is on.
_Avoid_: auto-enable achievements, auto progress
