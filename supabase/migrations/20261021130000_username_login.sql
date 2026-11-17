-- Login por nick: o aluno entra com nick + senha. O e-mail interno é derivado do nick.
alter table public.profiles
  add column if not exists username text
    check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

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
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Aluno'), 80),
    v_username
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
