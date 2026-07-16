-- MXB-77: kept games marked before queue placement existed have null board fields.
-- Place them at the end of Queue per steam profile.

with existing_max as (
  select
    steam_profile_id,
    coalesce(max(board_position), -1) + 1 as next_pos
  from public.steam_profile_games
  where board_column = 'queue'
    and board_position is not null
  group by steam_profile_id
),
unplaced as (
  select
    spg.id,
    spg.steam_profile_id,
    row_number() over (
      partition by spg.steam_profile_id
      order by spg.id
    ) - 1 as offset
  from public.steam_profile_games spg
  where spg.triage_status = 'kept'
    and spg.board_column is null
    and spg.board_position is null
    and spg.removed_at is null
)
update public.steam_profile_games spg
set
  board_column = 'queue',
  board_position = coalesce(em.next_pos, 0) + u.offset
from unplaced u
left join existing_max em on em.steam_profile_id = u.steam_profile_id
where spg.id = u.id;
