-- As Aulas: esquema inicial (Supabase / PostgreSQL 15+)
-- Datas são armazenadas em timestamptz (UTC) e exibidas em America/Sao_Paulo.
-- Papéis: 'admin' e 'student'. Visitantes não possuem perfil e não acessam dados privados.
-- A função de cada conta só pode ser alterada fora da aplicação (SQL com service role / painel).

-- ============================================================
-- Tabelas
-- ============================================================

-- Perfil público do usuário, criado automaticamente a partir de auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  role text not null default 'student' check (role in ('admin', 'student')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 60),
  school_year smallint not null check (school_year between 1 and 12),
  shift text check (shift in ('manha', 'tarde', 'noite', 'integral')),
  description text check (char_length(description) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  membership_status text not null default 'ativo' check (membership_status in ('pendente', 'ativo', 'removido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_memberships_user_class_key unique (user_id, class_id)
);
create index class_memberships_class_id_idx on public.class_memberships (class_id);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 60),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  description text check (char_length(description) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  teacher_name text check (char_length(teacher_name) <= 80),
  constraint class_subjects_class_subject_key unique (class_id, subject_id)
);
create index class_subjects_subject_id_idx on public.class_subjects (subject_id);

-- Lições de casa, trabalhos e avaliações (provas) em uma só tabela, diferenciadas por type
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('licao_casa', 'trabalho', 'prova')),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  description text check (char_length(description) <= 5000),
  instructions text check (char_length(instructions) <= 10000),
  reference_materials text check (char_length(reference_materials) <= 5000),
  evaluation_criteria text check (char_length(evaluation_criteria) <= 5000),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  class_id uuid not null references public.classes (id) on delete restrict,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  is_group boolean not null default false,
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta')),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada', 'arquivada')),
  published_at timestamptz,
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_published_has_date check (status <> 'publicada' or published_at is not null),
  constraint assignments_due_after_publication check (published_at is null or due_at >= published_at)
);
create index assignments_class_due_idx on public.assignments (class_id, due_at);
create index assignments_subject_id_idx on public.assignments (subject_id);
create index assignments_created_by_idx on public.assignments (created_by);
create index assignments_status_published_idx on public.assignments (status, published_at);

-- Progresso pessoal: um único registro por aluno e atividade
create table public.assignment_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  personal_status text not null default 'pendente' check (personal_status in ('pendente', 'em_andamento', 'concluida')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_progress_one_per_user unique (assignment_id, user_id),
  constraint assignment_progress_completed_consistency check ((personal_status = 'concluida') = (completed_at is not null))
);
create index assignment_progress_user_id_idx on public.assignment_progress (user_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  description text check (char_length(description) <= 5000),
  category text not null check (category in ('evento', 'reuniao', 'data_comemorativa', 'outro')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text check (char_length(location) <= 150),
  link_url text check (link_url ~* '^https?://'),
  class_id uuid references public.classes (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at >= starts_at)
);
create index events_starts_at_idx on public.events (starts_at);
create index events_class_starts_idx on public.events (class_id, starts_at);
create index events_subject_id_idx on public.events (subject_id);
create index events_created_by_idx on public.events (created_by);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  category text not null check (category in ('geral', 'tarefa', 'prova', 'trabalho', 'evento', 'alteracao_horario', 'comunicado_importante')),
  importance text not null default 'normal' check (importance in ('normal', 'importante', 'urgente')),
  is_global boolean not null default false,
  link_url text check (link_url ~* '^https?://'),
  author_id uuid references public.profiles (id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'arquivado')),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_published_has_date check (status <> 'publicado' or published_at is not null),
  constraint announcements_expiry_after_publication check (expires_at is null or published_at is null or expires_at > published_at)
);
create index announcements_published_idx on public.announcements (status, published_at desc);
create index announcements_author_id_idx on public.announcements (author_id);

-- Destinatários de avisos (avisos globais não possuem linhas aqui)
create table public.announcement_targets (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  constraint announcement_targets_unique_class unique (announcement_id, class_id)
);
create index announcement_targets_class_id_idx on public.announcement_targets (class_id);

-- Notificações internas (sem e-mail/WhatsApp/push). dedupe_key evita duplicidades.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('nova_atividade', 'prova_proxima', 'novo_aviso', 'atividade_alterada', 'evento_importante')),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  message text not null check (char_length(message) <= 500),
  link_path text not null check (link_path ~ '^/[^ ]*$'),
  class_id uuid references public.classes (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete cascade,
  announcement_id uuid references public.announcements (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);
create index notifications_class_created_idx on public.notifications (class_id, created_at desc);

create table public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  constraint notification_reads_one_per_user unique (notification_id, user_id)
);
create index notification_reads_user_id_idx on public.notification_reads (user_id);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  preferred_class_id uuid references public.classes (id) on delete set null,
  theme text not null default 'sistema' check (theme in ('claro', 'escuro', 'sistema')),
  notification_preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(notification_preferences) = 'object'),
  updated_at timestamptz not null default now()
);
create index user_preferences_class_id_idx on public.user_preferences (preferred_class_id);

-- ============================================================
-- Funções auxiliares (RLS e integridade)
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.active
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
  );
$$;

create or replace function public.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_memberships m
    join public.classes c on c.id = m.class_id
    join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid()
      and m.class_id = p_class_id
      and m.membership_status = 'ativo'
      and c.active
      and p.active
  );
