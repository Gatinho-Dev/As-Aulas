-- Tutor IA: conversas, mensagens e controle de uso diário da Gemini API.
-- Cada aluno acessa somente os próprios registros (RLS por auth.uid()).

create table public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null default 'Nova conversa' check (char_length(btrim(title)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tutor_conversations_user_idx on public.tutor_conversations (user_id, updated_at desc);

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index tutor_messages_conversation_idx on public.tutor_messages (conversation_id, created_at);

create table public.tutor_ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null default (now() at time zone 'America/Sao_Paulo')::date,
  requests int not null default 0 check (requests >= 0),
  primary key (user_id, usage_date)
);

create trigger tutor_conversations_set_updated_at
  before update on public.tutor_conversations
  for each row execute function public.set_updated_at();

-- Registra uma requisição de IA do dia para o aluno autenticado.
-- Retorna o total usado no dia; levanta erro quando o limite já foi atingido.
create or replace function public.tutor_registrar_uso(p_limite int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  total int;
begin
  if uid is null or not public.is_active_user() then
    raise exception 'nao_autenticado' using errcode = '42501';
  end if;

  insert into public.tutor_ai_usage (user_id, usage_date, requests)
  values (uid, hoje, 0)
  on conflict (user_id, usage_date) do nothing;

  update public.tutor_ai_usage u
     set requests = u.requests + 1
   where u.user_id = uid and u.usage_date = hoje and u.requests < p_limite
  returning u.requests into total;

  if total is null then
    raise exception 'limite_diario' using errcode = 'P0001';
  end if;

  return total;
end;
$$;

revoke all on function public.tutor_registrar_uso(int) from public, anon;
grant execute on function public.tutor_registrar_uso(int) to authenticated;

-- RLS: somente o próprio aluno (e conta ativa) lê e altera seus dados
alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.tutor_ai_usage enable row level security;

create policy tutor_conversations_select on public.tutor_conversations
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
create policy tutor_conversations_insert on public.tutor_conversations
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
create policy tutor_conversations_update on public.tutor_conversations
  for update to authenticated using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid());
create policy tutor_conversations_delete on public.tutor_conversations
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

create policy tutor_messages_select on public.tutor_messages
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
create policy tutor_messages_insert on public.tutor_messages
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_active_user()
    and exists (
      select 1 from public.tutor_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
create policy tutor_messages_delete on public.tutor_messages
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

create policy tutor_ai_usage_select on public.tutor_ai_usage
  for select to authenticated using (user_id = auth.uid());

revoke all on public.tutor_conversations from anon;
revoke all on public.tutor_messages from anon;
revoke all on public.tutor_ai_usage from anon, authenticated;
grant select, insert, update, delete on public.tutor_conversations to authenticated;
grant select, insert, delete on public.tutor_messages to authenticated;
grant select on public.tutor_ai_usage to authenticated;
