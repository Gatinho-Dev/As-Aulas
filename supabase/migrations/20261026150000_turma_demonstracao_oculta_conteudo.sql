-- Turma de demonstração: administradores não enxergam o conteúdo dela
-- (atividades, avisos, eventos, notificações, progresso e representantes).
-- Os alunos vinculados continuam acessando normalmente pelas políticas de membro.

create or replace function public.is_demo_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes c where c.id = p_class_id and c.is_demo
  );
$$;

-- assignments (lições, provas e trabalhos)
drop policy if exists assignments_admin_all on public.assignments;
create policy assignments_admin_all on public.assignments for all to authenticated
  using (public.is_admin() and not public.is_demo_class(class_id))
  with check (public.is_admin() and not public.is_demo_class(class_id));

-- assignment_progress: administradores não leem o progresso da turma de demonstração
drop policy if exists assignment_progress_admin_select on public.assignment_progress;
create policy assignment_progress_admin_select on public.assignment_progress for select to authenticated
  using (
    public.is_admin()
    and not exists (
      select 1 from public.assignments a
      where a.id = assignment_progress.assignment_id and public.is_demo_class(a.class_id)
    )
  );

-- class_subjects
drop policy if exists class_subjects_admin_all on public.class_subjects;
create policy class_subjects_admin_all on public.class_subjects for all to authenticated
  using (public.is_admin() and not public.is_demo_class(class_id))
  with check (public.is_admin() and not public.is_demo_class(class_id));

-- events (eventos globais, sem turma, continuam visíveis)
drop policy if exists events_admin_all on public.events;
create policy events_admin_all on public.events for all to authenticated
  using (public.is_admin() and not public.is_demo_class(class_id))
  with check (public.is_admin() and not public.is_demo_class(class_id));

-- announcements e seus destinos
drop policy if exists announcements_admin_all on public.announcements;
create policy announcements_admin_all on public.announcements for all to authenticated
  using (
    public.is_admin()
    and not exists (
      select 1 from public.announcement_targets t
      where t.announcement_id = announcements.id and public.is_demo_class(t.class_id)
    )
  )
  with check (
    public.is_admin()
    and not exists (
      select 1 from public.announcement_targets t
      where t.announcement_id = announcements.id and public.is_demo_class(t.class_id)
    )
  );

drop policy if exists announcement_targets_admin_all on public.announcement_targets;
create policy announcement_targets_admin_all on public.announcement_targets for all to authenticated
  using (public.is_admin() and not public.is_demo_class(class_id))
  with check (public.is_admin() and not public.is_demo_class(class_id));

-- notifications (notificações globais, sem turma, continuam visíveis)
drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all on public.notifications for all to authenticated
  using (public.is_admin() and not public.is_demo_class(class_id))
  with check (public.is_admin() and not public.is_demo_class(class_id));

-- representantes da turma de demonstração
drop policy if exists class_representatives_select_self on public.class_representatives;
create policy class_representatives_select_self on public.class_representatives for select to authenticated
  using (user_id = auth.uid() or (public.is_admin() and not public.is_demo_class(class_id)));

drop policy if exists class_representatives_admin_insert on public.class_representatives;
create policy class_representatives_admin_insert on public.class_representatives for insert to authenticated
  with check (
    public.is_admin()
    and not public.is_demo_class(class_id)
    and exists (
      select 1 from public.class_memberships m
      where m.class_id = class_representatives.class_id
        and m.user_id = class_representatives.user_id
        and m.membership_status = 'ativo'
    )
  );

drop policy if exists class_representatives_admin_delete on public.class_representatives;
create policy class_representatives_admin_delete on public.class_representatives for delete to authenticated
  using (public.is_admin() and not public.is_demo_class(class_id));
