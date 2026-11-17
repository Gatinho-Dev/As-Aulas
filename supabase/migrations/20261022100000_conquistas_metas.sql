-- Metas pessoais do aluno
create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  category text not null default 'outra' check (category in ('estudos', 'organizacao', 'atividades', 'materia', 'outra')),
  subject_id uuid references public.subjects (id) on delete set null,
  tracking_type text not null check (tracking_type in ('quantidade_atividades', 'manual')),
  target_count integer check (target_count is null or target_count between 1 and 1000),
  status text not null default 'em_andamento' check (status in ('nao_iniciada', 'em_andamento', 'concluida', 'pausada', 'arquivada')),
  start_date date not null default current_date,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_goals_target_required check (
    (tracking_type = 'quantidade_atividades' and target_count is not null) or
    (tracking_type = 'manual' and target_count is null)
  ),
  constraint user_goals_completed_consistency check ((status = 'concluida') = (completed_at is not null))
);
create index user_goals_user_id_idx on public.user_goals (user_id);

-- Conquistas desbloqueadas: uma linha por aluno e conquista
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_code text not null check (char_length(achievement_code) between 1 and 60),
  unlocked_at timestamptz not null default now(),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  constraint user_achievements_one_per_user unique (user_id, achievement_code)
);

-- Registro de XP: a origem é única, então nada é concedido duas vezes
create table public.user_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_key text not null check (char_length(source_key) between 1 and 120),
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  constraint user_xp_events_source_unique unique (user_id, source_key)
);

alter table public.user_goals enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_xp_events enable row level security;

create policy user_goals_own on public.user_goals for all to authenticated
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

create policy user_achievements_select_own on public.user_achievements for select to authenticated
  using (user_id = auth.uid() and public.is_active_user());

create policy user_xp_events_select_own on public.user_xp_events for select to authenticated
  using (user_id = auth.uid() and public.is_active_user());

-- Impede alteração direta de conquistas e XP pelo navegador: só o servidor/RPC escreve nelas.
-- Não há políticas de insert/update/delete para essas tabelas.

create trigger user_goals_set_updated_at before update on public.user_goals
  for each row execute function public.set_updated_at();
