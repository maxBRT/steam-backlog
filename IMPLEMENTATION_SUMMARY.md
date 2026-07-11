# Steam Profile Edge Cases - Implementation Summary

**Linear Issue**: MXB-39  
**Branch**: cursor/steam-profile-edge-cases-b1c8  
**Pull Request**: #11

## Problem Statement

The application needed to handle various Steam profile privacy edge cases:
1. Private profiles
2. Game details hidden while profile is public
3. Visibility changes occurring mid-use

## Solution Overview

Implemented comprehensive edge case handling across the Steam API integration layer with full test coverage and documentation.

## Implementation Details

### 1. Player Summary Privacy Detection (`lib/steam/player-summary.ts`)

**Changes:**
- Added `CommunityVisibilityState` type (Private = 1, Public = 3)
- Added `ProfileState` type (NotConfigured = 0, Configured = 1)
- Created `PrivateProfileError` class
- Enhanced `fetchPlayerSummary()` to check visibility state
- Returns visibility and profile state in response

**Behavior:**
- Throws `PrivateProfileError` for private profiles (visibility state 1)
- Treats missing visibility state as private (fail-secure)
- Only allows public profiles (visibility state 3)

### 2. Owned Games API (`lib/steam/owned-games.ts`)

**New Module Created:**
- `fetchOwnedGames()` - Fetches game library with configurable options
- `canAccessGames()` - Quick check if library is accessible
- `PrivateGamesError` - Thrown when library is completely private
- `GameDetailsHiddenError` - Thrown when we know games exist but can't see details

**Edge Cases Handled:**
- HTTP 403 response → `PrivateGamesError`
- Missing response object → `PrivateGamesError`
- game_count > 0 but empty games array → `GameDetailsHiddenError`
- game_count = 0 → Returns empty array (valid)
- Missing appid → Filters out invalid entries
- Missing playtime data → Defaults to 0
- Unvetted apps → Includes by default with `skip_unvetted_apps=false`

**Features:**
- Configurable options: `includeAppInfo`, `includePlayedFreeGames`, `skipUnvettedApps`
- Constructs proper Steam CDN URLs for game header images
- Converts Unix timestamps to JavaScript Date objects
- Type-safe with comprehensive TypeScript types

### 3. Error Types (`lib/steam/link-errors.ts`)

**Added:**
- `PrivateProfile = "private_profile"` to `SteamLinkError` enum

### 4. Callback Route (`app/api/steam/callback/route.ts`)

**Changes:**
- Imports `PrivateProfileError` from player-summary module
- Catches `PrivateProfileError` specifically
- Redirects to settings with `error=private_profile` query param
- Other errors still redirect with `error=steam_profile`

**Error States:**
- `openid_invalid` - OpenID verification failed
- `private_profile` - **NEW** - Profile is not public
- `steam_profile` - Other profile errors
- `steam_taken` - Steam ID already linked
- `update_failed` - Database error

### 5. Comprehensive Tests (`tests/steam-edge-cases.test.ts`)

**Test Coverage:**

**Player Summary Tests (5):**
- Private profile detection (visibility state 1)
- Public profile success (visibility state 3)
- Missing visibility state treated as private
- Profile not found handling
- API error responses

**Owned Games Tests (9):**
- Successful fetch from public profile
- 403 response → PrivateGamesError
- Missing response → PrivateGamesError
- game_count > 0 but no games → GameDetailsHiddenError
- game_count = 0 → Empty array
- Unvetted apps inclusion
- Invalid game filtering (missing appid)
- Missing playtime data defaults
- Header image URL construction

**Access Check Tests (4):**
- Returns true for accessible games
- Returns false for PrivateGamesError
- Returns false for GameDetailsHiddenError
- Throws for other errors

**Results:**
- 25 tests total
- 25 passing
- 0 failures
- TypeScript: Clean compilation

### 6. Documentation (`docs/steam-edge-cases.md`)

**Contents:**
- Overview of edge cases
- Steam API privacy states explained
- Implementation details for each module
- Error handling patterns with code examples
- Visibility change scenarios
- Unvetted apps explanation
- Testing instructions
- UI considerations (not yet implemented)
- Related issues and references

## Technical Decisions

### TypeScript Enum → Const Object

Initially used TypeScript enums but Node.js doesn't support them in strip-only mode. Converted to const objects with type assertions:

```typescript
export const CommunityVisibilityState = {
  Private: 1,
  Public: 3,
} as const;

export type CommunityVisibilityState =
  (typeof CommunityVisibilityState)[keyof typeof CommunityVisibilityState];
```

### Fail-Secure Privacy Defaults

When visibility state is missing or undefined, we default to treating the profile as private. This is the safe choice that protects user privacy.

### Separate Error Classes

Created distinct error classes (`PrivateProfileError`, `PrivateGamesError`, `GameDetailsHiddenError`) rather than generic errors. This allows callers to handle different privacy scenarios appropriately.

### Default to Including Unvetted Apps

Set `skip_unvetted_apps=false` by default to capture all games including "Profile Features Limited" games. This ensures comprehensive game library coverage.

## Future Work

### For MXB-8 (Sync Engine)

The `owned-games.ts` module is ready to use for library sync implementation:

```typescript
import { fetchOwnedGames, PrivateGamesError, GameDetailsHiddenError } from '@/lib/steam/owned-games';

async function syncLibrary(steamId: bigint) {
  try {
    const games = await fetchOwnedGames(steamId);
    // Upsert to games and steam_profile_games tables
  } catch (error) {
    if (error instanceof PrivateGamesError || error instanceof GameDetailsHiddenError) {
      // Set sync_status = 'failed' with appropriate message
      // Do not unlink profile or clear data
    } else {
      // Handle API errors
    }
  }
}
```

### For UI Implementation

Settings page should display user-friendly messages:

- `private_profile` - "Your Steam profile must be set to Public to link your account."
- Sync failures - Show last successful sync time and guide to privacy settings
- Don't show alarming errors for privacy issues (it's user configuration, not a bug)

### For Monitoring

- Track how often linking fails due to privacy
- Monitor sync failures by error type
- Consider prompts to guide users to make profiles public

## Success Criteria

✅ Private profiles are detected and rejected during linking  
✅ Game library privacy is properly detected  
✅ Comprehensive test coverage (25 tests, all passing)  
✅ TypeScript compilation clean  
✅ Documentation complete  
✅ Error handling is user-friendly  
✅ Prepared for future sync engine (MXB-8)  
✅ Branch pushed and PR created  

## References

- [Steam Web API - ISteamUser](https://partner.steamgames.com/doc/webapi/ISteamUser)
- [Steam Web API - IPlayerService](https://partner.steamgames.com/doc/webapi/IPlayerService)
- [Community Visibility State Discussion](https://stackoverflow.com/questions/55482542/steam-web-api-where-i-can-find-the-profile-status-public-private)
- [Unvetted Apps Discussion](https://github.com/JosefNemec/Playnite/issues/910)
