-- Rename domain profile tables to steam_profiles (from users or players).
-- Idempotent: no-ops if steam_profiles already exists.

do $$
begin
  if to_regclass('public.steam_profiles') is null then
    if to_regclass('public.users') is not null then
      alter table public.users rename to steam_profiles;
    elsif to_regclass('public.players') is not null then
      alter table public.players rename to steam_profiles;
    end if;
  end if;

  if to_regclass('public.steam_profile_games') is null then
    if to_regclass('public.user_games') is not null then
      alter table public.user_games rename to steam_profile_games;
    elsif to_regclass('public.player_games') is not null then
      alter table public.player_games rename to steam_profile_games;
    end if;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'steam_profile_games'
      and column_name = 'user_id'
  ) then
    alter table public.steam_profile_games rename column user_id to steam_profile_id;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'steam_profile_games'
      and column_name = 'player_id'
  ) then
    alter table public.steam_profile_games rename column player_id to steam_profile_id;
  end if;
end $$;

-- Indexes
drop index if exists public.user_board_position_unique;
drop index if exists public.player_board_position_unique;
create unique index if not exists steam_profile_board_position_unique
  on public.steam_profile_games (steam_profile_id, board_column, board_position)
  where board_column is not null;

-- updated_at triggers
drop trigger if exists users_set_updated_at on public.steam_profiles;
drop trigger if exists players_set_updated_at on public.steam_profiles;
drop trigger if exists steam_profiles_set_updated_at on public.steam_profiles;
create trigger steam_profiles_set_updated_at
  before update on public.steam_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_games_set_updated_at on public.steam_profile_games;
drop trigger if exists player_games_set_updated_at on public.steam_profile_games;
drop trigger if exists steam_profile_games_set_updated_at on public.steam_profile_games;
create trigger steam_profile_games_set_updated_at
  before update on public.steam_profile_games
  for each row execute function public.set_updated_at();

-- Signup trigger: create steam_profiles row
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.handle_new_player();

create or replace function public.handle_new_steam_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.steam_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_steam_profile();

revoke all on function public.handle_new_steam_profile() from public;
revoke all on function public.handle_new_steam_profile() from anon, authenticated;

-- RLS policies
drop policy if exists "users_select_own" on public.steam_profiles;
drop policy if exists "users_update_own" on public.steam_profiles;
drop policy if exists "players_select_own" on public.steam_profiles;
drop policy if exists "players_update_own" on public.steam_profiles;
drop policy if exists "steam_profiles_select_own" on public.steam_profiles;
drop policy if exists "steam_profiles_update_own" on public.steam_profiles;

create policy "steam_profiles_select_own"
  on public.steam_profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "steam_profiles_update_own"
  on public.steam_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "user_games_select_own" on public.steam_profile_games;
drop policy if exists "user_games_insert_own" on public.steam_profile_games;
drop policy if exists "user_games_update_own" on public.steam_profile_games;
drop policy if exists "user_games_delete_own" on public.steam_profile_games;
drop policy if exists "player_games_select_own" on public.steam_profile_games;
drop policy if exists "player_games_insert_own" on public.steam_profile_games;
drop policy if exists "player_games_update_own" on public.steam_profile_games;
drop policy if exists "player_games_delete_own" on public.steam_profile_games;
drop policy if exists "steam_profile_games_select_own" on public.steam_profile_games;
drop policy if exists "steam_profile_games_insert_own" on public.steam_profile_games;
drop policy if exists "steam_profile_games_update_own" on public.steam_profile_games;
drop policy if exists "steam_profile_games_delete_own" on public.steam_profile_games;

create policy "steam_profile_games_select_own"
  on public.steam_profile_games for select
  to authenticated
  using ((select auth.uid()) = steam_profile_id);

create policy "steam_profile_games_insert_own"
  on public.steam_profile_games for insert
  to authenticated
  with check ((select auth.uid()) = steam_profile_id);

create policy "steam_profile_games_update_own"
  on public.steam_profile_games for update
  to authenticated
  using ((select auth.uid()) = steam_profile_id)
  with check ((select auth.uid()) = steam_profile_id);

create policy "steam_profile_games_delete_own"
  on public.steam_profile_games for delete
  to authenticated
  using ((select auth.uid()) = steam_profile_id);

grant select, update on public.steam_profiles to authenticated;
grant select, insert, update, delete on public.steam_profile_games to authenticated;
