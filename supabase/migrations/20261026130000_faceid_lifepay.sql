-- Face ID do LifePay: cadastros passam a guardar { v, s } (assinatura HOG de 576 números).
-- Cadastros do formato antigo (128 números do face-api) não são compatíveis e são apagados;
-- os alunos precisam refazer o escaneamento.
delete from public.rostos_alunos;

alter table public.rostos_alunos drop constraint if exists rostos_alunos_descritor_check;
alter table public.rostos_alunos
  add constraint rostos_alunos_descritor_check
  check (jsonb_typeof(descritor) = 'object' and (descritor->>'v') = '4');
