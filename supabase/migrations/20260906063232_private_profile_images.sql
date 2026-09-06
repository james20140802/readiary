-- Deploy the authenticated /api/profile-image route before applying this migration.
-- Public URLs (including previously copied URLs) stop working when the bucket becomes private.
begin;

update storage.buckets set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
where id = 'profiles';

-- Reclaim the profiles-only policies verified in pg_policies on 2026-09-06.
drop policy if exists "INSERT 1ige2ga_0" on storage.objects;
drop policy if exists "SELECT POLICY 1ige2ga_0" on storage.objects;
drop policy if exists "UPDATE 1ige2ga_0" on storage.objects;
drop policy if exists "UPDATE 1ige2ga_1" on storage.objects;
drop policy if exists "UPDATE 1ige2ga_2" on storage.objects;
drop policy if exists "누구나 프로필 사진 조회 가능" on storage.objects;
drop policy if exists "본인만 프로필 사진 업로드 가능" on storage.objects;

-- Restrictive guards also contain any independently added permissive policy.
-- Other buckets keep their existing access rules.
create policy profiles_storage_read_guard on storage.objects as restrictive
for select to public using (
  bucket_id <> 'profiles' or (
    (select auth.uid()) is not null and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.profiles p where p.profile_image = storage.objects.name)
    )
  )
);
create policy profiles_storage_insert_guard on storage.objects as restrictive
for insert to public with check (
  bucket_id <> 'profiles' or (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy profiles_storage_update_guard on storage.objects as restrictive
for update to public using (
  bucket_id <> 'profiles' or (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id <> 'profiles' or (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy profiles_storage_delete_guard on storage.objects as restrictive
for delete to public using (
  bucket_id <> 'profiles' or (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profiles_storage_read on storage.objects for select to authenticated
using (bucket_id = 'profiles');
create policy profiles_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'profiles');
create policy profiles_storage_update on storage.objects for update to authenticated
using (bucket_id = 'profiles') with check (bucket_id = 'profiles');
create policy profiles_storage_delete on storage.objects for delete to authenticated
using (bucket_id = 'profiles');

-- Do not let a member attach someone else's image or an external tracking URL to their profile.
alter table public.profiles add constraint profiles_avatar_owned_path check (
  profile_image is null or (
    split_part(profile_image, '/', 1) = id::text
    and profile_image ~ '^[0-9a-fA-F-]{36}/[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$'
  )
);

commit;
