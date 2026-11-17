-- Tutorial de demonstração: contas marcadas aqui veem o passo a passo em todo acesso,
-- mesmo depois de concluir. Serve para a conta de testes mostrar a interface sempre.
-- O restante dos alunos continua vendo o tutorial apenas no primeiro acesso.

alter table public.profiles
  add column if not exists tutorial_sempre_visivel boolean not null default false;

-- Conta de demonstração (nick "teste").
update public.profiles
   set tutorial_sempre_visivel = true
 where username = 'teste';
