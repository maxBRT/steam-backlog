---
linear: MXB-39
status: implemented
---

# Steam Profile Edge Cases

This document describes how the application handles various edge cases related to Steam profile visibility and game library access.

## Overview

Steam provides multiple privacy settings that affect what information is accessible via the Web API. This implementation handles three main edge cases:

1. **Private profiles** - Profile details are hidden
2. **Game details hidden** - Profile is visible but game list is private
3. **Visibility changes mid-use** - Profile becomes private after initial linking

## Steam API Privacy States

### Community Visibility State

The `GetPlayerSummaries` endpoint returns a `communityvisibilitystate` field:

- `1` - Profile is **not visible** (Private, Friends Only, etc.)
- `3` - Profile is **Public**

Note: The Web API without authentication only returns these two values. The internal state can be more nuanced (Friends Only, Friends of Friends), but they all map to `1` when accessed via the public API.

### Profile State

The `profilestate` field indicates whether a Steam Community profile has been configured:

- `0` - No community profile configured
- `1` - Community profile exists

## Implementation

### Player Summary (`lib/steam/player-summary.ts`)

**Behavior:**

- Checks `communityvisibilitystate` on all `GetPlayerSummaries` calls
- Throws `PrivateProfileError` if visibility state is `1` or missing
- Returns player data including visibility and profile state for public profiles

**Error handling:**

```typescript
try {
  const summary = await fetchPlayerSummary(steamId);
} catch (error) {
  if (error instanceof PrivateProfileError) {
    // Handle private profile
  } else {
    // Handle other errors (API failure, not found, etc.)
  }
}
```

### Owned Games (`lib/steam/owned-games.ts`)

**Behavior:**

- Calls `GetOwnedGames` with configurable options:
  - `includeAppInfo` - Include game names and icons (default: true)
  - `includePlayedFreeGames` - Include free games if played (default: true)
  - `skipUnvettedApps` - Exclude "Profile Features Limited" games (default: false)

**Edge cases handled:**

1. **HTTP 403 response** → `PrivateGamesError`
2. **Missing response object** → `PrivateGamesError`
3. **game_count > 0 but empty games array** → `GameDetailsHiddenError`
4. **game_count = 0** → Returns empty array (valid state)
5. **Missing appid** → Filters out invalid entries
6. **Missing playtime data** → Defaults to 0

**Error handling:**

```typescript
try {
  const games = await fetchOwnedGames(steamId);
} catch (error) {
  if (error instanceof PrivateGamesError) {
    // Library is completely private
  } else if (error instanceof GameDetailsHiddenError) {
    // We know they own games, but can't see details
  } else {
    // API error
  }
}
```

**Utility function:**

```typescript
const canAccess = await canAccessGames(steamId);
// Returns false for PrivateGamesError or GameDetailsHiddenError
// Throws for other errors
```

### Profile Linking (`app/api/steam/callback/route.ts`)

**Error states:**

- `openid_invalid` - OpenID verification failed
- `private_profile` - **NEW** - Profile visibility is not public
- `steam_profile` - Other profile fetch errors (API failure, not found)
- `steam_taken` - Steam ID already linked to another account
- `update_failed` - Database update failed

The callback route catches `PrivateProfileError` and redirects to settings with `error=private_profile`.

### Error Types (`lib/steam/link-errors.ts`)

Added `PrivateProfile = "private_profile"` to `SteamLinkError` enum.

## Visibility Changes Mid-Use

### Scenario: Profile becomes private after linking

**Current behavior:**

- Profile remains linked (steam_id stays in database)
- Display name and avatar are already cached
- Future library syncs will fail with `PrivateGamesError`

**Recommended sync behavior (for future MXB-8 implementation):**

1. Attempt `GetOwnedGames` during sync
2. If `PrivateGamesError` or `GameDetailsHiddenError`:
   - Set `sync_status = 'failed'`
   - Do NOT clear `last_synced_at` (show when last successful sync occurred)
   - Store error message for user display
   - Do NOT unlink the profile automatically
3. User can:
   - Keep the profile linked and wait until they make it public again
   - Manually unlink and re-link with a different profile
   - View previously synced games (if any)

### Scenario: Profile changes from public to private to public

When the profile becomes public again:

- Next sync attempt will succeed
- Library will be updated with current game ownership
- New games added while private will appear
- Removed games will be marked with `removed_at`

## Unvetted Apps ("Profile Features Limited")

Some newly released games are marked as "profile features limited" by Steam. These games:

- May not appear in `GetOwnedGames` by default
- Can be included by setting `skip_unvetted_apps=false`
- Are typically released by unvetted developers
- Steam is "learning" about these games

**Our implementation:**

- Sets `skip_unvetted_apps=false` by default in `fetchOwnedGames`
- This ensures we capture all games, including profile-limited ones
- Games like "Air Twister" (appid 2403620) will be included

## Testing

See `tests/steam-edge-cases.test.ts` for comprehensive test coverage:

- Private profile detection
- Public profile success
- Missing visibility state handling
- Game library privacy states
- Unvetted apps inclusion
- Invalid data filtering
- Error propagation

Run tests:

```bash
npm test tests/steam-edge-cases.test.ts
```

## UI Considerations (Not Yet Implemented)

### Settings Page

Should display different messages for different error states:

- `private_profile` - "Your Steam profile must be set to Public to link your account. Please update your privacy settings on Steam and try again."
- `steam_profile` - "Unable to fetch your Steam profile. Please try again later."
- `steam_taken` - "This Steam account is already linked to another user."

### Sync Status Display

When sync fails due to privacy:

- Show last successful sync timestamp
- Display clear message: "Library sync failed: Your Steam profile or game details are set to private"
- Provide link to Steam privacy settings
- Do not show alarming errors (this is a user configuration issue, not a bug)

## Related Issues

- **MXB-8** - `GetOwnedGames` implementation (sync engine)
- **MXB-33** - Background sync job
- **MXB-44** - Sync preserves triage and board state

## References

- [Steam Web API Documentation - ISteamUser](https://partner.steamgames.com/doc/webapi/ISteamUser)
- [Steam Web API - IPlayerService](https://partner.steamgames.com/doc/webapi/IPlayerService)
- [Community Visibility State Discussion](https://stackoverflow.com/questions/55482542/steam-web-api-where-i-can-find-the-profile-status-public-private)
