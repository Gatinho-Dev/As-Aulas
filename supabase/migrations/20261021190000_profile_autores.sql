-- Autores de avisos e atividades publicados passam a ter o perfil legível para
-- quem pode ver o conteúdo. Sem isso, a foto e o nome do autor apareceriam vazios
-- quando ele não compartilha turma com o aluno (caso dos administradores).

drop policy if exists profiles_select_autores on public.profiles;
create policy profiles_select_autores on public.profiles for select to authenticated
  using (
    exists (
      select 1
      from public.announcements a
      where a.author_id = profiles.id
        and a.status = 'publicado'
    )
    or exists (
      select 1
      from public.assignments s
      where s.created_by = profiles.id
        and s.status = 'publicada'
    )
  );
