---
linear: MXB-21
status: accepted
---

# Data model

Decisions from a grilling session (MXB-21). Complements [positioning](positioning.md) (MXB-23), [success metrics](success-metrics.md) (MXB-22), and [ADR-0001](adr/0001-laravel-inertia-stack.md) (MXB-26). Domain language lives in [`CONTEXT.md`](../CONTEXT.md).

## Overview

Three domain tables plus Laravel infrastructure (`sessions`, `jobs`). Steam game metadata is normalized in `games`. Per-user ownership, triage, board placement, and playtime live in `user_games`. Sync status lives on `users`; no sync history table for MVP.

```mermaid
erDiagram
    users ||--o{ user_games : owns
    games ||--o{ user_games : "in library"

    users {
        bigint id PK
        bigint steam_id UK
        string display_name
        string avatar_url
        timestamp last_synced_at "nullable"
        enum sync_status "idle | syncing | failed"
        timestamp created_at
        timestamp updated_at
    }

    games {
        bigint id PK
        int app_id UK
        string name
        string header_image_url
        timestamp created_at
        timestamp updated_at
    }

    user_games {
        bigint id PK
        bigint user_id FK
        bigint game_id FK
        enum triage_status "unreviewed | hidden | maybe | backlog"
        enum board_column "queue | up_next | playing | done | null"
        int board_position "nullable"
        int playtime_forever "minutes"
        int playtime_2weeks "minutes"
        timestamp last_played_at "nullable"
        timestamp removed_at "nullable"
        timestamp created_at
        timestamp updated_at
    }
```

## Tables

### `users`

Steam OpenID only. No email or password (MXB-6, ADR-0001).

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `steam_id` | bigint unique | Steam 64-bit ID |
| `display_name` | string | From Steam profile |
| `avatar_url` | string | From Steam profile |
| `last_synced_at` | timestamp nullable | Last successful library sync |
| `sync_status` | enum | `idle`, `syncing`, `failed` |
| `created_at`, `updated_at` | timestamps | |

### `games`

Shared Steam catalog. One row per `app_id`. Updated on sync when metadata changes.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `app_id` | int unique | Steam application ID |
| `name` | string | Display name |
| `header_image_url` | string | Cover art URL |
| `created_at`, `updated_at` | timestamps | |

Store delisted status is **not** tracked. If the user still owns the game, store policy is irrelevant.

### `user_games`

A user's library entry for one game. Triage and board are **two independent axes**.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | bigint FK → users | |
| `game_id` | bigint FK → games | |
| `triage_status` | enum | `unreviewed`, `hidden`, `maybe`, `backlog` |
| `board_column` | enum nullable | `queue`, `up_next`, `playing`, `done` |
| `board_position` | int nullable | Order within column (0, 1, 2…) |
| `playtime_forever` | int | Minutes, from Steam |
| `playtime_2weeks` | int | Minutes, from Steam |
| `last_played_at` | timestamp nullable | From Steam `rtime_last_played` |
| `removed_at` | timestamp nullable | Set when game drops from `GetOwnedGames` |
| `created_at`, `updated_at` | timestamps | |

New rows default to `triage_status = unreviewed` with null board fields.

## Constraints & indexes

| Rule | Implementation |
|---|---|
| One user per Steam identity | `UNIQUE(steam_id)` on `users` |
| One catalog row per Steam game | `UNIQUE(app_id)` on `games` |
| One library entry per owned game | `UNIQUE(user_id, game_id)` on `user_games` |
| No duplicate slots in a board column | Partial unique index on `(user_id, board_column, board_position)` WHERE `board_column IS NOT NULL` |
| Account delete | `user_games` cascades on `users` delete |
| Shared catalog | `user_games.game_id` FK restrict (do not delete `games` rows in use) |

## Application invariants

Enforced in the application layer for MVP, not Postgres check constraints.

1. **Board only for backlog.** `board_column` and `board_position` are non-null only when `triage_status = backlog`.
2. **Hide clears board.** Setting `triage_status = hidden` also sets `board_column` and `board_position` to null.
3. **Idempotent sync.** Re-import updates playtime and game metadata; never resets `triage_status` or board fields (MXB-44).
4. **Removed, not deleted.** When a game disappears from `GetOwnedGames`, set `removed_at`. Do not reset triage or board state.
5. **Board ordering.** `board_position` is an integer rank per `(user_id, board_column)`. Reorder rewrites positions in that column.

## Sync model

No `library_syncs` table for MVP. Background sync (MXB-33) uses Laravel's `jobs` table for queue work. User-visible status:

- `users.sync_status` — current state (`idle` / `syncing` / `failed`)
- `users.last_synced_at` — last successful completion

Structured logging for sync runs is ops concern (MXB-57), not a domain table.

## Explicitly out of scope (MVP)

- `library_syncs` run history table
- `games.is_delisted` or other store-policy flags
- Email/password columns on `users`
- `first_seen_at` / new-game badge fields
- Postgres check constraints on triage/board invariants

## Downstream issues

These issues implement against this model:

- **MXB-5** — migrations for `users`, `games`, `user_games`
- **MXB-6** — Steam OpenID populates `users`
- **MXB-8** — `GetOwnedGames` upserts `games` + `user_games`
- **MXB-11** — board queries `triage_status = backlog` with board columns
- **MXB-44** — sync preserves triage and board state
