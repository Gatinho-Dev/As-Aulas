-- Geração automática de notificações internas.
-- Cada gatilho usa dedupe_key para não duplicar a mesma notificação.

-- Avisos: ao publicar, notifica a turma (ou toda a escola, se for global).
create or replace function public.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'publicado' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'publicado' and old.is_global = new.is_global then
    return new;
  end if;

  if new.is_global then
    insert into public.notifications (kind, title, message, link_path, announcement_id, dedupe_key)
    values (
      'novo_aviso',
      left(new.title, 150),
      left(new.body, 500),
      '/avisos',
      new.id,
      'aviso:' || new.id || ':geral'
    )
    on conflict (dedupe_key) do nothing;
  else
    insert into public.notifications (kind, title, message, link_path, class_id, announcement_id, dedupe_key)
    select
      'novo_aviso',
      left(new.title, 150),
      left(new.body, 500),
      '/avisos',
      t.class_id,
      new.id,
      'aviso:' || new.id || ':' || t.class_id
    from public.announcement_targets t
    where t.announcement_id = new.id
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify
  after insert or update of status, is_global on public.announcements
  for each row execute function public.notify_announcement_published();

-- Destinatários adicionados depois da publicação também recebem o aviso.
create or replace function public.notify_announcement_target_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.announcements%rowtype;
begin
  select * into a from public.announcements where id = new.announcement_id;
  if found and a.status = 'publicado' and not a.is_global then
    insert into public.notifications (kind, title, message, link_path, class_id, announcement_id, dedupe_key)
    values (
      'novo_aviso',
      left(a.title, 150),
      left(a.body, 500),
      '/avisos',
      new.class_id,
      a.id,
      'aviso:' || a.id || ':' || new.class_id
    )
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists announcement_targets_notify on public.announcement_targets;
create trigger announcement_targets_notify
  after insert on public.announcement_targets
  for each row execute function public.notify_announcement_target_added();

-- Atividades: ao publicar, notifica a turma; ao mudar prazo ou título de uma publicada, avisa a alteração.
create or replace function public.notify_assignment_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  destino text;
begin
  if new.status <> 'publicada' then
    return new;
  end if;

  destino := case new.type
    when 'licao_casa' then '/licoes/'
    when 'trabalho' then '/trabalhos/'
    else '/provas/'
  end || new.id::text;

  if tg_op = 'INSERT' or old.status is distinct from 'publicada' then
    insert into public.notifications (kind, title, message, link_path, class_id, assignment_id, dedupe_key)
    values (
      'nova_atividade',
      left(new.title, 150),
      'Nova atividade publicada. Entrega até ' || to_char(new.due_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '.',
      destino,
      new.class_id,
      new.id,
      'atividade:' || new.id || ':publicada'
    )
    on conflict (dedupe_key) do nothing;
  elsif new.due_at is distinct from old.due_at or new.title is distinct from old.title then
    insert into public.notifications (kind, title, message, link_path, class_id, assignment_id, dedupe_key)
    values (
      'atividade_alterada',
      left(new.title, 150),
      'Prazo ou título da atividade foi alterado. Confira os detalhes.',
      destino,
      new.class_id,
      new.id,
      'atividade:' || new.id || ':alterada:' || gen_random_uuid()::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists assignments_notify on public.assignments;
create trigger assignments_notify
  after insert or update of status, due_at, title on public.assignments
  for each row execute function public.notify_assignment_changes();

-- Eventos: ao criar um evento, notifica a turma (ou toda a escola, se não houver turma).
create or replace function public.notify_event_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (kind, title, message, link_path, class_id, event_id, dedupe_key)
  values (
    'evento_importante',
    left(new.title, 150),
    coalesce(left(new.description, 500), 'Novo evento no calendário.'),
    '/calendario',
    new.class_id,
    new.id,
    'evento:' || new.id
  )
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

drop trigger if exists events_notify on public.events;
create trigger events_notify
  after insert on public.events
  for each row execute function public.notify_event_created();
