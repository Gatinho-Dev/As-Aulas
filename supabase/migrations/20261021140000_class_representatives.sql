-- Representantes de turma: alunos ativos da turma que podem cuidar de atividades e avisos dela.
-- Somente administradores cadastram/removem representantes.

create table if not exists public.class_representatives (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint class_representatives_pkey primary key (class_id, user_id)
);
create index if not exists class_representatives_user_id_idx on public.class_representatives (user_id);

alter table public.class_representatives enable row level security;

create or replace function public.is_class_representative(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_representatives r
    where r.class_id = p_class_id and r.user_id = auth.uid()
  );
$$;

create or replace function public.is_any_class_representative()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_representatives r
    where r.user_id = auth.uid()
  );
$$;

create policy class_representatives_select_self on public.class_representatives for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy class_representatives_admin_insert on public.class_representatives for insert to authenticated
  with check (
    public.is_admin()
    and exists (
      select 1 from public.class_memberships m
      where m.class_id = class_representatives.class_id
        and m.user_id = class_representatives.user_id
        and m.membership_status = 'ativo'
    )
  );
create policy class_representatives_admin_delete on public.class_representatives for delete to authenticated
  using (public.is_admin());

-- Representantes gerenciam atividades (lições, trabalhos e provas) da própria turma.
create policy assignments_representative_select on public.assignments for select to authenticated
  using (public.is_class_representative(class_id));
create policy assignments_representative_insert on public.assignments for insert to authenticated
  with check (public.is_class_representative(class_id) and created_by = auth.uid());
create policy assignments_representative_update on public.assignments for update to authenticated
  using (public.is_class_representative(class_id))
  with check (public.is_class_representative(class_id));
create policy assignments_representative_delete on public.assignments for delete to authenticated
  using (public.is_class_representative(class_id));

-- Representantes publicam avisos apenas para a própria turma (nunca para toda a escola).
create policy announcements_representative_select on public.announcements for select to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.announcement_targets t
      where t.announcement_id = announcements.id and public.is_class_representative(t.class_id)
    )
  );
create policy announcements_representative_insert on public.announcements for insert to authenticated
  with check (
    author_id = auth.uid()
    and is_global = false
    and public.is_any_class_representative()
  );
create policy announcements_representative_update on public.announcements for update to authenticated
  using (author_id = auth.uid() and is_global = false)
  with check (author_id = auth.uid() and is_global = false);

create policy announcement_targets_representative_select on public.announcement_targets for select to authenticated
  using (public.is_class_representative(class_id));
create policy announcement_targets_representative_insert on public.announcement_targets for insert to authenticated
  with check (
    public.is_class_representative(class_id)
    and exists (
      select 1 from public.announcements a
      where a.id = announcement_targets.announcement_id and a.author_id = auth.uid() and a.is_global = false
    )
  );
