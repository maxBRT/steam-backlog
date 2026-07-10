-- MXB-31: schema per docs/data-model.md (MXB-21)
-- steam_profiles.id → auth.users(id) (1:1)

create type public.sync_status as enum ('idle', 'syncing', 'failed');
create type public.triage_status as enum ('unreviewed', 'hidden', 'maybe', 'backlog');
create type public.board_column as enum ('queue', 'up_next', 'playing', 'done');

create table public.steam_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  steam_id bigint unique,
  display_name text not null default '',
  avatar_url text not null default '',
  last_synced_at timestamptz,
  sync_status public.sync_status not null default 'idle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id bigint generated always as identity primary key,
  app_id integer not null unique,
  name text not null,
  header_image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.steam_profile_games (
  id bigint generated always as identity primary key,
  steam_profile_id uuid not null references public.steam_profiles (id) on delete cascade,
  game_id bigint not null references public.games (id) on delete restrict,
  triage_status public.triage_status not null default 'unreviewed',
  board_column public.board_column,
  board_position integer,
  playtime_forever integer not null default 0,
  playtime_2weeks integer not null default 0,
  last_played_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (steam_profile_id, game_id)
);

create unique index steam_profile_board_position_unique
  on public.steam_profile_games (steam_profile_id, board_column, board_position)
  where board_column is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger steam_profiles_set_updated_at
  before update on public.steam_profiles
  for each row execute function public.set_updated_at();

create trigger games_set_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

create trigger steam_profile_games_set_updated_at
  before update on public.steam_profile_games
  for each row execute function public.set_updated_at();

-- Create steam profile row when auth user signs up
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

alter table public.steam_profiles enable row level security;
alter table public.games enable row level security;
alter table public.steam_profile_games enable row level security;

create policy "steam_profiles_select_own"
  on public.steam_profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "steam_profiles_update_own"
  on public.steam_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "games_select_authenticated"
  on public.games for select
  to authenticated
  using (true);

create policy "games_insert_authenticated"
  on public.games for insert
  to authenticated
  with check (true);

create policy "games_update_authenticated"
  on public.games for update
  to authenticated
  using (true)
  with check (true);

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
grant select, insert, update on public.games to authenticated;
grant select, insert, update, delete on public.steam_profile_games to authenticated;
grant usage, select on all sequences in schema public to authenticated;
