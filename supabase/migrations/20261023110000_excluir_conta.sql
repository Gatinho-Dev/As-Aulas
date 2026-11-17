-- Exclusão da própria conta. Remove o usuário de auth.users; as tabelas com dados do aluno
-- apagam em cascata a partir de profiles. A foto de perfil (Storage) é removida pelo app antes
-- de chamar esta função, pois o Storage não pode ser limpo por SQL.
create or replace function public.excluir_minha_conta(p_confirmacao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  if btrim(coalesce(p_confirmacao, '')) <> 'EXCLUIR' then
    raise exception 'CONFIRMACAO_INVALIDA';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.excluir_minha_conta(text) from public;
grant execute on function public.excluir_minha_conta(text) to authenticated;
