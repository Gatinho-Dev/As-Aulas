-- Configurações do perfil: nick (username), nome de exibição, prazos de alteração e
-- conclusão do perfil obrigatório. Alterações passam pelas funções abaixo, nunca por
-- UPDATE direto no frontend.

-- 1) Nick: aceita ponto além de letras, números e sublinhado (3 a 20 caracteres).
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles
  add constraint profiles_username_check
  check (username is null or username ~ '^[A-Za-z0-9_.]{3,20}$');

-- 2) Datas de controle no servidor.
alter table public.profiles
  add column if not exists profile_completed_at timestamptz,
  add column if not exists nickname_changed_at timestamptz,
  add column if not exists display_name_changed_at timestamptz;

-- Contas que já têm nick e nome são consideradas com perfil concluído.
update public.profiles
   set profile_completed_at = coalesce(profile_completed_at, now())
 where username is not null;

-- 3) Nicks reservados ou ofensivos, administráveis por administradores.
create table if not exists public.nicks_reservados (
  termo text primary key check (termo = lower(termo) and char_length(termo) between 1 and 20)
);

insert into public.nicks_reservados (termo) values
  ('admin'), ('administrador'), ('root'), ('suporte'), ('sistema'), ('system'),
  ('moderador'), ('oficial'), ('staff'), ('asaulas'), ('as_aulas'), ('null'), ('undefined')
on conflict do nothing;

alter table public.nicks_reservados enable row level security;
drop policy if exists nicks_reservados_admin_all on public.nicks_reservados;
create policy nicks_reservados_admin_all on public.nicks_reservados for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 4) Login por nick sem depender do nick atual: o nick apenas aponta para o e-mail
-- interno já cadastrado no Auth. Trocar o nick não quebra o login.
create or replace function public.email_de_login_por_nick(p_nick text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(btrim(p_nick))
    -- Só o e-mail interno das contas por nick. Nunca devolve o e-mail real (ex.: Google).
    and u.email like '%@alunos.as-aulas.local'
  limit 1;
$$;

revoke all on function public.email_de_login_por_nick(text) from public;
grant execute on function public.email_de_login_por_nick(text) to anon, authenticated;

-- 5) Nick e nome só mudam pelas funções abaixo. O gatilho bloqueia UPDATE direto de
-- alunos (a política profiles_update_self permitiria). Administradores ficam livres.
create or replace function public.proteger_nick_e_nome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.username is distinct from old.username or new.display_name is distinct from old.display_name)
     and not public.is_admin()
     and coalesce(current_setting('app.perfil_via_funcao', true), '') <> 'on' then
    raise exception 'Use a área de configurações para alterar nick ou nome.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_proteger_nick_nome on public.profiles;
create trigger profiles_proteger_nick_nome
  before update on public.profiles
  for each row execute function public.proteger_nick_e_nome();

-- 6) Colunas de controle: conclusão do perfil, preferências de privacidade, tema e notificações.
alter table public.profiles
  add column if not exists perfil_visivel_colegas boolean not null default true,
  add column if not exists tema text not null default 'sistema' check (tema in ('claro', 'escuro', 'sistema')),
  add column if not exists notif_avisos boolean not null default true,
  add column if not exists notif_atividades boolean not null default true,
  add column if not exists notif_eventos boolean not null default true;

