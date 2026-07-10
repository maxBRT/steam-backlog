# Steam Backlog

A play-first organizer for bloated Steam libraries: triage what matters, kanban what you want to play.

## Language

**User**:
A person who signs in with Steam. Identified by `steam_id`; display name and avatar come from the Steam profile. No email or password.
_Avoid_: Account, player profile

**Game**:
A Steam app in the shared catalog, keyed by `app_id`. Metadata (name, header image) is normalized here.
_Avoid_: Title, app

**Library entry**:
A user's ownership of a game. Holds triage decisions, board placement, playtime from Steam, and removal state.
_Avoid_: user_game (table name only), owned game

**Triage status**:
Where a library entry sits in the review workflow: unreviewed, hidden, maybe, or backlog.
_Avoid_: status, disposition

**Board column**:
Where a backlog library entry sits on the kanban: queue, up_next, playing, or done. Null when not on the board. Independent from triage status; only meaningful when triage status is backlog.
_Avoid_: kanban status, pipeline stage

**Board position**:
Integer order within a board column (0, 1, 2…), scoped per user per column. Null when not on the board.
_Avoid_: sort order, rank

**Removed**:
A library entry Steam no longer returns in `GetOwnedGames`. Tracked via `removed_at`; does not reset triage or board state.
_Avoid_: delisted, unowned, deleted

**Hide**:
Triage action that sets triage status to hidden and clears board column and position.
_Avoid_: dismiss, archive

**Library sync**:
Background job that refreshes a user's owned games and playtime from Steam. Current status lives on the user (`sync_status`, `last_synced_at`); no sync history table for MVP.
_Avoid_: import, library sync run

**Invariant**:
A rule about valid library entry state (e.g. board fields only when triage status is backlog). Enforced in the application layer for MVP, not Postgres check constraints.
_Avoid_: validation rule, constraint