$$;

-- Cria o perfil automaticamente ao registrar uma conta. Nunca concede administração.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Aluno'), 80)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Protege função e status da conta contra alterações feitas pelo navegador
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if new.role is distinct from old.role then
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

create trigger profiles_guard_changes
  before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- A turma principal precisa ser uma associação ativa do próprio usuário
create or replace function public.check_preferred_class()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.preferred_class_id is not null and not exists (
    select 1 from public.class_memberships m
    where m.user_id = new.user_id
      and m.class_id = new.preferred_class_id
      and m.membership_status = 'ativo'
  ) then
    raise exception 'A turma principal precisa ser uma turma ativa do aluno.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger user_preferences_check_class
  before insert or update on public.user_preferences
  for each row execute function public.check_preferred_class();

-- Avisos globais não podem ter turmas específicas
create or replace function public.check_announcement_target()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.announcements a
    where a.id = new.announcement_id and a.is_global
  ) then
    raise exception 'Avisos globais não podem ter turmas específicas.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger announcement_targets_check_global
  before insert or update on public.announcement_targets
  for each row execute function public.check_announcement_target();

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger classes_set_updated_at before update on public.classes
  for each row execute function public.set_updated_at();
create trigger class_memberships_set_updated_at before update on public.class_memberships
  for each row execute function public.set_updated_at();
create trigger subjects_set_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();
create trigger assignments_set_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();
create trigger assignment_progress_set_updated_at before update on public.assignment_progress
  for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger announcements_set_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table public.subjects enable row level security;
alter table public.class_subjects enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_progress enable row level security;
alter table public.events enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.user_preferences enable row level security;

-- profiles: o próprio usuário e administradores
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- classes: alunos veem apenas turmas ativas às quais pertencem
create policy classes_select_member on public.classes for select to authenticated
  using (active and public.is_class_member(id));
create policy classes_admin_all on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- class_memberships: o próprio vínculo e administradores
create policy class_memberships_select_self on public.class_memberships for select to authenticated
  using (user_id = auth.uid());
create policy class_memberships_admin_all on public.class_memberships for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- subjects: disciplinas ativas de turmas do aluno
create policy subjects_select_member on public.subjects for select to authenticated
  using (
    active and exists (
      select 1 from public.class_subjects cs
      where cs.subject_id = subjects.id and public.is_class_member(cs.class_id)
    )
  );
create policy subjects_admin_all on public.subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy class_subjects_select_member on public.class_subjects for select to authenticated
  using (public.is_class_member(class_id));
create policy class_subjects_admin_all on public.class_subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- assignments: somente publicadas, da turma do aluno
create policy assignments_select_published on public.assignments for select to authenticated
  using (status = 'publicada' and published_at <= now() and public.is_class_member(class_id));
create policy assignments_admin_all on public.assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- assignment_progress: cada aluno lê e altera somente o próprio progresso em atividades visíveis
create policy assignment_progress_select_own on public.assignment_progress for select to authenticated
  using (user_id = auth.uid() and exists (select 1 from public.assignments a where a.id = assignment_id));
create policy assignment_progress_insert_own on public.assignment_progress for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.assignments a where a.id = assignment_id));
create policy assignment_progress_update_own on public.assignment_progress for update to authenticated
  using (user_id = auth.uid() and exists (select 1 from public.assignments a where a.id = assignment_id))
  with check (user_id = auth.uid() and exists (select 1 from public.assignments a where a.id = assignment_id));
create policy assignment_progress_delete_own on public.assignment_progress for delete to authenticated
  using (user_id = auth.uid());
create policy assignment_progress_admin_select on public.assignment_progress for select to authenticated
  using (public.is_admin());

-- events: globais ou das turmas do aluno
create policy events_select_visible on public.events for select to authenticated
  using (public.is_active_user() and (class_id is null or public.is_class_member(class_id)));
create policy events_admin_all on public.events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- announcements: publicados, não expirados, globais ou das turmas do aluno
create policy announcements_select_visible on public.announcements for select to authenticated
  using (
    public.is_active_user()
    and status = 'publicado'
    and published_at <= now()
    and (expires_at is null or expires_at > now())
    and (
      is_global
      or exists (
        select 1 from public.announcement_targets t
        where t.announcement_id = announcements.id and public.is_class_member(t.class_id)
      )
    )
  );
create policy announcements_admin_all on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy announcement_targets_select_member on public.announcement_targets for select to authenticated
  using (public.is_class_member(class_id));
create policy announcement_targets_admin_all on public.announcement_targets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- notifications: globais ou das turmas do aluno; criação apenas por administradores/processos do backend
create policy notifications_select_visible on public.notifications for select to authenticated
  using (public.is_active_user() and (class_id is null or public.is_class_member(class_id)));
create policy notifications_admin_all on public.notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- notification_reads: somente o próprio status de leitura
create policy notification_reads_own on public.notification_reads for all to authenticated
  using (user_id = auth.uid() and exists (select 1 from public.notifications n where n.id = notification_id))
  with check (user_id = auth.uid() and exists (select 1 from public.notifications n where n.id = notification_id));

-- user_preferences: somente do próprio usuário
create policy user_preferences_own on public.user_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Visitantes (role anon) não recebem nenhum privilégio nas tabelas de domínio
revoke all on all tables in schema public from anon;
