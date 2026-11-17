-- Personalização do perfil: bio, cor de destaque e fonte. Visível para colegas que compartilham uma turma ativa.

alter table public.profiles
  add column if not exists bio text check (bio is null or char_length(bio) <= 280),
  add column if not exists accent_color text not null default 'indigo'
    check (accent_color in ('indigo', 'emerald', 'amber', 'rose', 'violet', 'slate')),
  add column if not exists font_style text not null default 'padrao'
    check (font_style in ('padrao', 'serifada', 'monoespaco'));

-- Verdadeiro quando o usuário logado e p_user têm pelo menos uma turma ativa em comum.
create or replace function public.shares_active_class_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_memberships mine
    join public.class_memberships theirs on theirs.class_id = mine.class_id
    where mine.user_id = auth.uid()
      and mine.membership_status = 'ativo'
      and theirs.user_id = p_user
      and theirs.membership_status = 'ativo'
  );
$$;

create policy profiles_select_classmates on public.profiles for select to authenticated
  using (public.shares_active_class_with(id));
