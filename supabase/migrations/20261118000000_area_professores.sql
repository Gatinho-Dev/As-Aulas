-- Área dos professores: solicitações, vínculo com turmas e papel 'teacher'.
-- Fluxo: professor cria conta (auth + profiles) -> linha em teacher_requests (pendente)
-- -> admin aprova (role='teacher' + teacher_classes) ou rejeita.

-- 1) Papel 'teacher' no perfil
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'student', 'teacher'));

-- 2) Guarda: admin agora pode alterar a função (para aprovar professor)
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'A função de acesso só pode ser alterada por um processo administrativo autorizado.'
        using errcode = '42501';
    end if;
    if new.active is distinct from old.active and not public.is_admin() then
      raise exception 'Somente administradores podem ativar ou desativar contas.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- 3) Tabelas
create table if not exists public.teacher_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 3 and 120),
  subject text not null check (char_length(btrim(subject)) between 2 and 80),
  email_contact text not null check (char_length(btrim(email_contact)) between 5 and 160),
  years smallint[] not null default '{}',
  class_ids uuid[] not null default '{}',
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  admin_note text check (char_length(admin_note) <= 500),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teacher_requests_status_idx on public.teacher_requests (status, created_at desc);

create table if not exists public.teacher_classes (
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint teacher_classes_pkey primary key (teacher_id, class_id)
);
create index if not exists teacher_classes_class_idx on public.teacher_classes (class_id);

drop trigger if exists teacher_requests_set_updated_at on public.teacher_requests;
create trigger teacher_requests_set_updated_at before update on public.teacher_requests
  for each row execute function public.set_updated_at();

-- 4) Auxiliares
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher' and p.active
  );
$$;

create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_classes tc
    join public.profiles p on p.id = tc.teacher_id
    where tc.teacher_id = auth.uid()
      and tc.class_id = p_class_id
      and p.role = 'teacher'
      and p.active
  );
$$;

-- 5) RLS
alter table public.teacher_requests enable row level security;
alter table public.teacher_classes enable row level security;

drop policy if exists teacher_requests_insert_own on public.teacher_requests;
create policy teacher_requests_insert_own on public.teacher_requests for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists teacher_requests_select_own on public.teacher_requests;
create policy teacher_requests_select_own on public.teacher_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists teacher_requests_update_own_pending on public.teacher_requests;
create policy teacher_requests_update_own_pending on public.teacher_requests for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists teacher_requests_admin_all on public.teacher_requests;
create policy teacher_requests_admin_all on public.teacher_requests for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists teacher_classes_select on public.teacher_classes;
create policy teacher_classes_select on public.teacher_classes for select to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists teacher_classes_admin_all on public.teacher_classes;
create policy teacher_classes_admin_all on public.teacher_classes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 6) Professor enxerga as turmas e disciplinas das salas dele
drop policy if exists classes_teacher_select on public.classes;
create policy classes_teacher_select on public.classes for select to authenticated
  using (active and public.is_teacher_of_class(id));

-- Papel de um nick para o login de aluno dar mensagem certa quando o nick é de professor.
-- (O e-mail de professor nunca é resolvido pelo login de aluno; isso aqui só escolhe a mensagem.)
create or replace function public.papel_por_nick(p_nick text)
returns text language sql stable security definer set search_path to '' as $$
  select p.role::text
    from public.profiles p
   where lower(p.username) = lower(btrim(coalesce(p_nick, '')))
   limit 1;
$$;
revoke all on function public.papel_por_nick(text) from public;
grant execute on function public.papel_por_nick(text) to anon, authenticated;

-- O professor precisa ler os vínculos turma↔matéria das salas dele (sem isso o EXISTS acima não enxerga nada).
drop policy if exists class_subjects_teacher_select on public.class_subjects;
create policy class_subjects_teacher_select on public.class_subjects for select to authenticated
  using (public.is_teacher_of_class(class_id));

drop policy if exists subjects_teacher_select on public.subjects;
create policy subjects_teacher_select on public.subjects for select to authenticated
  using (
    active and exists (
      select 1 from public.class_subjects cs
      where cs.subject_id = subjects.id
        and public.is_teacher_of_class(cs.class_id)
    )
  );

-- 7) Professor publica lições / trabalhos / provas nas turmas dele
drop policy if exists assignments_teacher_select on public.assignments;
create policy assignments_teacher_select on public.assignments for select to authenticated
  using (public.is_teacher_of_class(class_id));

drop policy if exists assignments_teacher_insert on public.assignments;
create policy assignments_teacher_insert on public.assignments for insert to authenticated
  with check (public.is_teacher_of_class(class_id) and created_by = auth.uid());

drop policy if exists assignments_teacher_update on public.assignments;
create policy assignments_teacher_update on public.assignments for update to authenticated
  using (public.is_teacher_of_class(class_id))
  with check (public.is_teacher_of_class(class_id));

drop policy if exists assignments_teacher_delete on public.assignments;
create policy assignments_teacher_delete on public.assignments for delete to authenticated
  using (public.is_teacher_of_class(class_id));

-- 8) Professor publica avisos por turma (sem aviso global)
drop policy if exists announcements_teacher_select on public.announcements;
create policy announcements_teacher_select on public.announcements for select to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.announcement_targets t
      where t.announcement_id = announcements.id
        and public.is_teacher_of_class(t.class_id)
    )
  );

drop policy if exists announcements_teacher_insert on public.announcements;
create policy announcements_teacher_insert on public.announcements for insert to authenticated
  with check (author_id = auth.uid() and is_global = false);

drop policy if exists announcements_teacher_update on public.announcements;
create policy announcements_teacher_update on public.announcements for update to authenticated
  using (author_id = auth.uid() and is_global = false)
  with check (author_id = auth.uid() and is_global = false);

-- Sem referência a announcements aqui: o contrário (esta policy ler announcements
-- enquanto policies de announcements leem announcement_targets) gera recursão infinita (42P17).
-- Os avisos do professor sempre miram só as turmas dele (garantido no insert), então basta a sala.
drop policy if exists announcement_targets_teacher_select on public.announcement_targets;
create policy announcement_targets_teacher_select on public.announcement_targets for select to authenticated
  using (public.is_teacher_of_class(class_id));

drop policy if exists announcement_targets_teacher_insert on public.announcement_targets;
create policy announcement_targets_teacher_insert on public.announcement_targets for insert to authenticated
  with check (
    public.is_teacher_of_class(class_id)
    and exists (
      select 1 from public.announcements a
      where a.id = announcement_targets.announcement_id and a.author_id = auth.uid() and a.is_global = false
    )
  );
