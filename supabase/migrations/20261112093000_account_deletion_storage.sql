-- 계정 탈퇴 4: 유예 중인 계정은 프로필 이미지 저장소에도 쓰지 못한다.
-- 테이블 쓰기 차단(20261112092000)과 같은 이유다. 신청 뒤에도 남은 접근 토큰이나 복구 화면의 세션으로
-- Storage에 직접 올리거나 덮어쓰거나 지우면, 유예 중 기록이 얼어붙지 않고 삭제 작업의 파일 수집과도 겹친다.
-- 기존 profiles_storage_*_guard(경로 소유 확인)와 AND로 묶이는 restrictive 정책을 더한다.
-- 삭제 작업은 서비스 롤이라 RLS를 우회하므로 그대로 파일을 지운다. 탈퇴를 취소하면 바로 다시 쓸 수 있다.
-- is_account_active는 anon에게 열려 있지 않으므로 authenticated에만 건다(로그인하지 않은 쓰기는 기존 정책이 이미 막는다).

create policy profiles_storage_insert_requires_active on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'profiles' or public.is_account_active((select auth.uid())));

create policy profiles_storage_update_requires_active on storage.objects
  as restrictive for update to authenticated
  -- 테이블 정책과 같이 with check만 두어 조용한 0행이 아니라 42501로 거부한다
  with check (bucket_id <> 'profiles' or public.is_account_active((select auth.uid())));

create policy profiles_storage_delete_requires_active on storage.objects
  as restrictive for delete to authenticated
  using (bucket_id <> 'profiles' or public.is_account_active((select auth.uid())));
