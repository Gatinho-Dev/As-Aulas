-- Tutor IA: flashcards e simulados gerados pela IA e salvos por aluno.
-- Mesmo padrão de segurança das tabelas do tutor: RLS por auth.uid() e conta ativa.

create table if not exists public.tutor_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  materia text not null default '' check (char_length(materia) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tutor_decks_user_idx on public.tutor_decks (user_id, created_at desc);

create table if not exists public.tutor_deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.tutor_decks (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  frente text not null check (char_length(btrim(frente)) between 1 and 600),
  verso text not null check (char_length(btrim(verso)) between 1 and 2000),
  ordem int not null default 0,
  status text not null default 'novo' check (status in ('novo', 'sabido', 'revisar')),
  revisado_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tutor_deck_cards_deck_idx on public.tutor_deck_cards (deck_id, ordem);

create table if not exists public.tutor_quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  materia text not null default '' check (char_length(materia) <= 120),
  ultimo_resultado jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tutor_quizzes_user_idx on public.tutor_quizzes (user_id, created_at desc);

create table if not exists public.tutor_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.tutor_quizzes (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  enunciado text not null check (char_length(btrim(enunciado)) between 1 and 1200),
  alternativas jsonb not null check (jsonb_typeof(alternativas) = 'array'),
  correta int not null check (correta between 0 and 9),
  explicacao text not null default '' check (char_length(explicacao) <= 2000),
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tutor_quiz_questions_quiz_idx on public.tutor_quiz_questions (quiz_id, ordem);

drop trigger if exists tutor_decks_set_updated_at on public.tutor_decks;
create trigger tutor_decks_set_updated_at
  before update on public.tutor_decks
  for each row execute function public.set_updated_at();

drop trigger if exists tutor_quizzes_set_updated_at on public.tutor_quizzes;
create trigger tutor_quizzes_set_updated_at
  before update on public.tutor_quizzes
  for each row execute function public.set_updated_at();

alter table public.tutor_decks enable row level security;
alter table public.tutor_deck_cards enable row level security;
alter table public.tutor_quizzes enable row level security;
alter table public.tutor_quiz_questions enable row level security;

drop policy if exists tutor_decks_select on public.tutor_decks;
create policy tutor_decks_select on public.tutor_decks
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_decks_insert on public.tutor_decks;
create policy tutor_decks_insert on public.tutor_decks
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_decks_update on public.tutor_decks;
create policy tutor_decks_update on public.tutor_decks
  for update to authenticated using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid());
drop policy if exists tutor_decks_delete on public.tutor_decks;
create policy tutor_decks_delete on public.tutor_decks
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

drop policy if exists tutor_deck_cards_select on public.tutor_deck_cards;
create policy tutor_deck_cards_select on public.tutor_deck_cards
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_deck_cards_insert on public.tutor_deck_cards;
create policy tutor_deck_cards_insert on public.tutor_deck_cards
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_active_user()
    and exists (select 1 from public.tutor_decks d where d.id = deck_id and d.user_id = auth.uid())
  );
drop policy if exists tutor_deck_cards_update on public.tutor_deck_cards;
create policy tutor_deck_cards_update on public.tutor_deck_cards
  for update to authenticated using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid());
drop policy if exists tutor_deck_cards_delete on public.tutor_deck_cards;
create policy tutor_deck_cards_delete on public.tutor_deck_cards
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

drop policy if exists tutor_quizzes_select on public.tutor_quizzes;
create policy tutor_quizzes_select on public.tutor_quizzes
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_quizzes_insert on public.tutor_quizzes;
create policy tutor_quizzes_insert on public.tutor_quizzes
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_quizzes_update on public.tutor_quizzes;
create policy tutor_quizzes_update on public.tutor_quizzes
  for update to authenticated using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid());
drop policy if exists tutor_quizzes_delete on public.tutor_quizzes;
create policy tutor_quizzes_delete on public.tutor_quizzes
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

drop policy if exists tutor_quiz_questions_select on public.tutor_quiz_questions;
create policy tutor_quiz_questions_select on public.tutor_quiz_questions
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
drop policy if exists tutor_quiz_questions_insert on public.tutor_quiz_questions;
create policy tutor_quiz_questions_insert on public.tutor_quiz_questions
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_active_user()
    and exists (select 1 from public.tutor_quizzes q where q.id = quiz_id and q.user_id = auth.uid())
  );
drop policy if exists tutor_quiz_questions_delete on public.tutor_quiz_questions;
create policy tutor_quiz_questions_delete on public.tutor_quiz_questions
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

revoke all on public.tutor_decks from anon;
revoke all on public.tutor_deck_cards from anon;
revoke all on public.tutor_quizzes from anon;
revoke all on public.tutor_quiz_questions from anon;

grant select, insert, update, delete on public.tutor_decks to authenticated;
grant select, insert, update, delete on public.tutor_deck_cards to authenticated;
grant select, insert, update, delete on public.tutor_quizzes to authenticated;
grant select, insert, delete on public.tutor_quiz_questions to authenticated;
