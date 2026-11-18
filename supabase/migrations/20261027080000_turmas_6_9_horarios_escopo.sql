-- Turmas do 6º ao 9º ano (A–D), grade horária por turma e escopo da demonstração.
--
-- 1) list_signup_classes deixa de oferecer a turma de demonstração no cadastro.
-- 2) Cria as turmas 6º–9º ano A–D (turno manhã) e padroniza o nome da 6º D.
-- 3) Cria class_schedules (uma grade por turma) com a grade do 6º D como semente.
-- 4) Corrige a notificação "Bem-vindo à conta de demonstração" que apontava
--    para a turma 6º D: ela passa a apontar para a turma de demonstração.
-- 5) Novo RPC escolher_minha_turma para alunos sem vínculo entrarem na turma
--    (ex.: contas criadas com Google, que não escolhem turma no cadastro).

-- 1) Cadastro: só turmas ativas e que não são de demonstração
create or replace function public.list_signup_classes()
returns table (id uuid, name text, school_year smallint, shift text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.school_year, c.shift
  from public.classes c
  where c.active and not coalesce(c.is_demo, false)
  order by c.school_year, c.name;
$$;

-- 2) Turmas 6º–9º A–D (nomes únicos, como exige a tabela)
update public.classes set name = '6º ano D', updated_at = now() where name = 'D';

insert into public.classes (name, school_year, shift, active)
values
  ('6º ano A', 6, 'manha', true),
  ('6º ano B', 6, 'manha', true),
  ('6º ano C', 6, 'manha', true),
  ('7º ano A', 7, 'manha', true),
  ('7º ano B', 7, 'manha', true),
  ('7º ano C', 7, 'manha', true),
  ('7º ano D', 7, 'manha', true),
  ('8º ano A', 8, 'manha', true),
  ('8º ano B', 8, 'manha', true),
  ('8º ano C', 8, 'manha', true),
  ('8º ano D', 8, 'manha', true),
  ('9º ano A', 9, 'manha', true),
  ('9º ano B', 9, 'manha', true),
  ('9º ano C', 9, 'manha', true),
  ('9º ano D', 9, 'manha', true)
on conflict (name) do nothing;

-- 3) Grade horária por turma (antes era fixa no código, sempre a do 6º D)
create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes(id) on delete cascade,
  grade jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.class_schedules enable row level security;

drop policy if exists class_schedules_select_member on public.class_schedules;
create policy class_schedules_select_member on public.class_schedules for select to authenticated
  using (public.is_class_member(class_id));

drop policy if exists class_schedules_admin_all on public.class_schedules;
create policy class_schedules_admin_all on public.class_schedules for all to authenticated
  using (public.is_admin() and not public.is_demo_class(class_id))
  with check (public.is_admin() and not public.is_demo_class(class_id));

drop trigger if exists class_schedules_set_updated_at on public.class_schedules;
create trigger class_schedules_set_updated_at before update on public.class_schedules
  for each row execute function public.set_updated_at();

-- Semente: grade oficial do 6º ano D (antes embutida no app)
insert into public.class_schedules (class_id, grade)
select c.id,
  '[
    {"tipo":"aula","numero":1,"horario":"07:00–07:50","dias":[{"materia":"LP","professor":"Mariana"},{"materia":"MAT","professor":"Maria Celia"},{"materia":"LP","professor":"Mariana"},{"materia":"MAT","professor":"Maria Celia"},{"materia":"CIE","professor":"Mauricio"}]},
    {"tipo":"aula","numero":2,"horario":"07:50–08:40","dias":[{"materia":"LP","professor":"Mariana"},{"materia":"MAT","professor":"Maria Celia"},{"materia":"HIS","professor":"Lucas"},{"materia":"MAT","professor":"Maria Celia"},{"materia":"CIE","professor":"Mauricio"}]},
    {"tipo":"intervalo","horario":"08:40–09:00"},
    {"tipo":"aula","numero":3,"horario":"09:00–09:50","dias":[{"materia":"HIS","professor":"Lucas"},{"materia":"LP","professor":"Mariana"},{"materia":"EF","professor":"Fabiana"},{"materia":"ART","professor":"Débora"},{"materia":"ING","professor":"Sandra"}]},
    {"tipo":"aula","numero":4,"horario":"09:50–10:40","dias":[{"materia":"MAT","professor":"Maria Celia"},{"materia":"ART","professor":"Débora"},{"materia":"ING","professor":"Sandra"},{"materia":"GEO","professor":"Milton"},{"materia":"GEO","professor":"Milton"}]},
    {"tipo":"aula","numero":5,"horario":"10:40–11:30","dias":[{"materia":"GEO","professor":"Milton"},{"materia":"HIS","professor":"Lucas"},{"materia":"CIE","professor":"Mauricio"},{"materia":"EF","professor":"Fabiana"},{"materia":"LP","professor":"Mariana"}]}
  ]'::jsonb
from public.classes c
where c.name = '6º ano D'
on conflict (class_id) do nothing;

-- 4) A notificação de boas-vindas da demonstração apontava para o 6º D
update public.notifications n
set class_id = (select c.id from public.classes c where c.is_demo limit 1)
where n.title = 'Bem-vindo à conta de demonstração'
  and n.class_id is distinct from (select c.id from public.classes c where c.is_demo limit 1);

-- 5) Aluno sem vínculo escolhe a própria turma (contas Google não escolhem no cadastro)
create or replace function public.escolher_minha_turma(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
begin
  select c.id into v_class_id
  from public.classes c
  where c.id = p_class_id and c.active and not coalesce(c.is_demo, false);

  if v_class_id is null then
    raise exception 'Turma inválida. Escolha uma das turmas disponíveis.'
      using errcode = '22023';
  end if;

  insert into public.class_memberships (user_id, class_id, membership_status)
  values (auth.uid(), v_class_id, 'ativo')
  on conflict (user_id, class_id) do update set membership_status = 'ativo';

  insert into public.user_preferences (user_id, preferred_class_id)
  values (auth.uid(), v_class_id)
  on conflict (user_id) do update set preferred_class_id = excluded.preferred_class_id
  where public.user_preferences.preferred_class_id is null;
end;
$$;

revoke all on function public.escolher_minha_turma(uuid) from public, anon;
grant execute on function public.escolher_minha_turma(uuid) to authenticated;
