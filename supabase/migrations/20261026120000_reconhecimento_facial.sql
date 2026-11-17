-- Reconhecimento facial: guarda o descritor (128 números) do rosto do próprio aluno.
-- O navegador nunca lê esta tabela; a comparação acontece na Edge Function "reconhecimento-facial".
create table if not exists public.rostos_alunos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  descritor jsonb not null
    check (jsonb_typeof(descritor) = 'array' and jsonb_array_length(descritor) = 128),
  consentido_em timestamptz not null,
  cadastrado_em timestamptz not null default now()
);

alter table public.rostos_alunos enable row level security;
revoke all on public.rostos_alunos from anon, authenticated;