-- 7) Onboarding obrigatório: primeira escolha de nick e nome. Não conta como alteração.
create or replace function public.concluir_perfil(p_nick text, p_nome text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_nick text := btrim(coalesce(p_nick, ''));
  v_nome text := btrim(coalesce(p_nome, ''));
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  if v_nick !~ '^[A-Za-z0-9_.]{3,20}$' then
    raise exception 'NICK_INVALIDO';
  end if;
  if char_length(v_nome) not between 2 and 40 then
    raise exception 'NOME_INVALIDO';
  end if;
  if exists (select 1 from public.nicks_reservados r where r.termo = lower(v_nick)) then
    raise exception 'NICK_RESERVADO';
  end if;

  perform set_config('app.perfil_via_funcao', 'on', true);
  begin
    update public.profiles
       set username = v_nick,
           display_name = v_nome,
           profile_completed_at = now()
     where id = v_uid and profile_completed_at is null;
  exception when unique_violation then
    raise exception 'NICK_EM_USO';
  end;

  if not found then
    raise exception 'PERFIL_JA_CONCLUIDO';
  end if;
  return jsonb_build_object('username', v_nick, 'display_name', v_nome);
end;
$$;

revoke all on function public.concluir_perfil(text, text) from public;
grant execute on function public.concluir_perfil(text, text) to authenticated;

-- 8) Troca de nick: 30 dias após cada alteração concluída. Prazo calculado no servidor.
-- Erro PRAZO_NICK traz, em details, a data ISO em que a troca volta a ser permitida.
create or replace function public.alterar_nick(p_nick text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_nick text := btrim(coalesce(p_nick, ''));
  v_perfil public.profiles%rowtype;
  v_liberacao timestamptz;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;

  select * into v_perfil from public.profiles where id = v_uid for update;
  if not found or v_perfil.profile_completed_at is null then
    raise exception 'PERFIL_INCOMPLETO';
  end if;
  if v_nick !~ '^[A-Za-z0-9_.]{3,20}$' then
    raise exception 'NICK_INVALIDO';
  end if;
  if v_nick = v_perfil.username then
    return jsonb_build_object('username', v_perfil.username, 'alterado', false);
  end if;

  if v_perfil.nickname_changed_at is not null then
    v_liberacao := v_perfil.nickname_changed_at + interval '30 days';
    if now() < v_liberacao then
      raise exception 'PRAZO_NICK' using detail = to_char(v_liberacao at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    end if;
  end if;

  if exists (select 1 from public.nicks_reservados r where r.termo = lower(v_nick)) then
    raise exception 'NICK_RESERVADO';
  end if;

  perform set_config('app.perfil_via_funcao', 'on', true);
  begin
    update public.profiles
       set username = v_nick,
           nickname_changed_at = now()
     where id = v_uid;
  exception when unique_violation then
    raise exception 'NICK_EM_USO';
  end;

  return jsonb_build_object('username', v_nick, 'alterado', true);
end;
$$;

revoke all on function public.alterar_nick(text) from public;
grant execute on function public.alterar_nick(text) to authenticated;

-- 9) Troca do nome de exibição: 14 dias após cada alteração concluída, independente do nick.
create or replace function public.alterar_nome_exibicao(p_nome text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text := btrim(coalesce(p_nome, ''));
  v_perfil public.profiles%rowtype;
  v_liberacao timestamptz;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;

  select * into v_perfil from public.profiles where id = v_uid for update;
  if not found or v_perfil.profile_completed_at is null then
    raise exception 'PERFIL_INCOMPLETO';
  end if;
  if char_length(v_nome) not between 2 and 40 then
    raise exception 'NOME_INVALIDO';
  end if;
  if v_nome = v_perfil.display_name then
    return jsonb_build_object('display_name', v_perfil.display_name, 'alterado', false);
  end if;

  if v_perfil.display_name_changed_at is not null then
    v_liberacao := v_perfil.display_name_changed_at + interval '14 days';
    if now() < v_liberacao then
      raise exception 'PRAZO_NOME' using detail = to_char(v_liberacao at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    end if;
  end if;

  perform set_config('app.perfil_via_funcao', 'on', true);
  update public.profiles
     set display_name = v_nome,
         display_name_changed_at = now()
   where id = v_uid;

  return jsonb_build_object('display_name', v_nome, 'alterado', true);
end;
$$;

revoke all on function public.alterar_nome_exibicao(text) from public;
grant execute on function public.alterar_nome_exibicao(text) to authenticated;

-- 10) Privacidade: com "perfil_visivel_colegas" desligado, colegas deixam de ver foto e bio.
-- O nome continua visível, pois aparece em listas, turmas e atividades. A regra fica nas
-- funções (listar_colegas e perfil_colega), que é por onde a interface lê os colegas.
-- O tipo de retorno muda (inclui avatar_path), então a função é removida e recriada.
drop function if exists public.listar_colegas(uuid);

create function public.listar_colegas(p_class_id uuid)
returns table (
  id uuid,
  display_name text,
  bio text,
  accent_color text,
  font_style text,
  avatar_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    case when p.perfil_visivel_colegas then p.bio end,
    p.accent_color,
    p.font_style,
    case when p.perfil_visivel_colegas then p.avatar_path end
  from public.class_memberships m
  join public.profiles p on p.id = m.user_id
  where m.class_id = p_class_id
    and m.membership_status = 'ativo'
    and p.active
    and p.id <> auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1
        from public.class_memberships mine
        where mine.user_id = auth.uid()
          and mine.class_id = p_class_id
          and mine.membership_status = 'ativo'
      )
    )
  order by p.display_name;
$$;

revoke all on function public.listar_colegas(uuid) from public, anon;
grant execute on function public.listar_colegas(uuid) to authenticated;

-- Perfil de um colega, com a mesma regra de visibilidade da lista.
create or replace function public.perfil_colega(p_user uuid)
returns table (
  display_name text,
  username text,
  role text,
  bio text,
  accent_color text,
  font_style text,
  avatar_path text,
  perfil_oculto boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.display_name,
    p.username,
    p.role::text,
    case when p.perfil_visivel_colegas or p.id = auth.uid() then p.bio end,
    p.accent_color,
    p.font_style,
    case when p.perfil_visivel_colegas or p.id = auth.uid() then p.avatar_path end,
    not p.perfil_visivel_colegas and p.id <> auth.uid()
  from public.profiles p
  where p.id = p_user
    and p.active
    and (
      p.id = auth.uid()
      or public.is_admin()
      or public.shares_active_class_with(p.id)
    );
$$;

revoke all on function public.perfil_colega(uuid) from public, anon;
grant execute on function public.perfil_colega(uuid) to authenticated;

-- 11) Cadastro: quando o formulário já traz nick e nome, o perfil nasce concluído.
-- Contas Google (sem nick no cadastro) passam pelo onboarding.
-- O e-mail interno é gerado aleatoriamente pelo app, não pelo nick, para que trocar o nick não quebre o login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
  v_class_id uuid;
begin
  insert into public.profiles (id, display_name, username, profile_completed_at)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Aluno'), 80),
    v_username,
    case when v_username is not null then now() end
  );

  -- Vincula à turma escolhida no cadastro, se ela existir e estiver ativa
  begin
    v_class_id := (new.raw_user_meta_data ->> 'class_id')::uuid;
  exception when others then
    v_class_id := null;
  end;

  if v_class_id is not null then
    insert into public.class_memberships (user_id, class_id, membership_status)
    select new.id, c.id, 'ativo'
    from public.classes c
    where c.id = v_class_id and c.active
    on conflict (user_id, class_id) do nothing;
  end if;

  return new;
end;
$$;
