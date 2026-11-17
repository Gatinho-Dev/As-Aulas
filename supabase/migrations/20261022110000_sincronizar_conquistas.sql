-- Concede conquistas do usuário autenticado com base em registros reais.
-- Cada conquista é gravada uma única vez (unique user_id + achievement_code).
create or replace function public.sincronizar_conquistas()
returns setof public.user_achievements
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  concluidas int;
  no_prazo int;
  materias_distintas int;
  maior_materia int;
  metas_concluidas int;
  atrasadas_abertas int;
begin
  if uid is null or not public.is_active_user() then
    return;
  end if;

  select count(*),
         count(*) filter (where ap.completed_at <= a.due_at),
         count(distinct a.subject_id),
         coalesce(max(por_materia.n), 0)
    into concluidas, no_prazo, materias_distintas, maior_materia
  from public.assignment_progress ap
  join public.assignments a on a.id = ap.assignment_id
  left join lateral (
    select count(*) as n
    from public.assignment_progress ap2
    join public.assignments a2 on a2.id = ap2.assignment_id
    where ap2.user_id = uid and ap2.personal_status = 'concluida' and a2.subject_id = a.subject_id
  ) por_materia on true
  where ap.user_id = uid and ap.personal_status = 'concluida';

  select count(*) into metas_concluidas
  from public.user_goals g
  where g.user_id = uid and g.status = 'concluida';

  select count(*) into atrasadas_abertas
  from public.assignments a
  where a.status = 'publicada' and a.published_at <= now() and a.due_at < now()
    and public.is_class_member(a.class_id)
    and not exists (
      select 1 from public.assignment_progress ap
      where ap.assignment_id = a.id and ap.user_id = uid and ap.personal_status = 'concluida'
    );

  insert into public.user_achievements (user_id, achievement_code)
  select uid, c.code
  from (values
    ('primeira_tarefa', concluidas >= 1),
    ('dez_atividades', concluidas >= 10),
    ('pontualidade', no_prazo >= 5),
    ('dedicacao_materia', maior_materia >= 5),
    ('explorador', materias_distintas >= 3),
    ('tudo_em_dia', concluidas >= 1 and atrasadas_abertas = 0),
    ('primeiro_objetivo', metas_concluidas >= 1),
    ('planejamento_inteligente', metas_concluidas >= 3)
  ) as c(code, ok)
  where c.ok
  on conflict (user_id, achievement_code) do nothing;

  -- XP só é registrado para conquistas recém-gravadas, uma vez por origem
  insert into public.user_xp_events (user_id, source_key, amount)
  select uid, 'conquista:' || ua.achievement_code, 10
  from public.user_achievements ua
  where ua.user_id = uid
  on conflict (user_id, source_key) do nothing;

  return query
    select * from public.user_achievements ua where ua.user_id = uid order by ua.unlocked_at;
end;
$$;

revoke all on function public.sincronizar_conquistas() from public, anon;
grant execute on function public.sincronizar_conquistas() to authenticated;
