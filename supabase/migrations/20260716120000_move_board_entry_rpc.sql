-- Atomic board move: stage + final rewrite in one transaction so refresh
-- never sees mid-write board_position offsets.

create or replace function public.move_board_entry(
  p_entry_id bigint,
  p_target_column public.board_column,
  p_target_index integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid := (select auth.uid());
  v_source_column public.board_column;
  v_source_ids bigint[];
  v_target_ids bigint[];
  v_insert_at integer;
  v_affected bigint[];
  v_i integer;
  v_len integer;
begin
  if v_profile_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_index < 0 then
    raise exception 'Invalid target index';
  end if;

  select board_column
  into v_source_column
  from public.steam_profile_games
  where id = p_entry_id
    and steam_profile_id = v_profile_id
    and triage_status = 'kept'
    and board_column is not null
    and board_position is not null;

  if v_source_column is null then
    raise exception 'Library entry not found';
  end if;

  select coalesce(array_agg(id order by board_position), '{}'::bigint[])
  into v_source_ids
  from public.steam_profile_games
  where steam_profile_id = v_profile_id
    and triage_status = 'kept'
    and board_column = v_source_column
    and board_position is not null;

  v_source_ids := array_remove(v_source_ids, p_entry_id);

  if v_source_column = p_target_column then
    v_target_ids := v_source_ids;
  else
    select coalesce(array_agg(id order by board_position), '{}'::bigint[])
    into v_target_ids
    from public.steam_profile_games
    where steam_profile_id = v_profile_id
      and triage_status = 'kept'
      and board_column = p_target_column
      and board_position is not null;
  end if;

  v_insert_at := greatest(
    0,
    least(p_target_index, coalesce(array_length(v_target_ids, 1), 0))
  );

  v_target_ids :=
    coalesce(v_target_ids[1:v_insert_at], '{}'::bigint[])
    || p_entry_id
    || coalesce(v_target_ids[v_insert_at + 1 :], '{}'::bigint[]);

  if v_source_column = p_target_column then
    v_affected := v_target_ids;
  else
    v_affected := v_source_ids || v_target_ids;
  end if;

  -- Stage away from 0..n-1 so the unique index cannot collide mid-rewrite.
  update public.steam_profile_games
  set board_position = 1000000 + id
  where steam_profile_id = v_profile_id
    and id = any (v_affected);

  if v_source_column <> p_target_column then
    v_len := coalesce(array_length(v_source_ids, 1), 0);
    for v_i in 1..v_len loop
      update public.steam_profile_games
      set
        board_column = v_source_column,
        board_position = v_i - 1
      where id = v_source_ids[v_i]
        and steam_profile_id = v_profile_id;
    end loop;
  end if;

  v_len := coalesce(array_length(v_target_ids, 1), 0);
  for v_i in 1..v_len loop
    update public.steam_profile_games
    set
      board_column = p_target_column,
      board_position = v_i - 1
    where id = v_target_ids[v_i]
      and steam_profile_id = v_profile_id;
  end loop;
end;
$$;

revoke all on function public.move_board_entry(bigint, public.board_column, integer) from public;
grant execute on function public.move_board_entry(bigint, public.board_column, integer) to authenticated;
