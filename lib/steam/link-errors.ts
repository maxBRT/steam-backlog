export enum SteamLinkError {
  SteamTaken = "steam_taken",
  OpenIdInvalid = "openid_invalid",
  SteamProfile = "steam_profile",
  PrivateProfile = "private_profile",
  UpdateFailed = "update_failed",
}

export function isSteamLinkError(value: string): value is SteamLinkError {
  return (Object.values(SteamLinkError) as string[]).includes(value);
}
