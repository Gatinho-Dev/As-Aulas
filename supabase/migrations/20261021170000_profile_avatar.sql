-- Foto de perfil: caminho do arquivo no bucket "avatars".
-- O bucket é público para leitura (URLs não listáveis) e só o dono escreve na própria pasta.

alter table public.profiles
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars leitura" on storage.objects;
create policy "avatars leitura" on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars envio pelo dono" on storage.objects;
create policy "avatars envio pelo dono" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars atualizacao pelo dono" on storage.objects;
create policy "avatars atualizacao pelo dono" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars remocao pelo dono" on storage.objects;
create policy "avatars remocao pelo dono" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
