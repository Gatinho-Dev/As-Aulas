-- A lista de colegas passa a devolver o caminho da foto de perfil (bucket avatars).
-- O tipo de retorno muda, então a função é recriada.

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
  select p.id, p.display_name, p.bio, p.accent_color, p.font_style, p.avatar_path
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
