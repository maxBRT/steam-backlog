-- Progress schema: Playing auto-track, Progress tracking/summary, Achievements, unlocks.
-- RLS stays steam-profile scoped for per-entry Progress data.

alter table public.steam_profiles
  add column playing_auto_track boolean not null default true;

alter table public.steam_profile_games
  add column progress_tracking boolean not null default false,
  add column progress_unlocked integer,
  add column progress_total integer,
  add column progress_fetched_at timestamptz;

create table public.achievements (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games (id) on delete cascade,
  api_name text not null,
  display_name text not null default '',
  description text not null default '',
  icon_url text not null default '',
  icon_gray_url text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, api_name)
);

create table public.achievement_unlocks (
  id bigint generated always as identity primary key,
  steam_profile_game_id bigint not null
    references public.steam_profile_games (id) on delete cascade,
  achievement_id bigint not null
    references public.achievements (id) on delete cascade,
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (steam_profile_game_id, achievement_id)
);

create trigger achievements_set_updated_at
  before update on public.achievements
  for each row execute function public.set_updated_at();

create trigger achievement_unlocks_set_updated_at
  before update on public.achievement_unlocks
  for each row execute function public.set_updated_at();

alter table public.achievements enable row level security;
alter table public.achievement_unlocks enable row level security;

create policy "achievements_select_authenticated"
  on public.achievements for select
  to authenticated
  using (true);

create policy "achievements_insert_authenticated"
  on public.achievements for insert
  to authenticated
  with check (true);

create policy "achievements_update_authenticated"
  on public.achievements for update
  to authenticated
  using (true)
  with check (true);

create policy "achievement_unlocks_select_own"
  on public.achievement_unlocks for select
  to authenticated
  using (
    exists (
      select 1
      from public.steam_profile_games as spg
      where spg.id = steam_profile_game_id
        and spg.steam_profile_id = (select auth.uid())
    )
  );

create policy "achievement_unlocks_insert_own"
  on public.achievement_unlocks for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.steam_profile_games as spg
      where spg.id = steam_profile_game_id
        and spg.steam_profile_id = (select auth.uid())
    )
  );

create policy "achievement_unlocks_update_own"
  on public.achievement_unlocks for update
  to authenticated
  using (
    exists (
      select 1
      from public.steam_profile_games as spg
      where spg.id = steam_profile_game_id
        and spg.steam_profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.steam_profile_games as spg
      where spg.id = steam_profile_game_id
        and spg.steam_profile_id = (select auth.uid())
    )
  );

create policy "achievement_unlocks_delete_own"
  on public.achievement_unlocks for delete
  to authenticated
  using (
    exists (
      select 1
      from public.steam_profile_games as spg
      where spg.id = steam_profile_game_id
        and spg.steam_profile_id = (select auth.uid())
    )
  );

grant select, insert, update on public.achievements to authenticated;
grant select, insert, update, delete on public.achievement_unlocks to authenticated;
