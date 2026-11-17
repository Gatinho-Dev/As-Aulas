-- Turma de demonstração: visível somente para os alunos vinculados a ela.
-- Nem administradores enxergam a turma nem os vínculos dela.

alter table public.classes
  add column if not exists is_demo boolean not null default false;

update public.classes
   set is_demo = true
 where name = 'Demonstração';

-- classes: administradores gerenciam as turmas, exceto a de demonstração
drop policy if exists classes_admin_all on public.classes;
create policy classes_admin_all on public.classes for all to authenticated
  using (public.is_admin() and not is_demo)
  with check (public.is_admin() and not is_demo);

-- class_memberships: administradores não veem vínculos da turma de demonstração
drop policy if exists class_memberships_admin_all on public.class_memberships;
create policy class_memberships_admin_all on public.class_memberships for all to authenticated
  using (
    public.is_admin()
    and not exists (select 1 from public.classes c where c.id = class_id and c.is_demo)
  )
  with check (
    public.is_admin()
    and not exists (select 1 from public.classes c where c.id = class_id and c.is_demo)
  );
