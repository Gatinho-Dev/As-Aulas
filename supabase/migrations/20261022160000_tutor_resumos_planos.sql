-- Tutor IA: resumos e planos de estudo gerados pela IA, salvos por aluno.

create table if not exists public.tutor_resumos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  materia text not null default '' check (char_length(materia) <= 120),
  dados jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists tutor_resumos_user_idx on public.tutor_resumos (user_id, created_at desc);

create table if not exists public.tutor_planos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  materia text not null default '' check (char_length(materia) <= 120),
  objetivo text not null default '' check (char_length(objetivo) <= 300),
  dados jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists tutor_planos_user_idx on public.tutor_planos (user_id, created_at desc);

alter table public.tutor_resumos enable row level security;
alter table public.tutor_planos enable row level security;

drop policy if exists tutor_resumos_select on public.tutor_resumos;
create policy tutor_resumos_select on public.tutor_resumos
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_resumos_insert on public.tutor_resumos;
create policy tutor_resumos_insert on public.tutor_resumos
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_resumos_delete on public.tutor_resumos;
create policy tutor_resumos_delete on public.tutor_resumos
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

drop policy if exists tutor_planos_select on public.tutor_planos;
create policy tutor_planos_select on public.tutor_planos
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_planos_insert on public.tutor_planos;
create policy tutor_planos_insert on public.tutor_planos
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_planos_delete on public.tutor_planos;
create policy tutor_planos_delete on public.tutor_planos
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

revoke all on public.tutor_resumos from anon;
revoke all on public.tutor_planos from anon;

grant select, insert, delete on public.tutor_resumos to authenticated;
grant select, insert, delete on public.tutor_planos to authenticated;
