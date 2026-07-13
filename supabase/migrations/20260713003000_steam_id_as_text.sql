-- Steam IDs exceed Number.MAX_SAFE_INTEGER. PostgREST returns bigint as JSON
-- numbers, which corrupts the id in JS and makes GetOwnedGames return empty.
alter table public.steam_profiles
  alter column steam_id type text using steam_id::text;
