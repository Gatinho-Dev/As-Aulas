-- Tutorial de primeiro acesso: data em que o aluno concluiu o passo a passo.
-- Nulo significa que o tutorial ainda não foi concluído. Só o próprio aluno
-- altera este campo (a política profiles_update_self já restringe a própria linha).

alter table public.profiles
  add column if not exists tutorial_concluido_em timestamptz;
